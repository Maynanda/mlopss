"""
Training Service — orchestrates the full ML training pipeline as a background task.
"""
import json
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import mlflow
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal
from ml.preprocessor import DataPreprocessor
from ml.registry import get_algorithm
from ml.metrics.regression_metrics import compute_regression_metrics
from ml.metrics.classification_metrics import compute_classification_metrics
from ml.metrics.anomaly_metrics import compute_anomaly_metrics
from models.dataset import Dataset
from models.experiment import Experiment
from models.ml_model import MLModel
from models.training_job import TrainingJob
from services.dataset_service import dataset_service


def _update_job(db: Session, job_id: int, **kwargs):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if job:
        for k, v in kwargs.items():
            setattr(job, k, v)
        db.commit()


def run_training_job(job_id: int, experiment_id: int):
    """
    Runs as a FastAPI BackgroundTask.
    Opens its own DB session (background tasks run outside request lifecycle).
    """
    db: Session = SessionLocal()
    try:
        _execute(db, job_id, experiment_id)
    except Exception:
        _update_job(
            db, job_id,
            status="failed",
            error_message=traceback.format_exc(),
            finished_at=datetime.now(timezone.utc),
        )
        exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if exp:
            exp.status = "failed"
            db.commit()
    finally:
        db.close()


def _execute(db: Session, job_id: int, experiment_id: int):
    utc = datetime.now(timezone.utc)
    _update_job(db, job_id, status="running", started_at=utc, progress=5.0)

    exp: Experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    exp.status = "training"
    db.commit()

    # ── Load dataset ────────────────────────────────────────────
    ds: Dataset = db.query(Dataset).filter(Dataset.id == exp.dataset_id).first()
    df: pd.DataFrame = dataset_service.load_dataframe(ds)
    _update_job(db, job_id, progress=15.0)

    feature_cols = exp.feature_columns if exp.feature_columns else [
        c for c in df.columns if c != exp.target_column
    ]
    hyperparams = exp.hyperparams if exp.hyperparams else {}
    pipeline_config = exp.pipeline_config if exp.pipeline_config else {}

    # ── Preprocess ──────────────────────────────────────────────
    preprocessor = DataPreprocessor(pipeline_config=pipeline_config)
    X, y = preprocessor.fit_transform(
        df, feature_cols, exp.target_column,
        scale=(exp.task_type != "clustering")
    )
    _update_job(db, job_id, progress=30.0)

    # ── Build & train model ─────────────────────────────────────
    AlgoClass = get_algorithm(exp.task_type, exp.algorithm)
    algo = AlgoClass(hyperparams)
    algo.fit(X, y)
    _update_job(db, job_id, progress=70.0)

    # ── Evaluate ────────────────────────────────────────────────
    y_pred = algo.predict(X)
    y_proba = algo.predict_proba(X)
    scores = algo.decision_scores(X)
    metrics = _compute_metrics(exp.task_type, y, y_pred, y_proba, scores, preprocessor)
    
    fi = algo.get_feature_importance()
    if fi is not None and len(fi) == len(feature_cols):
        fi_dict = {col: float(val) for col, val in zip(feature_cols, fi)}
        total_imp = sum(fi_dict.values())
        if total_imp > 0:
            fi_dict = {k: round((v / total_imp) * 100, 2) for k, v in fi_dict.items()}
            metrics["feature_importances"] = dict(sorted(fi_dict.items(), key=lambda item: item[1], reverse=True))

    _update_job(db, job_id, progress=85.0)

    # ── Persist model & preprocessor ───────────────────────────
    model_dir = settings.ARTIFACTS_DIR / f"exp_{experiment_id}_job_{job_id}"
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "model.pkl"
    prep_path = model_dir / "preprocessor.pkl"
    joblib.dump(algo, model_path)
    joblib.dump(preprocessor, prep_path)

    # ── MLflow logging ──────────────────────────────────────────
    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    mlflow_exp = mlflow.set_experiment(exp.name)
    run_id: Optional[str] = None
    try:
        with mlflow.start_run(experiment_id=mlflow_exp.experiment_id) as run:
            mlflow.log_params(hyperparams)
            mlflow.log_metrics({k: v for k, v in metrics.items() if isinstance(v, (int, float))})
            mlflow.log_artifact(str(model_path))
            run_id = run.info.run_id
    except Exception:
        # MLflow is optional — don't fail training if server is down
        pass

    if not exp.mlflow_experiment_id and mlflow_exp:
        exp.mlflow_experiment_id = mlflow_exp.experiment_id
        db.commit()

    # ── Save MLModel record ─────────────────────────────────────
    version = db.query(MLModel).filter(MLModel.experiment_id == experiment_id).count() + 1
    ml_model = MLModel(
        name=f"{exp.name} v{version}",
        experiment_id=experiment_id,
        training_job_id=job_id,
        algorithm=exp.algorithm,
        task_type=exp.task_type,
        stage="NONE",
        metrics=json.dumps(metrics),
        feature_columns=json.dumps(feature_cols),
        target_column=exp.target_column,
        artifact_path=str(model_path),
        preprocessor_path=str(prep_path),
        mlflow_run_id=run_id,
        version=version,
    )
    db.add(ml_model)

    exp.status = "completed"
    _update_job(db, job_id, status="completed", progress=100.0, finished_at=datetime.now(timezone.utc))
    db.commit()


def _compute_metrics(task_type, y_true, y_pred, y_proba, scores, preprocessor):
    if task_type == "regression":
        return compute_regression_metrics(y_true, y_pred)
    elif task_type == "classification":
        labels = preprocessor.get_label_classes()
        return compute_classification_metrics(y_true, y_pred, y_proba, labels)
    elif task_type == "anomaly_detection":
        return compute_anomaly_metrics(y_true, y_pred, scores)
    elif task_type == "clustering":
        # For clustering: inertia and silhouette where applicable
        try:
            from sklearn.metrics import silhouette_score
            sil = float(silhouette_score(y_pred.reshape(-1, 1), y_pred)) if len(np.unique(y_pred)) > 1 else 0.0
        except Exception:
            sil = 0.0
        return {"n_clusters": int(len(np.unique(y_pred))), "silhouette_score": round(sil, 6)}
    return {}

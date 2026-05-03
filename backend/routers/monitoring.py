import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict

from database import get_db
from models.ml_model import MLModel
from models.training_job import TrainingJob
from models.experiment import Experiment
from models.dataset import Dataset
from models.inference_log import InferenceLog

router = APIRouter(prefix="/api/monitoring", tags=["Monitoring"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    return {
        "status": "ok",
        "counts": {
            "datasets": db.query(Dataset).count(),
            "experiments": db.query(Experiment).count(),
            "models": db.query(MLModel).count(),
            "training_jobs": db.query(TrainingJob).count(),
        },
        "active_jobs": db.query(TrainingJob).filter(TrainingJob.status == "running").count(),
        "production_models": db.query(MLModel).filter(MLModel.stage == "PRODUCTION").count(),
    }


@router.get("/models/{model_id}/metrics")
def model_metrics(model_id: int, db: Session = Depends(get_db)):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        return {"error": "Model not found"}
    metrics = json.loads(model.metrics) if model.metrics else {}
    return {
        "model_id": model_id,
        "model_name": model.name,
        "algorithm": model.algorithm,
        "task_type": model.task_type,
        "stage": model.stage,
        "metrics": metrics,
    }


@router.get("/jobs/summary")
def jobs_summary(db: Session = Depends(get_db)):
    jobs = db.query(TrainingJob).order_by(TrainingJob.created_at.desc()).limit(20).all()
    return [
        {
            "id": j.id,
            "experiment_id": j.experiment_id,
            "status": j.status,
            "progress": j.progress,
            "started_at": j.started_at,
            "finished_at": j.finished_at,
        }
        for j in jobs
    ]

@router.get("/models/{model_id}/drift")
def model_drift(model_id: int, db: Session = Depends(get_db)):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")
        
    logs = db.query(InferenceLog).filter(InferenceLog.model_id == model_id).order_by(InferenceLog.timestamp.desc()).limit(100).all()
    
    if not logs:
        return {"feature_averages": {}, "predictions": [], "count": 0}
        
    feature_sums = defaultdict(float)
    count = len(logs)
    predictions = []
    
    for log in logs:
        # Calculate feature averages for drift detection
        for k, v in log.input_data.items():
            if isinstance(v, (int, float)):
                feature_sums[k] += float(v)
                
        # Collect recent predictions
        pred_val = log.prediction
        # If it's a regression model, it's a number. If classification, string.
        predictions.append({
            "time": log.timestamp.strftime("%H:%M:%S"),
            "prediction": pred_val if isinstance(pred_val, (int, float)) else 1 # default to 1 for rendering if categorical
        })
        
    feature_avgs = {k: round(v / count, 4) for k, v in feature_sums.items()}
    predictions.reverse() # chronological order
    
    return {
        "count": count,
        "feature_averages": feature_avgs,
        "predictions": predictions
    }

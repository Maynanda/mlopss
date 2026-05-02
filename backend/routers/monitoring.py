import json
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.ml_model import MLModel
from models.training_job import TrainingJob
from models.experiment import Experiment
from models.dataset import Dataset

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

import json
from typing import List

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.experiment import Experiment
from models.training_job import TrainingJob
from schemas.experiment import ExperimentCreate, ExperimentResponse
from schemas.training_job import TrainingJobResponse, TrainRequest
from services.training_service import run_training_job
from services.dataset_service import dataset_service
from ml.registry import list_algorithms

router = APIRouter(prefix="/api/experiments", tags=["Experiments"])


@router.get("/algorithms")
def get_algorithms():
    return list_algorithms()


@router.post("/", response_model=ExperimentResponse, status_code=201)
def create_experiment(payload: ExperimentCreate, db: Session = Depends(get_db)):
    # Validate dataset exists
    dataset_service.get_or_404(db, payload.dataset_id)

    exp = Experiment(
        name=payload.name,
        description=payload.description,
        dataset_id=payload.dataset_id,
        algorithm=payload.algorithm,
        task_type=payload.task_type,
        target_column=payload.target_column,
        feature_columns=json.dumps(payload.feature_columns) if payload.feature_columns else None,
        hyperparams=json.dumps(payload.hyperparams or {}),
        status="created",
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return _serialize(exp)


@router.get("/", response_model=List[ExperimentResponse])
def list_experiments(db: Session = Depends(get_db)):
    exps = db.query(Experiment).order_by(Experiment.created_at.desc()).all()
    return [_serialize(e) for e in exps]


@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    exp = _get_or_404(db, experiment_id)
    return _serialize(exp)


@router.post("/{experiment_id}/train", response_model=TrainingJobResponse, status_code=202)
def start_training(
    experiment_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    exp = _get_or_404(db, experiment_id)
    if exp.status == "training":
        raise HTTPException(409, "Experiment is already training.")

    job = TrainingJob(experiment_id=experiment_id, status="pending", progress=0.0)
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_training_job, job.id, experiment_id)
    return job


@router.delete("/{experiment_id}", status_code=204)
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    exp = _get_or_404(db, experiment_id)
    db.delete(exp)
    db.commit()


def _get_or_404(db: Session, eid: int) -> Experiment:
    exp = db.query(Experiment).filter(Experiment.id == eid).first()
    if not exp:
        raise HTTPException(404, f"Experiment {eid} not found.")
    return exp


def _serialize(exp: Experiment) -> dict:
    d = {c.name: getattr(exp, c.name) for c in exp.__table__.columns}
    d["feature_columns"] = json.loads(d["feature_columns"]) if d["feature_columns"] else None
    d["hyperparams"] = json.loads(d["hyperparams"]) if d["hyperparams"] else {}
    return d

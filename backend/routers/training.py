from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.training_job import TrainingJob
from schemas.training_job import TrainingJobResponse

router = APIRouter(prefix="/api/training", tags=["Training"])


@router.get("/jobs", response_model=List[TrainingJobResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(TrainingJob).order_by(TrainingJob.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=TrainingJobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    return job


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: int, db: Session = Depends(get_db)):
    """
    Marks job as cancelled. Note: FastAPI BackgroundTasks cannot be interrupted
    once started; this flag is informational.
    Future: use Celery + revoke() for true cancellation.
    """
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    if job.status in ("completed", "failed"):
        raise HTTPException(409, f"Job already {job.status}.")
    job.status = "cancelled"
    db.commit()
    return {"message": f"Job {job_id} marked as cancelled."}

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TrainingJobResponse(BaseModel):
    id: int
    experiment_id: int
    status: str
    progress: float
    error_message: Optional[str]
    log_output: Optional[str]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class TrainRequest(BaseModel):
    experiment_id: int

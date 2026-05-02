from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class MLModelResponse(BaseModel):
    id: int
    name: str
    experiment_id: int
    training_job_id: int
    algorithm: str
    task_type: str
    stage: str
    metrics: Optional[Dict[str, Any]]
    feature_columns: Optional[List[str]]
    target_column: Optional[str]
    mlflow_run_id: Optional[str]
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


class ModelStageUpdate(BaseModel):
    stage: str  # NONE | STAGING | PRODUCTION | ARCHIVED


class PredictRequest(BaseModel):
    data: List[Dict[str, Any]]


class PredictResponse(BaseModel):
    model_id: int
    predictions: List[Any]
    prediction_labels: Optional[List[str]] = None
    probabilities: Optional[List[List[float]]] = None

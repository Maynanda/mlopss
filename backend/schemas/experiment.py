from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class ExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    dataset_id: int
    algorithm: str
    task_type: str                             # regression | classification | anomaly_detection | clustering
    target_column: Optional[str] = None
    feature_columns: Optional[List[str]] = None  # None = all cols except target
    hyperparams: Optional[Dict[str, Any]] = {}
    pipeline_config: Optional[Dict[str, Any]] = None


class ExperimentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    dataset_id: int
    algorithm: str
    task_type: str
    target_column: Optional[str]
    feature_columns: Optional[List[str]]
    hyperparams: Optional[Dict[str, Any]]
    pipeline_config: Optional[Dict[str, Any]]
    mlflow_experiment_id: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    training_job_id = Column(Integer, ForeignKey("training_jobs.id"), nullable=False)
    algorithm = Column(String, nullable=False)
    task_type = Column(String, nullable=False)
    stage = Column(String, default="NONE")        # NONE | STAGING | PRODUCTION | ARCHIVED
    metrics = Column(Text)                        # JSON dict
    feature_columns = Column(Text)               # JSON list
    target_column = Column(String, nullable=True)
    artifact_path = Column(String, nullable=False)  # absolute path to .pkl
    preprocessor_path = Column(String, nullable=True)
    mlflow_run_id = Column(String, nullable=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="models")
    training_job = relationship("TrainingJob", back_populates="model")

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    algorithm = Column(String, nullable=False)
    task_type = Column(String, nullable=False)   # regression | classification | anomaly_detection | clustering
    target_column = Column(String, nullable=True)
    feature_columns = Column(Text)               # JSON list
    hyperparams = Column(Text)                   # JSON dict
    mlflow_experiment_id = Column(String, nullable=True)
    status = Column(String, default="created")   # created | training | completed | failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    training_jobs = relationship("TrainingJob", back_populates="experiment", cascade="all, delete")
    models = relationship("MLModel", back_populates="experiment", cascade="all, delete")

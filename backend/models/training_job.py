from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    status = Column(String, default="pending")   # pending | running | completed | failed | cancelled
    progress = Column(Float, default=0.0)        # 0-100
    error_message = Column(Text, nullable=True)
    log_output = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="training_jobs")
    model = relationship("MLModel", back_populates="training_job", uselist=False)

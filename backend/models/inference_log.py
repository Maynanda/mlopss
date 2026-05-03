from sqlalchemy import Column, Integer, DateTime, ForeignKey, JSON
from datetime import datetime
from database import Base

class InferenceLog(Base):
    __tablename__ = "inference_logs"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ml_models.id"), nullable=False)
    input_data = Column(JSON, nullable=False)
    prediction = Column(JSON, nullable=False)
    actual_label = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.ml_model import PredictRequest, PredictResponse
from services.inference_service import inference_service

router = APIRouter(prefix="/api/inference", tags=["Inference"])


@router.post("/{model_id}/predict", response_model=PredictResponse)
def predict(model_id: int, payload: PredictRequest, db: Session = Depends(get_db)):
    return inference_service.predict(db, model_id, payload.data)


@router.post("/{model_id}/predict/batch", response_model=PredictResponse)
def predict_batch(model_id: int, payload: PredictRequest, db: Session = Depends(get_db)):
    """Alias for batch predictions — same endpoint, kept separate for clarity."""
    return inference_service.predict(db, model_id, payload.data)

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.ml_model import MLModel
from models.training_job import TrainingJob
from schemas.ml_model import MLModelResponse, ModelStageUpdate

router = APIRouter(prefix="/api/models", tags=["Models"])

VALID_STAGES = {"NONE", "STAGING", "PRODUCTION", "ARCHIVED"}


@router.get("/", response_model=List[MLModelResponse])
def list_models(db: Session = Depends(get_db)):
    models = db.query(MLModel).order_by(MLModel.created_at.desc()).all()
    return [_serialize(m) for m in models]


@router.get("/{model_id}", response_model=MLModelResponse)
def get_model(model_id: int, db: Session = Depends(get_db)):
    return _serialize(_get_or_404(db, model_id))


@router.put("/{model_id}/stage", response_model=MLModelResponse)
def update_stage(model_id: int, payload: ModelStageUpdate, db: Session = Depends(get_db)):
    stage = payload.stage.upper()
    if stage not in VALID_STAGES:
        raise HTTPException(422, f"Invalid stage. Must be one of: {VALID_STAGES}")
    model = _get_or_404(db, model_id)
    model.stage = stage
    db.commit()
    db.refresh(model)
    return _serialize(model)


@router.delete("/{model_id}", status_code=204)
def delete_model(model_id: int, db: Session = Depends(get_db)):
    model = _get_or_404(db, model_id)
    db.delete(model)
    db.commit()


@router.get("/{model_id}/feature-importance")
def get_feature_importance(model_id: int, db: Session = Depends(get_db)):
    import joblib
    model_rec = _get_or_404(db, model_id)
    algo = joblib.load(model_rec.artifact_path)
    feature_cols = json.loads(model_rec.feature_columns) if model_rec.feature_columns else []
    importance = algo.get_feature_importance()
    if importance is None:
        return {"feature_importance": None}
    return {
        "feature_importance": [
            {"feature": f, "importance": round(float(v), 6)}
            for f, v in zip(feature_cols, importance)
        ]
    }


def _get_or_404(db: Session, model_id: int) -> MLModel:
    m = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not m:
        raise HTTPException(404, f"Model {model_id} not found.")
    return m


def _serialize(m: MLModel) -> dict:
    d = {c.name: getattr(m, c.name) for c in m.__table__.columns}
    d["metrics"] = json.loads(d["metrics"]) if d["metrics"] else {}
    d["feature_columns"] = json.loads(d["feature_columns"]) if d["feature_columns"] else []
    return d

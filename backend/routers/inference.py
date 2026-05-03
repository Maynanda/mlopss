from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import random
import numpy as np
import pandas as pd

from database import get_db
from models.ml_model import MLModel
from schemas.ml_model import PredictRequest, PredictResponse
from services.inference_service import inference_service, _load_model_cached

router = APIRouter(prefix="/api/inference", tags=["Inference"])


@router.post("/{model_id}/predict", response_model=PredictResponse)
def predict(model_id: int, payload: PredictRequest, db: Session = Depends(get_db)):
    return inference_service.predict(db, model_id, payload.data)


@router.post("/{model_id}/predict/batch", response_model=PredictResponse)
def predict_batch(model_id: int, payload: PredictRequest, db: Session = Depends(get_db)):
    """Alias for batch predictions — same endpoint, kept separate for clarity."""
    return inference_service.predict(db, model_id, payload.data)


@router.get("/{model_id}/live-data")
def get_live_data(model_id: int, db: Session = Depends(get_db)):
    """Simulates an external data stream providing a live data point for this model."""
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")
        
    feature_cols = json.loads(model.feature_columns)
    
    row = {}
    for col in feature_cols:
        cl = col.lower()
        if "sqft" in cl:
            row[col] = round(random.uniform(1000, 4000), 1)
        elif "price" in cl or "spend" in cl:
            row[col] = round(random.uniform(20, 200), 2)
        elif "age" in cl:
            row[col] = random.randint(1, 60)
        elif "freq" in cl or "ticket" in cl:
            row[col] = random.randint(0, 10)
        elif "pct" in cl or "usage" in cl:
            row[col] = round(random.uniform(20, 95), 1)
        elif "mb" in cl or "net" in cl:
            row[col] = round(random.uniform(50, 500), 1)
        else:
            row[col] = round(random.uniform(0, 10), 2)
            
    return {"data": [row]}

@router.post("/{model_id}/explain")
def explain_prediction(model_id: int, payload: PredictRequest, db: Session = Depends(get_db)):
    """
    Provides a Local Feature Importance explanation by perturbing inputs.
    Black-box compatible for all models.
    """
    if len(payload.data) == 0:
        raise HTTPException(400, "Provide at least one row of data to explain.")
        
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")
        
    ml_model, preprocessor = _load_model_cached(model.artifact_path, model.preprocessor_path)
    feature_cols = json.loads(model.feature_columns)
    
    row = payload.data[0] # Explain the first row
    df = pd.DataFrame([row])
    X_base = preprocessor.transform(df[feature_cols])
    
    if model.task_type == "classification":
        base_score = ml_model.predict_proba(X_base)[0].max() 
    else:
        base_score = ml_model.predict(X_base)[0]
        
    importances = {}
    for col in feature_cols:
        df_perturbed = df.copy()
        orig_val = df_perturbed.at[0, col]
        
        # Perturb numeric columns by 10%, or set string to "unknown"
        if isinstance(orig_val, (int, float)):
            df_perturbed.at[0, col] = orig_val * 1.1 if orig_val != 0 else 1.0
        else:
            df_perturbed.at[0, col] = "unknown"
            
        try:
            X_pert = preprocessor.transform(df_perturbed[feature_cols])
            if model.task_type == "classification":
                pert_score = ml_model.predict_proba(X_pert)[0].max()
            else:
                pert_score = ml_model.predict(X_pert)[0]
                
            importances[col] = abs(base_score - pert_score)
        except Exception:
            importances[col] = 0.0
            
    total_imp = sum(importances.values())
    if total_imp > 0:
        importances = {k: round((v / total_imp) * 100, 2) for k, v in importances.items()}
    else:
        importances = {k: 0.0 for k in importances.keys()}
        
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))
    
    return {
        "model_id": model_id,
        "base_prediction_score": float(base_score),
        "feature_importances": sorted_importances
    }

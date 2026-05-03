"""
Inference Service — loads trained models and runs predictions.
Uses a simple in-process LRU cache to avoid reloading models on every request.
"""
import os
import json
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.ml_model import MLModel
from models.inference_log import InferenceLog
from ml.preprocessor import DataPreprocessor
from ml.base import BaseMLModel


@lru_cache(maxsize=10)
def _load_model_cached_internal(artifact_path: str, preprocessor_path: str, mtime: float) -> Tuple[BaseMLModel, DataPreprocessor]:
    model: BaseMLModel = joblib.load(artifact_path)
    preprocessor: DataPreprocessor = joblib.load(preprocessor_path)
    return model, preprocessor

def _load_model_cached(artifact_path: str, preprocessor_path: str) -> Tuple[BaseMLModel, DataPreprocessor]:
    mtime = os.path.getmtime(artifact_path) if os.path.exists(artifact_path) else 0.0
    return _load_model_cached_internal(artifact_path, preprocessor_path, mtime)


class InferenceService:

    def predict(
        self,
        db: Session,
        model_id: int,
        data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        ml_model: MLModel = db.query(MLModel).filter(MLModel.id == model_id).first()
        if not ml_model:
            raise HTTPException(404, f"Model {model_id} not found.")

        model, preprocessor = _load_model_cached(
            ml_model.artifact_path, ml_model.preprocessor_path
        )

        feature_cols: List[str] = json.loads(ml_model.feature_columns)
        df = pd.DataFrame(data)

        # Validate columns
        missing = [c for c in feature_cols if c not in df.columns]
        if missing:
            raise HTTPException(
                422, f"Input data is missing required columns: {missing}"
            )

        X = preprocessor.transform(df[feature_cols])
        predictions = model.predict(X).tolist()
        probabilities: Optional[List] = None
        prediction_labels: Optional[List[str]] = None
        label_classes = preprocessor.get_label_classes()

        if ml_model.task_type == "classification":
            y_proba = model.predict_proba(X)
            if y_proba is not None:
                probabilities = y_proba.tolist()
            if label_classes:
                prediction_labels = [label_classes[int(p)] for p in predictions]

        # Log inferences for drift detection
        for i, row_data in enumerate(data):
            # Using standard types for JSON serialization
            pred_val = predictions[i] if prediction_labels is None else prediction_labels[i]
            if isinstance(pred_val, np.generic):
                pred_val = pred_val.item()
            
            log_entry = InferenceLog(
                model_id=model_id,
                input_data=row_data,
                prediction=pred_val
            )
            db.add(log_entry)
        db.commit()

        return {
            "model_id": model_id,
            "predictions": predictions,
            "prediction_labels": prediction_labels,
            "probabilities": probabilities,
        }

    def invalidate_cache(self, artifact_path: str, preprocessor_path: str):
        """Call after model update to clear cache."""
        _load_model_cached_internal.cache_clear()


inference_service = InferenceService()

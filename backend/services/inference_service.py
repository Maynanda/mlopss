"""
Inference Service — loads trained models and runs predictions.
Uses a simple in-process LRU cache to avoid reloading models on every request.
"""
import json
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.ml_model import MLModel
from ml.preprocessor import DataPreprocessor
from ml.base import BaseMLModel


@lru_cache(maxsize=10)
def _load_model_cached(artifact_path: str, preprocessor_path: str) -> Tuple[BaseMLModel, DataPreprocessor]:
    model: BaseMLModel = joblib.load(artifact_path)
    preprocessor: DataPreprocessor = joblib.load(preprocessor_path)
    return model, preprocessor


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

        return {
            "model_id": model_id,
            "predictions": predictions,
            "prediction_labels": prediction_labels,
            "probabilities": probabilities,
        }

    def invalidate_cache(self, artifact_path: str, preprocessor_path: str):
        """Call after model update to clear cache."""
        _load_model_cached.cache_clear()


inference_service = InferenceService()

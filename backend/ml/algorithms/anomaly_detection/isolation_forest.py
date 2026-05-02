from typing import Any, Dict, List
import numpy as np
from sklearn.ensemble import IsolationForest
from ml.base import BaseMLModel
from ml.registry import register


@register
class IsolationForestModel(BaseMLModel):
    task_type = "anomaly_detection"
    algorithm_name = "isolation_forest"
    requires_target = False

    def build(self):
        return IsolationForest(
            n_estimators=self.hyperparams.get("n_estimators", 100),
            contamination=self.hyperparams.get("contamination", 0.1),
            max_samples=self.hyperparams.get("max_samples", "auto"),
            random_state=42,
            n_jobs=-1,
        )

    def predict(self, X: np.ndarray) -> np.ndarray:
        # sklearn returns -1 (anomaly) or 1 (normal); convert to 0/1
        raw = self.model.predict(X)
        return np.where(raw == -1, 1, 0)  # 1 = anomaly

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"n_estimators": 100, "contamination": 0.1, "max_samples": "auto"}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "n_estimators", "type": "integer", "default": 100, "min": 10, "max": 500},
            {"name": "contamination", "type": "float", "default": 0.1, "min": 0.01, "max": 0.5},
        ]

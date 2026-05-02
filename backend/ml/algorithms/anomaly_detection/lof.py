from typing import Any, Dict, List
import numpy as np
from sklearn.neighbors import LocalOutlierFactor
from ml.base import BaseMLModel
from ml.registry import register


@register
class LOFModel(BaseMLModel):
    task_type = "anomaly_detection"
    algorithm_name = "local_outlier_factor"
    requires_target = False

    def build(self):
        return LocalOutlierFactor(
            n_neighbors=self.hyperparams.get("n_neighbors", 20),
            contamination=self.hyperparams.get("contamination", 0.1),
            novelty=True,       # novelty=True allows predict on new data
            n_jobs=-1,
        )

    def predict(self, X: np.ndarray) -> np.ndarray:
        raw = self.model.predict(X)
        return np.where(raw == -1, 1, 0)  # 1 = anomaly

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"n_neighbors": 20, "contamination": 0.1}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "n_neighbors", "type": "integer", "default": 20, "min": 5, "max": 100},
            {"name": "contamination", "type": "float", "default": 0.1, "min": 0.01, "max": 0.5},
        ]

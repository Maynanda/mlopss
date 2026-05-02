from typing import Any, Dict, List
from sklearn.svm import SVC
from ml.base import BaseMLModel
from ml.registry import register


@register
class SVMClassifierModel(BaseMLModel):
    task_type = "classification"
    algorithm_name = "svm_classifier"

    def build(self):
        return SVC(
            C=self.hyperparams.get("C", 1.0),
            kernel=self.hyperparams.get("kernel", "rbf"),
            gamma=self.hyperparams.get("gamma", "scale"),
            probability=True,
            random_state=42,
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"C": 1.0, "kernel": "rbf", "gamma": "scale"}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "C", "type": "float", "default": 1.0, "min": 0.001, "max": 100.0},
            {"name": "kernel", "type": "select", "default": "rbf", "options": ["linear", "rbf", "poly", "sigmoid"]},
            {"name": "gamma", "type": "select", "default": "scale", "options": ["scale", "auto"]},
        ]

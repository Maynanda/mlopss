from typing import Any, Dict, List
from sklearn.linear_model import LogisticRegression
from ml.base import BaseMLModel
from ml.registry import register


@register
class LogisticRegressionModel(BaseMLModel):
    task_type = "classification"
    algorithm_name = "logistic_regression"

    def build(self):
        return LogisticRegression(
            C=self.hyperparams.get("C", 1.0),
            max_iter=self.hyperparams.get("max_iter", 1000),
            solver="lbfgs",
            multi_class="auto",
            random_state=42,
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"C": 1.0, "max_iter": 1000}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "C", "type": "float", "default": 1.0, "min": 0.001, "max": 100.0},
            {"name": "max_iter", "type": "integer", "default": 1000, "min": 100, "max": 5000},
        ]

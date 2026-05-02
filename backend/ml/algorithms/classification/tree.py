from typing import Any, Dict, List
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier
from ml.base import BaseMLModel
from ml.registry import register


@register
class RandomForestClassifierModel(BaseMLModel):
    task_type = "classification"
    algorithm_name = "random_forest_classifier"

    def build(self):
        return RandomForestClassifier(
            n_estimators=self.hyperparams.get("n_estimators", 100),
            max_depth=self.hyperparams.get("max_depth") or None,
            min_samples_split=self.hyperparams.get("min_samples_split", 2),
            random_state=42,
            n_jobs=-1,
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"n_estimators": 100, "max_depth": None, "min_samples_split": 2}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "n_estimators", "type": "integer", "default": 100, "min": 10, "max": 1000},
            {"name": "max_depth", "type": "integer", "default": None, "min": 1, "max": 50, "nullable": True},
            {"name": "min_samples_split", "type": "integer", "default": 2, "min": 2, "max": 20},
        ]


@register
class GradientBoostingClassifierModel(BaseMLModel):
    task_type = "classification"
    algorithm_name = "gradient_boosting_classifier"

    def build(self):
        return GradientBoostingClassifier(
            n_estimators=self.hyperparams.get("n_estimators", 100),
            learning_rate=self.hyperparams.get("learning_rate", 0.1),
            max_depth=self.hyperparams.get("max_depth", 3),
            random_state=42,
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"n_estimators": 100, "learning_rate": 0.1, "max_depth": 3}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "n_estimators", "type": "integer", "default": 100, "min": 10, "max": 1000},
            {"name": "learning_rate", "type": "float", "default": 0.1, "min": 0.001, "max": 1.0},
            {"name": "max_depth", "type": "integer", "default": 3, "min": 1, "max": 20},
        ]


@register
class ExtraTreesClassifierModel(BaseMLModel):
    task_type = "classification"
    algorithm_name = "extra_trees_classifier"

    def build(self):
        return ExtraTreesClassifier(
            n_estimators=self.hyperparams.get("n_estimators", 100),
            max_depth=self.hyperparams.get("max_depth") or None,
            random_state=42,
            n_jobs=-1,
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"n_estimators": 100, "max_depth": None}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "n_estimators", "type": "integer", "default": 100, "min": 10, "max": 1000},
            {"name": "max_depth", "type": "integer", "default": None, "min": 1, "max": 50, "nullable": True},
        ]

from typing import Any, Dict, List
from sklearn.cluster import KMeans, DBSCAN
from ml.base import BaseMLModel
from ml.registry import register


@register
class KMeansModel(BaseMLModel):
    task_type = "clustering"
    algorithm_name = "kmeans"
    requires_target = False

    def build(self):
        return KMeans(
            n_clusters=self.hyperparams.get("n_clusters", 3),
            max_iter=self.hyperparams.get("max_iter", 300),
            random_state=42,
            n_init="auto",
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"n_clusters": 3, "max_iter": 300}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "n_clusters", "type": "integer", "default": 3, "min": 2, "max": 50},
            {"name": "max_iter", "type": "integer", "default": 300, "min": 100, "max": 1000},
        ]


@register
class DBSCANModel(BaseMLModel):
    task_type = "clustering"
    algorithm_name = "dbscan"
    requires_target = False

    def build(self):
        return DBSCAN(
            eps=self.hyperparams.get("eps", 0.5),
            min_samples=self.hyperparams.get("min_samples", 5),
            n_jobs=-1,
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"eps": 0.5, "min_samples": 5}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "eps", "type": "float", "default": 0.5, "min": 0.01, "max": 10.0},
            {"name": "min_samples", "type": "integer", "default": 5, "min": 2, "max": 100},
        ]

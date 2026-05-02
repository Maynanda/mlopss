from typing import Any, Dict, List
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from ml.base import BaseMLModel
from ml.registry import register


@register
class LinearRegressionModel(BaseMLModel):
    task_type = "regression"
    algorithm_name = "linear_regression"

    def build(self):
        return LinearRegression(fit_intercept=self.hyperparams.get("fit_intercept", True))

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"fit_intercept": True}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [{"name": "fit_intercept", "type": "boolean", "default": True}]


@register
class RidgeRegressionModel(BaseMLModel):
    task_type = "regression"
    algorithm_name = "ridge_regression"

    def build(self):
        return Ridge(alpha=self.hyperparams.get("alpha", 1.0))

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"alpha": 1.0}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [{"name": "alpha", "type": "float", "default": 1.0, "min": 0.001, "max": 100.0}]


@register
class LassoRegressionModel(BaseMLModel):
    task_type = "regression"
    algorithm_name = "lasso_regression"

    def build(self):
        return Lasso(alpha=self.hyperparams.get("alpha", 0.1), max_iter=10000)

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"alpha": 0.1}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [{"name": "alpha", "type": "float", "default": 0.1, "min": 0.0001, "max": 100.0}]


@register
class ElasticNetModel(BaseMLModel):
    task_type = "regression"
    algorithm_name = "elastic_net"

    def build(self):
        return ElasticNet(
            alpha=self.hyperparams.get("alpha", 1.0),
            l1_ratio=self.hyperparams.get("l1_ratio", 0.5),
            max_iter=10000,
        )

    def get_default_hyperparams(self) -> Dict[str, Any]:
        return {"alpha": 1.0, "l1_ratio": 0.5}

    def get_hyperparams_schema(self) -> List[Dict]:
        return [
            {"name": "alpha", "type": "float", "default": 1.0, "min": 0.0001, "max": 100.0},
            {"name": "l1_ratio", "type": "float", "default": 0.5, "min": 0.0, "max": 1.0},
        ]

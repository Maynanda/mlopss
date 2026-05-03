from typing import Any, Dict
from sklearn.neural_network import MLPClassifier, MLPRegressor

from ml.base import BaseMLModel
from ml.registry import register_algorithm

@register_algorithm(name="mlp_classifier", task_type="classification")
class MLPClassifierModel(BaseMLModel):
    """
    Multi-layer Perceptron Classifier.
    Supports hidden_layer_sizes as a tuple or comma-separated string.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        sizes = kwargs.get("hidden_layer_sizes", (100, 50))
        if isinstance(sizes, str):
            try:
                sizes = tuple(int(x.strip()) for x in sizes.split(",") if x.strip())
            except Exception:
                sizes = (100, 50)
                
        self.model = MLPClassifier(
            hidden_layer_sizes=sizes,
            activation=kwargs.get("activation", "relu"),
            solver=kwargs.get("solver", "adam"),
            max_iter=int(kwargs.get("max_iter", 500)),
            random_state=42
        )

@register_algorithm(name="mlp_regressor", task_type="regression")
class MLPRegressorModel(BaseMLModel):
    """
    Multi-layer Perceptron Regressor.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        sizes = kwargs.get("hidden_layer_sizes", (100, 50))
        if isinstance(sizes, str):
            try:
                sizes = tuple(int(x.strip()) for x in sizes.split(",") if x.strip())
            except Exception:
                sizes = (100, 50)
                
        self.model = MLPRegressor(
            hidden_layer_sizes=sizes,
            activation=kwargs.get("activation", "relu"),
            solver=kwargs.get("solver", "adam"),
            max_iter=int(kwargs.get("max_iter", 500)),
            random_state=42
        )

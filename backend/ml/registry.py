"""
Algorithm Registry — auto-discovers all registered algorithms.
To add a new algorithm: subclass BaseMLModel, set task_type + algorithm_name, apply @register.
"""
from typing import Dict, Type, List
from ml.base import BaseMLModel

_REGISTRY: Dict[str, Type[BaseMLModel]] = {}


def register(cls: Type[BaseMLModel]) -> Type[BaseMLModel]:
    """Class decorator that adds an algorithm to the registry."""
    key = f"{cls.task_type}/{cls.algorithm_name}"
    _REGISTRY[key] = cls
    return cls


def get_algorithm(task_type: str, algorithm_name: str) -> Type[BaseMLModel]:
    key = f"{task_type}/{algorithm_name}"
    if key not in _REGISTRY:
        available = list(_REGISTRY.keys())
        raise ValueError(
            f"Algorithm '{algorithm_name}' for task '{task_type}' not found.\n"
            f"Available: {available}"
        )
    return _REGISTRY[key]


def list_algorithms() -> List[Dict]:
    results = []
    for key, cls in _REGISTRY.items():
        instance = cls({})
        results.append({
            "key": key,
            "task_type": cls.task_type,
            "algorithm_name": cls.algorithm_name,
            "requires_target": cls.requires_target,
            "default_hyperparams": instance.get_default_hyperparams(),
            "hyperparams_schema": instance.get_hyperparams_schema(),
        })
    return results


def _load_all_algorithms():
    """Import all algorithm modules to trigger @register decorators."""
    import ml.algorithms.regression.linear      # noqa
    import ml.algorithms.regression.tree        # noqa
    import ml.algorithms.classification.logistic  # noqa
    import ml.algorithms.classification.tree    # noqa
    import ml.algorithms.classification.svm_clf  # noqa
    import ml.algorithms.anomaly_detection.isolation_forest  # noqa
    import ml.algorithms.anomaly_detection.lof  # noqa
    import ml.algorithms.clustering.kmeans      # noqa
    # Future: deep_learning, time_series — add imports here when ready


_load_all_algorithms()

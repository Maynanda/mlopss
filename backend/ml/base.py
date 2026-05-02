from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import numpy as np


class BaseMLModel(ABC):
    """
    Abstract base class for all ML algorithms in the platform.
    Every algorithm must subclass this and register via @register.
    """
    task_type: str = ""          # regression | classification | anomaly_detection | clustering
    algorithm_name: str = ""     # unique key within task_type
    requires_target: bool = True  # False for unsupervised

    def __init__(self, hyperparams: Dict[str, Any] = {}):
        self.hyperparams = hyperparams
        self.model = None
        self.is_fitted = False

    @abstractmethod
    def build(self) -> Any:
        """Instantiate and return the underlying estimator."""
        pass

    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> "BaseMLModel":
        if self.model is None:
            self.model = self.build()
        if y is not None:
            self.model.fit(X, y)
        else:
            self.model.fit(X)
        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Model is not fitted yet.")
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> Optional[np.ndarray]:
        if hasattr(self.model, "predict_proba"):
            return self.model.predict_proba(X)
        return None

    def decision_scores(self, X: np.ndarray) -> Optional[np.ndarray]:
        """For anomaly models — returns raw scores."""
        if hasattr(self.model, "decision_function"):
            return self.model.decision_function(X)
        if hasattr(self.model, "score_samples"):
            return self.model.score_samples(X)
        return None

    def get_feature_importance(self) -> Optional[np.ndarray]:
        if self.model and hasattr(self.model, "feature_importances_"):
            return self.model.feature_importances_
        if self.model and hasattr(self.model, "coef_"):
            coef = self.model.coef_
            return np.abs(coef).flatten() if coef.ndim > 1 else np.abs(coef)
        return None

    @abstractmethod
    def get_default_hyperparams(self) -> Dict[str, Any]:
        pass

    def get_hyperparams_schema(self) -> List[Dict[str, Any]]:
        """Schema used by frontend to render hyperparameter form."""
        return []

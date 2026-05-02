from typing import Dict, Any
import numpy as np
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error,
    r2_score, mean_absolute_percentage_error,
)


def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    mse = mean_squared_error(y_true, y_pred)
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 6),
        "mse": round(float(mse), 6),
        "rmse": round(float(np.sqrt(mse)), 6),
        "r2": round(float(r2_score(y_true, y_pred)), 6),
        "mape": round(float(mean_absolute_percentage_error(y_true, y_pred)), 6),
    }

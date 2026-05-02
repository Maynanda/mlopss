from typing import Dict, Any
import numpy as np
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix,
)


def compute_anomaly_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    scores: np.ndarray = None,
) -> Dict[str, Any]:
    """
    y_true: 0 = normal, 1 = anomaly (ground truth, if available)
    y_pred: 0 = normal, 1 = anomaly (model output)
    scores: raw decision scores (lower = more anomalous for IF)
    """
    n_anomalies = int(np.sum(y_pred == 1))
    n_normal = int(np.sum(y_pred == 0))
    anomaly_rate = round(float(n_anomalies / len(y_pred)), 4) if len(y_pred) > 0 else 0.0

    metrics: Dict[str, Any] = {
        "n_anomalies": n_anomalies,
        "n_normal": n_normal,
        "anomaly_rate": anomaly_rate,
    }

    # Supervised metrics only if ground truth provided
    if y_true is not None and len(np.unique(y_true)) > 1:
        metrics["precision"] = round(float(precision_score(y_true, y_pred, zero_division=0)), 6)
        metrics["recall"] = round(float(recall_score(y_true, y_pred, zero_division=0)), 6)
        metrics["f1_score"] = round(float(f1_score(y_true, y_pred, zero_division=0)), 6)
        metrics["confusion_matrix"] = confusion_matrix(y_true, y_pred).tolist()

        if scores is not None:
            try:
                metrics["roc_auc"] = round(float(roc_auc_score(y_true, -scores)), 6)
            except Exception:
                pass

    return metrics

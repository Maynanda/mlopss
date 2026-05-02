from typing import Dict, Any, Optional, List
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix,
    classification_report,
)


def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: Optional[np.ndarray] = None,
    label_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    avg = "binary" if len(np.unique(y_true)) == 2 else "weighted"

    metrics: Dict[str, Any] = {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 6),
        "precision": round(float(precision_score(y_true, y_pred, average=avg, zero_division=0)), 6),
        "recall": round(float(recall_score(y_true, y_pred, average=avg, zero_division=0)), 6),
        "f1_score": round(float(f1_score(y_true, y_pred, average=avg, zero_division=0)), 6),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "label_names": label_names or [],
    }

    if y_proba is not None:
        try:
            if y_proba.shape[1] == 2:
                auc = roc_auc_score(y_true, y_proba[:, 1])
            else:
                auc = roc_auc_score(y_true, y_proba, multi_class="ovr", average="weighted")
            metrics["roc_auc"] = round(float(auc), 6)
        except Exception:
            pass

    return metrics

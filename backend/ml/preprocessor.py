from typing import List, Optional, Tuple, Dict
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, OrdinalEncoder, LabelEncoder
from sklearn.impute import SimpleImputer


class DataPreprocessor:
    """
    Handles feature preprocessing for the ML pipeline.
    Fit on training data, then transform inference data consistently.
    """

    def __init__(self, pipeline_config: dict = None):
        self.pipeline_config = pipeline_config or {}
        self.num_imputer = SimpleImputer(strategy="median")
        self.cat_encoder = OrdinalEncoder(
            handle_unknown="use_encoded_value", unknown_value=-1
        )
        
        scaler_type = self.pipeline_config.get("scaler", "standard").lower()
        if scaler_type == "minmax":
            self.scaler = MinMaxScaler()
        elif scaler_type == "robust":
            self.scaler = RobustScaler()
        elif scaler_type == "none":
            self.scaler = None
        else:
            self.scaler = StandardScaler()
            
        self.label_encoder = LabelEncoder()
        self.feature_names: List[str] = []
        self.categorical_cols: List[str] = []
        self.numerical_cols: List[str] = []
        self.is_fitted = False

    def fit_transform(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: Optional[str] = None,
        scale: bool = True,
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        
        # Apply custom feature engineering expressions
        eval_exprs = self.pipeline_config.get("eval_exprs", [])
        for expr in eval_exprs:
            if expr.strip():
                try:
                    df = df.eval(expr)
                except Exception as e:
                    print(f"Warning: Failed to evaluate expression '{expr}': {e}")
                    
        self.feature_names = feature_cols
        X = df[feature_cols].copy()

        self.numerical_cols = X.select_dtypes(include=["number"]).columns.tolist()
        self.categorical_cols = X.select_dtypes(exclude=["number"]).columns.tolist()

        if self.numerical_cols:
            X[self.numerical_cols] = self.num_imputer.fit_transform(
                X[self.numerical_cols]
            )
        if self.categorical_cols:
            X[self.categorical_cols] = self.cat_encoder.fit_transform(
                X[self.categorical_cols]
            )

        X_arr = X.values.astype(float)
        if scale and self.scaler:
            X_arr = self.scaler.fit_transform(X_arr)

        self.is_fitted = True

        y = None
        if target_col and target_col in df.columns:
            y_raw = df[target_col]
            if y_raw.dtype == object or str(y_raw.dtype) == "category":
                y = self.label_encoder.fit_transform(y_raw)
            else:
                y = y_raw.values.astype(float)

        return X_arr, y

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Preprocessor not fitted.")
            
        eval_exprs = getattr(self, "pipeline_config", {}).get("eval_exprs", [])
        for expr in eval_exprs:
            if expr.strip():
                try:
                    df = df.eval(expr)
                except Exception as e:
                    print(f"Warning: Failed to evaluate expression '{expr}': {e}")
                    
        X = df[self.feature_names].copy()
        if self.numerical_cols:
            X[self.numerical_cols] = self.num_imputer.transform(X[self.numerical_cols])
        if self.categorical_cols:
            X[self.categorical_cols] = self.cat_encoder.transform(
                X[self.categorical_cols]
            )
        X_arr = X.values.astype(float)
        if self.scaler:
            return self.scaler.transform(X_arr)
        return X_arr

    def inverse_transform_target(self, y: np.ndarray) -> np.ndarray:
        if hasattr(self.label_encoder, "classes_") and len(self.label_encoder.classes_):
            return self.label_encoder.inverse_transform(y.astype(int))
        return y

    def get_label_classes(self) -> Optional[List[str]]:
        if hasattr(self.label_encoder, "classes_") and len(self.label_encoder.classes_):
            return list(self.label_encoder.classes_)
        return None

    def get_feature_dtypes(self, df: pd.DataFrame) -> Dict[str, str]:
        return {col: str(df[col].dtype) for col in self.feature_names if col in df.columns}

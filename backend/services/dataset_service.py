import json
import shutil
from pathlib import Path
from typing import List, Optional

import pandas as pd
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from config import settings
from models.dataset import Dataset


class DatasetService:

    def save_upload(
        self, db: Session, file: UploadFile, name: str, description: Optional[str]
    ) -> Dataset:
        # Determine format
        suffix = Path(file.filename).suffix.lower()
        if suffix not in (".csv", ".json"):
            raise HTTPException(400, "Only CSV and JSON files are supported.")

        dest_path = settings.DATASETS_DIR / file.filename
        # Avoid collision
        counter = 1
        while dest_path.exists():
            dest_path = settings.DATASETS_DIR / f"{Path(file.filename).stem}_{counter}{suffix}"
            counter += 1

        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Parse to get shape info
        try:
            df = self._read_file(dest_path, suffix)
        except Exception as e:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(400, f"Could not parse file: {e}")

        ds = Dataset(
            name=name,
            filename=dest_path.name,
            file_path=str(dest_path),
            file_format=suffix.lstrip("."),
            rows=len(df),
            columns=len(df.columns),
            column_names=json.dumps(list(df.columns)),
            size_bytes=dest_path.stat().st_size,
            description=description,
        )
        db.add(ds)
        db.commit()
        db.refresh(ds)
        return ds

    def list_all(self, db: Session) -> List[Dataset]:
        return db.query(Dataset).order_by(Dataset.created_at.desc()).all()

    def get_or_404(self, db: Session, dataset_id: int) -> Dataset:
        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            raise HTTPException(404, f"Dataset {dataset_id} not found.")
        return ds

    def preview(self, db: Session, dataset_id: int) -> dict:
        ds = self.get_or_404(db, dataset_id)
        suffix = f".{ds.file_format}"
        df = self._read_file(Path(ds.file_path), suffix)
        head = df.head(20).fillna("").astype(str)
        stats_raw = df.describe(include="all").fillna("").astype(str).to_dict()
        return {
            "columns": list(df.columns),
            "dtypes": {col: str(df[col].dtype) for col in df.columns},
            "head": head.to_dict(orient="records"),
            "stats": stats_raw,
            "shape": list(df.shape),
        }

    def delete(self, db: Session, dataset_id: int) -> None:
        ds = self.get_or_404(db, dataset_id)
        Path(ds.file_path).unlink(missing_ok=True)
        db.delete(ds)
        db.commit()

    def load_dataframe(self, ds: Dataset) -> pd.DataFrame:
        suffix = f".{ds.file_format}"
        return self._read_file(Path(ds.file_path), suffix)

    @staticmethod
    def _read_file(path: Path, suffix: str) -> pd.DataFrame:
        if suffix == ".csv":
            return pd.read_csv(path)
        elif suffix == ".json":
            return pd.read_json(path)
        raise ValueError(f"Unsupported file suffix: {suffix}")


dataset_service = DatasetService()

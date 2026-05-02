import json
from typing import List

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas.dataset import DatasetResponse, DatasetPreview
from services.dataset_service import dataset_service

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(default=""),
    db: Session = Depends(get_db),
):
    ds = dataset_service.save_upload(db, file, name, description or None)
    ds.column_names = json.loads(ds.column_names) if ds.column_names else []
    return ds


@router.get("/", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    datasets = dataset_service.list_all(db)
    for ds in datasets:
        if ds.column_names and isinstance(ds.column_names, str):
            ds.column_names = json.loads(ds.column_names)
    return datasets


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    ds = dataset_service.get_or_404(db, dataset_id)
    if ds.column_names and isinstance(ds.column_names, str):
        ds.column_names = json.loads(ds.column_names)
    return ds


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(dataset_id: int, db: Session = Depends(get_db)):
    return dataset_service.preview(db, dataset_id)


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset_service.delete(db, dataset_id)
    return {"message": f"Dataset {dataset_id} deleted."}

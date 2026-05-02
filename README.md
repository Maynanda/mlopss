# MLOps Platform

A full-stack MLOps platform for model training, experiment tracking, registry management, and live inference.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | FastAPI |
| Experiment Tracking | MLflow |
| ML Engine | scikit-learn |
| Database | SQLite (→ PostgreSQL via config) |
| State Management | Zustand |
| Charts | Recharts |

## Quick Start

```bash
chmod +x mlops_start.sh
./mlops_start.sh
```

This installs all dependencies and starts:
- 🌐 **Frontend** → http://localhost:5173
- ⚡ **Backend API** → http://localhost:8000
- 📊 **MLflow UI** → http://localhost:5001
- 📖 **API Docs** → http://localhost:8000/docs

## Manual Start

```bash
# Terminal 1 — Backend venv
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — MLflow
mlflow server --host 0.0.0.0 --port 5001 \
  --backend-store-uri sqlite:///backend/mlflow.db

# Terminal 3 — Frontend
cd frontend
npm install && npm run dev
```

## Project Structure

```
ml-platform/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── config.py                # Settings & env vars
│   ├── database.py              # SQLAlchemy setup
│   ├── models/                  # DB models
│   ├── schemas/                 # Pydantic schemas
│   ├── routers/                 # API route handlers
│   ├── services/                # Business logic
│   ├── ml/
│   │   ├── base.py              # BaseMLModel abstract class
│   │   ├── registry.py          # Auto-discovery registry
│   │   ├── preprocessor.py      # Feature preprocessing
│   │   ├── algorithms/          # Plug-and-play algorithms
│   │   └── metrics/             # Per-task-type metrics
│   └── storage/                 # Uploaded files & model artifacts
└── frontend/
    └── src/
        ├── pages/               # 7 application pages
        ├── components/          # Reusable UI components
        ├── api/                 # Axios API clients
        └── store/               # Zustand state stores
```

## Supported Algorithms

### Regression
- Linear Regression, Ridge, Lasso, ElasticNet
- Random Forest Regressor, Gradient Boosting Regressor

### Classification
- Logistic Regression
- Random Forest, Gradient Boosting, Extra Trees
- SVM (with kernel selection)

### Anomaly Detection
- Isolation Forest
- Local Outlier Factor (novelty mode)

### Clustering
- KMeans, DBSCAN

### Future (Placeholders Ready)
- Deep Learning: MLP, CNN, LSTM, Transformer → `ml/algorithms/deep_learning/`
- Time Series: ARIMA, Prophet, LSTM → `ml/algorithms/time_series/`

## Adding a New Algorithm

1. Create a file in `backend/ml/algorithms/<task_type>/`
2. Subclass `BaseMLModel`, set `task_type` and `algorithm_name`
3. Apply `@register` decorator
4. Add import in `ml/registry.py` → `_load_all_algorithms()`

```python
from ml.base import BaseMLModel
from ml.registry import register

@register
class MyNewModel(BaseMLModel):
    task_type = "regression"
    algorithm_name = "my_new_model"

    def build(self):
        return MyEstimator(**self.hyperparams)

    def get_default_hyperparams(self):
        return {"param1": 1.0}
```

## Switching to PostgreSQL

In `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost/mlops
```

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/datasets/upload` | POST | Upload CSV/JSON dataset |
| `/api/datasets/` | GET | List all datasets |
| `/api/datasets/{id}/preview` | GET | Preview dataset (20 rows + stats) |
| `/api/experiments/` | POST | Create experiment |
| `/api/experiments/{id}/train` | POST | Start training (async background) |
| `/api/experiments/algorithms` | GET | List all available algorithms |
| `/api/training/jobs` | GET | List training jobs |
| `/api/models/` | GET | List all trained models |
| `/api/models/{id}/stage` | PUT | Update model stage |
| `/api/models/{id}/feature-importance` | GET | Get feature importances |
| `/api/inference/{id}/predict` | POST | Run prediction |
| `/api/monitoring/health` | GET | System health check |

# MLOps Platform

A full-stack, enterprise-grade MLOps platform for automated model training, experiment tracking, registry management, data engineering, and live inference monitoring.

## 🚀 Key Features

- **Automated Training Pipeline:** Select a dataset and algorithm; the backend handles imputation, encoding, scaling, and training asynchronously.
- **Visual Data Pipeline & Feature Engineering:** Manually select feature columns, write custom math transformations (e.g., `ratio = A / B`), and choose your scaling strategy before training.
- **Model Registry & MLflow:** Track hyperparameters, metrics, and manage model lifecycle stages (`STAGING`, `PRODUCTION`, etc.) with built-in MLflow logging.
- **Deep Learning Support:** Train Multi-layer Perceptron (MLP) Regressors and Classifiers.
- **Live Inference API:** Expose your production models via REST API for instant predictions.
- **Data Drift Monitoring:** Real-time dashboards visualizing incoming prediction streams and detecting data drift.
- **Black-Box Model Explainability:** Built-in perturbation analysis to calculate Local Feature Importance and explain exactly *why* a model made a specific prediction.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite |
| **Backend** | FastAPI |
| **Experiment Tracking** | MLflow |
| **ML Engine** | scikit-learn, pandas, numpy |
| **Database** | SQLite (→ PostgreSQL ready via config) |
| **State Management** | Zustand |
| **Charts** | Recharts |

---

## 🚦 Quick Start

Start all services (Frontend, Backend, MLflow) with one command:

```bash
chmod +x mlops_start.sh
./mlops_start.sh
```

- 🌐 **Frontend** → http://localhost:5173
- ⚡ **Backend API** → http://localhost:8000
- 📊 **MLflow UI** → http://localhost:5001
- 📖 **API Docs** → http://localhost:8000/docs

---

## 📊 Simulating Live Data

To test the **Monitoring** dashboard and **Data Drift** detection, you can run the provided simulator script. This script acts as an external client (like an IoT sensor or a Kafka stream), continuously sending live prediction requests to your deployed model.

1. Ensure you have trained a model and set its stage to `PRODUCTION` in the Model Registry.
2. Open a new terminal:
```bash
cd backend
source .venv/bin/activate
python scripts/simulate_stream.py
```
3. Open the **Monitoring** page in the UI to watch the real-time prediction charts light up.

---

## 🧠 Supported Algorithms

### Deep Learning
- Multi-layer Perceptron (MLP Classifier, MLP Regressor)

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

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/datasets/upload` | POST | Upload CSV/JSON dataset |
| `/api/experiments/` | POST | Create experiment (with Data Pipeline Config) |
| `/api/experiments/{id}/train` | POST | Start training (async background task) |
| `/api/models/` | GET | List all trained models |
| `/api/inference/{id}/predict` | POST | Run prediction (Auto-logs for drift detection) |
| `/api/inference/{id}/explain` | POST | Run local feature importance explanation |
| `/api/inference/{id}/live-data`| GET | Fetch dummy sensor data matching model schema |
| `/api/monitoring/models/{id}/drift`| GET | Fetch real-time data drift statistics |

---

## 🏗 Project Structure

```
ml-platform/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── database.py              # SQLAlchemy setup
│   ├── models/                  # DB models (Experiment, MLModel, InferenceLog)
│   ├── schemas/                 # Pydantic schemas
│   ├── routers/                 # API route handlers
│   ├── services/                # Business logic (Training, Inference)
│   ├── scripts/                 # Simulators & Data Generators
│   ├── ml/
│   │   ├── base.py              # BaseMLModel abstract class
│   │   ├── registry.py          # Auto-discovery registry
│   │   ├── preprocessor.py      # Feature engineering & scaling
│   │   └── algorithms/          # Plug-and-play algorithms (Regression, DL, etc.)
│   └── storage/                 # Uploaded files & model artifacts
└── frontend/
    └── src/
        ├── pages/               # UI pages (Experiments, Inference, Monitoring, etc.)
        ├── components/          # Reusable UI components
        └── api/                 # Axios API clients
```

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_tables
from routers import datasets, experiments, models, training, inference, monitoring

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="MLOps Platform — Model Training, Registry, and Inference",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    create_tables()
    print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} started")
    print(f"   MLflow tracking: {settings.MLFLOW_TRACKING_URI}")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(datasets.router)
app.include_router(experiments.router)
app.include_router(models.router)
app.include_router(training.router)
app.include_router(inference.router)
app.include_router(monitoring.router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }

# ── FUTURE: Auth middleware placeholder ───────────────────────────────────────
# from fastapi.security import OAuth2PasswordBearer
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# Add JWT middleware here when auth is needed

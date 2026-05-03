# Live Inference & Monitoring Developer Guide

This document outlines the architecture, API endpoints, and frontend implementation details for the Live Inference Auto-Polling and Advanced Monitoring systems. It is intended for developers looking to modify polling frequencies, connect real data streams, or extend the monitoring dashboards.

## 1. Auto-Polling Architecture (Frontend)

The Inference Dashboard allows users to run multiple models concurrently and automatically poll for new data to generate predictions.

### **File Location**
`frontend/src/pages/Inference.jsx`

### **How it Works**
The auto-poll loop is driven by a React `useEffect` hook inside the `ModelInferencePanel` component. When `autoPoll` is toggled `true`, it sets up a `setInterval` that triggers at the specified `pollInterval`.

During each tick:
1. It fetches a new row of data from the Live Data API.
2. It immediately pushes that row to the Predict API.
3. It updates the UI with the prediction result.

### **Adding Custom Polling Frequencies**
To add new polling frequencies (e.g., every 5 minutes), locate the `select` element in `Inference.jsx` and add a new `option` with the value in milliseconds:

```jsx
<select value={pollInterval} onChange={e => setPollInterval(Number(e.target.value))}>
  <option value={1000}>1s</option>
  <option value={2000}>2s</option>
  <option value={5000}>5s</option>
  <option value={10000}>10s</option>
  <option value={30000}>30s</option>
  <option value={60000}>60s</option>
  {/* Add new intervals here, e.g., 5 minutes */}
  <option value={300000}>5m</option>
</select>
```

---

## 2. Live Data Generation API

When the frontend auto-polls, it first requests a fresh row of data to act as the "input" for the prediction.

### **Endpoint**
`GET /api/inference/{model_id}/live-data`

### **File Location**
`backend/routers/inference.py`

### **How it Works**
Currently, this endpoint generates realistic simulated data based on the schema and feature columns expected by the specific `model_id`. 

### **Connecting to a Real Data Stream**
To swap the simulator for a real data stream (like Kafka, Redis Streams, or an external API), modify the `get_live_data` function in `inference.py`. Ensure that the function returns a JSON array containing a dictionary that strictly maps to the model's `feature_columns`.

```python
@router.get("/{model_id}/live-data")
def get_live_data(model_id: int, db: Session = Depends(get_db)):
    # ... model lookup logic ...
    
    # TODO: Replace with real stream integration
    # new_data = redis_client.xread({'model_stream': '$'}, count=1)
    
    # Ensure returned keys perfectly match the model's feature_columns
    return {"data": [simulated_row]}
```

---

## 3. Inference Prediction API

### **Endpoint**
`POST /api/inference/{model_id}/predict`

### **File Location**
`backend/routers/inference.py` & `backend/services/inference_service.py`

### **How it Works**
This endpoint receives the data row, passes it through the model's cached `DataPreprocessor`, and executes the prediction. Crucially, the prediction is then logged to the SQLite database via the `InferenceLog` model. 

**Note on Caching**: The `inference_service.py` uses an LRU cache keyed by the model's file path and **modification time (`mtime`)**. If a model is retrained, the `mtime` updates, automatically busting the cache without requiring a server restart.

---

## 4. Advanced Monitoring & Drift API

The Monitoring dashboard consumes the `InferenceLog` records to build interactive charts and feature drift metrics.

### **Endpoint**
`GET /api/monitoring/models/{model_id}/drift?limit=500`

### **File Location**
`backend/routers/monitoring.py`

### **How it Works**
This endpoint pulls the most recent `limit` records (defaulting to 500) from the database in chronological order. It returns both the `prediction` result and the raw `input_data` (the features). 

### **Extending the Monitoring API**
If you wish to increase the historical lookback window (e.g., fetching 5000 rows instead of 500), you can adjust the `limit` query parameter passed by the frontend in `frontend/src/pages/Monitoring.jsx`.

```javascript
// frontend/src/pages/Monitoring.jsx
const fetchDrift = () => {
  // Increase the limit parameter here to fetch more historical points
  monitoringApi.drift(selectedModelId, 1000).then(...)
}
```

If performance degrades due to massive JSON payloads in the future, you should consider aggregating the data (e.g., downsampling into 1-minute buckets) directly inside `backend/routers/monitoring.py` before sending it to the client.

---

## 5. Stateful Preprocessing & Feature Store (Future Placeholder)

When dealing with time-series models that require predicting ahead (e.g., forecasting 5 minutes into the future), the model often relies on stateful features such as **moving averages** or **lag time** (e.g., `feature_x_lag_1`). 

Because the `/predict` endpoint is fundamentally stateless and evaluates one incoming row at a time, calculating these stateful features "on the fly" requires historical context.

### **Current Implementation (Stateless)**
Currently, the `DataPreprocessor` supports stateless `eval_exprs` (e.g., `df['c'] = df['a'] * df['b']`). To use lag features right now, you must pre-compute them in your dataset before training, and the client streaming the live data must maintain a cache to send the computed lag feature directly in the JSON payload.

### **Future Feature Store Implementation**
To support native stateful transformations, a Feature Store mechanism will be introduced in the backend:
1. **In-Memory Cache (Redis)**: The API will maintain a sliding window (e.g., the last 10 minutes) of live events for each active model stream.
2. **Stateful Pipeline**: The `DataPreprocessor` will be extended to automatically intercept incoming single rows, append them to the sliding window, execute time-series window functions (like `pandas.DataFrame.shift()`), and pass the fully-engineered row to the model.

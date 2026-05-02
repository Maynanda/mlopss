import time
import json
import random
import requests

API_URL = "http://localhost:8000/api"

def get_production_models():
    res = requests.get(f"{API_URL}/models/")
    res.raise_for_status()
    models = res.json()
    return [m for m in models if m['stage'] == 'PRODUCTION']

def generate_row(feature_cols):
    row = {}
    for col in feature_cols:
        # Simple heuristic to generate somewhat realistic fake data based on column name
        if "sqft" in col.lower():
            row[col] = random.uniform(1000, 4000)
        elif "price" in col.lower() or "spend" in col.lower():
            row[col] = random.uniform(20, 200)
        elif "age" in col.lower():
            row[col] = random.randint(1, 60)
        elif "freq" in col.lower() or "ticket" in col.lower():
            row[col] = random.randint(0, 10)
        elif "pct" in col.lower() or "usage" in col.lower():
            row[col] = random.uniform(20, 95)
        elif "mb" in col.lower() or "net" in col.lower():
            row[col] = random.uniform(50, 500)
        else:
            row[col] = random.uniform(0, 10) # Fallback random float
    return row

def main():
    print("🚀 Starting Live Stream Inference Simulator...")
    print("Waiting for a PRODUCTION model to be available...")
    
    while True:
        try:
            prod_models = get_production_models()
        except requests.exceptions.ConnectionError:
            print("⏳ Cannot connect to backend. Is it running?")
            time.sleep(5)
            continue
            
        if not prod_models:
            print("⏳ No PRODUCTION models found. Train a model and set its stage to PRODUCTION in the UI.")
            time.sleep(10)
            continue
            
        model = prod_models[0]
        model_id = model['id']
        feature_cols = json.loads(model['feature_columns']) if isinstance(model['feature_columns'], str) else model['feature_columns']
        
        print(f"\n✅ Found Production Model: {model['name']} (Task: {model['task_type']})")
        print(f"📡 Simulating live data stream every 2 seconds...")
        print("-" * 50)
        
        # Stream loop for the current model
        while True:
            # Generate 1 to 3 random rows
            batch_size = random.randint(1, 3)
            data = [generate_row(feature_cols) for _ in range(batch_size)]
            
            try:
                res = requests.post(f"{API_URL}/inference/{model_id}/predict", json={"data": data})
                res.raise_for_status()
                result = res.json()
                
                print(f"[{time.strftime('%H:%M:%S')}] Sent {batch_size} rows -> Predictions: ", end="")
                preds = result['predictions']
                labels = result.get('prediction_labels')
                
                if labels:
                    print([f"{l} ({p})" for l, p in zip(labels, preds)])
                else:
                    print([round(p, 4) if isinstance(p, float) else p for p in preds])
                    
            except requests.exceptions.HTTPError as e:
                print(f"❌ Error during prediction: {e.response.text}")
                break # Break out to re-check models
            except Exception as e:
                print(f"❌ Connection error: {e}")
                break
                
            time.sleep(2)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Stream simulator stopped.")

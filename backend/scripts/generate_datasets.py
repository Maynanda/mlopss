import os
import io
import time
import requests
import numpy as np
import pandas as pd

API_URL = "http://localhost:8000/api"

def generate_house_prices(n=1000):
    np.random.seed(42)
    sqft = np.random.normal(2000, 500, n).clip(500, 5000)
    bedrooms = np.random.randint(1, 6, n)
    bathrooms = np.random.randint(1, 4, n)
    age = np.random.exponential(15, n).clip(0, 100)
    dist_city = np.random.exponential(10, n).clip(0, 50)
    
    # Base price calculation with noise
    price = (sqft * 150) + (bedrooms * 20000) + (bathrooms * 15000) - (age * 1000) - (dist_city * 3000)
    price += np.random.normal(0, 20000, n)
    price = price.clip(50000, None)
    
    df = pd.DataFrame({
        "sqft": sqft.round(0),
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "age_years": age.round(1),
        "distance_to_city_km": dist_city.round(1),
        "price": price.round(2)
    })
    return df, "house_prices_regression.csv", "Housing market data for regression"

def generate_customer_churn(n=1000):
    np.random.seed(42)
    acc_age = np.random.randint(1, 72, n)
    monthly_spend = np.random.normal(80, 30, n).clip(10, 300)
    support_tickets = np.random.poisson(1.5, n)
    login_freq = np.random.normal(15, 10, n).clip(0, 30)
    
    # Probability of churn
    prob = (support_tickets * 0.15) - (acc_age * 0.01) - (login_freq * 0.02) + (monthly_spend * 0.001)
    prob = 1 / (1 + np.exp(-prob)) # Sigmoid
    churned = (prob > 0.5).astype(int)
    
    df = pd.DataFrame({
        "account_age_months": acc_age,
        "monthly_spend": monthly_spend.round(2),
        "support_tickets": support_tickets,
        "login_frequency_days": login_freq.round(0),
        "churned": churned
    })
    return df, "customer_churn_classification.csv", "Customer behavior data for classification"

def generate_server_metrics(n=1500):
    np.random.seed(42)
    cpu = np.random.normal(40, 5, n)
    memory = np.random.normal(60, 5, n)
    net_in = np.random.normal(100, 20, n)
    net_out = np.random.normal(80, 15, n)
    
    # Inject anomalies (~5% of data)
    anomaly_idx = np.random.choice(n, int(n * 0.05), replace=False)
    cpu[anomaly_idx] += np.random.normal(40, 10, len(anomaly_idx))
    memory[anomaly_idx] += np.random.normal(30, 5, len(anomaly_idx))
    net_in[anomaly_idx] *= 5
    
    df = pd.DataFrame({
        "cpu_usage_pct": cpu.clip(0, 100).round(2),
        "memory_usage_pct": memory.clip(0, 100).round(2),
        "network_in_mb": net_in.clip(0, None).round(2),
        "network_out_mb": net_out.clip(0, None).round(2)
    })
    return df, "server_metrics_anomaly.csv", "Server telemetry data for anomaly detection"

def upload_dataset(df, filename, description):
    print(f"Uploading {filename}...")
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    
    files = {
        'file': (filename, csv_buffer.getvalue(), 'text/csv')
    }
    data = {
        'name': filename.split('.')[0],
        'description': description
    }
    
    try:
        res = requests.post(f"{API_URL}/datasets/upload", files=files, data=data)
        res.raise_for_status()
        print(f"✅ Successfully uploaded: {filename}")
    except Exception as e:
        print(f"❌ Failed to upload {filename}: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)

if __name__ == "__main__":
    print("Generating datasets...")
    datasets = [
        generate_house_prices(),
        generate_customer_churn(),
        generate_server_metrics()
    ]
    
    for df, filename, desc in datasets:
        upload_dataset(df, filename, desc)
        time.sleep(1)
        
    print("\n🎉 All dummy data generated and uploaded!")
    print("You can view them in the Datasets page: http://localhost:5173/datasets")

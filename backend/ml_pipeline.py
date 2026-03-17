import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os
import argparse

def load_and_preprocess_data(india_path, saudi_path):
    print("Loading datasets...")
    df_india = pd.read_csv(india_path)
    # Read the updated Excel file
    df_saudi = pd.read_excel(saudi_path)

    # Rename columns to be consistent and clear
    df_india.rename(columns={
        'time': 'time',
        'Air Temp': 'india_air_temp',
        'Surface Temp': 'india_surface_temp',
        'relative humidity': 'india_humidity',
        'wind speed': 'india_wind_speed',
        'precipitation': 'india_precipitation'
    }, inplace=True)

    df_saudi.rename(columns={
        'time': 'time',
        'air_temp': 'saudi_air_temp',
        'surface_temp': 'saudi_surface_temp',
        'relative_humidity': 'saudi_humidity',
        'wind_speed': 'saudi_wind_speed',
        'total_precipitation': 'saudi_precipitation'
    }, inplace=True)

    print("Aligning time formats...")
    df_india['time'] = pd.to_datetime(df_india['time']).dt.strftime('%Y-%m')
    df_saudi['time'] = pd.to_datetime(df_saudi['time']).dt.strftime('%Y-%m')

    print("Merging datasets...")
    df = pd.merge(df_saudi, df_india, on='time', how='inner')
    
    # Clean dirty data (e.g. '0..54327' in saudi_humidity)
    for col in df.columns:
        if col != 'time':
            # Remove any double dots and convert to numeric
            if df[col].dtype == object:
                df[col] = df[col].str.replace('..', '.', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Extract month from time as a feature since weather is highly seasonal
    df['month'] = pd.to_datetime(df['time']).dt.month
    
    # Drop rows with NaN
    df.dropna(inplace=True)
    
    return df

def train_model(df):
    print("Preparing features and targets...")
    # Features (Saudi Arabia data + month)
    features = ['saudi_air_temp', 'saudi_surface_temp', 'saudi_humidity', 'saudi_wind_speed', 'saudi_precipitation', 'month']
    X = df[features]
    
    # Targets (India data)
    targets = ['india_air_temp', 'india_surface_temp', 'india_humidity', 'india_wind_speed', 'india_precipitation']
    y = df[targets]
    
    # Split data 80% config
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Scaling features...")
    scaler_X = StandardScaler()
    X_train_scaled = scaler_X.fit_transform(X_train)
    X_test_scaled = scaler_X.transform(X_test)
    
    scaler_y = StandardScaler()
    y_train_scaled = scaler_y.fit_transform(y_train)
    y_test_scaled = scaler_y.transform(y_test)
    
    print("Training XGBoost Model...")
    base_model = XGBRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    
    # Predict multiple targets
    model = MultiOutputRegressor(base_model)
    model.fit(X_train_scaled, y_train_scaled)
    
    print("Evaluating Model...")
    y_pred_scaled = model.predict(X_test_scaled)
    y_pred = scaler_y.inverse_transform(y_pred_scaled)
    
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    # Average Test R2 score is our proxy for accuracy percentage
    accuracy = max(0, r2 * 100)
    
    metrics = {
        'mse': float(mse),
        'rmse': float(rmse),
        'r2': float(r2),
        'accuracy': float(accuracy)
    }
    
    print(f"Metrics: {metrics}")
    
    # Calculate Feature Importances (average across all target variables)
    feature_importances = np.mean([estimator.feature_importances_ for estimator in model.estimators_], axis=0)
    importance_dict = dict(zip(features, feature_importances.tolist()))
    
    print("Saving Models...")
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/xgb_model.pkl')
    joblib.dump(scaler_X, 'models/scaler_X.pkl')
    joblib.dump(scaler_y, 'models/scaler_y.pkl')
    
    return metrics, importance_dict

if __name__ == "__main__":
    india_path = "../final india.csv"
    saudi_path = "../saudi_arabia_climate_data.xlsx"
    df = load_and_preprocess_data(india_path, saudi_path)
    metrics, importances = train_model(df)
    print("Training completed successfully!")

# Indian Weather Predictor ☁️❄️
Predicting Indian weather patterns based on Saudi Arabian climatic data using Machine Learning (XGBoost).

## Key Features
- **High Accuracy (96.32%):** Retrained with daily climate data (2015-2026) using XGBoost.
- **Daily Predictions:** Get precise temperature, humidity, wind, and AQI forecasts for any date.
- **Seasonal Trend Analysis:** Tracks how Summer, Winter, and Rainy seasons are shifting year-over-year.
- **Unified Frontend/Backend:** React dashboard served by a FastAPI backend.
- **Interactive UI:** Glassmorphism design with charts and hourly breakdowns.

## How to Run Locally
1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn main:app --port 8001 --reload
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## How to Publish for Free (Render.com)
1.  **Push code to GitHub** (Already done).
2.  Login to [Render.com](https://render.com).
3.  Click **New +** > **Web Service**.
4.  Connect this GitHub repository.
5.  **Build Command:** `pip install -r backend/requirements.txt`
6.  **Start Command:** `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
7.  Deploy! Your app will be live on a free `.onrender.com` URL.

---
Built with FastAPI, React, and XGBoost.

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

## Deployment Options (Free)

### 1. Vercel (Recommended for Static/Serverless)
I have already added a `vercel.json` file for you.
1.  Login to [Vercel](https://vercel.com).
2.  Click **Import Project**.
3.  Choose this GitHub repository.
4.  Vercel will automatically detect the settings and deploy both the Frontend and the Python Backend!

### 2. Render.com (Recommended for persistently running APIs)
1.  Login to [Render.com](https://render.com).
2.  Click **New +** > **Web Service**.
3.  Connect this GitHub repository.
4.  **Build Command:** `pip install -r backend/requirements.txt`
5.  **Start Command:** `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
7.  Deploy! Your app will be live on a free `.onrender.com` URL.

---
Built with FastAPI, React, and XGBoost.

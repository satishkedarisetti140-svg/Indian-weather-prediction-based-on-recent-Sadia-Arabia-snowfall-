@echo off
title Indian Weather Predictor Launcher
color 0B

echo ===================================================
echo     INDIAN WEATHER PREDICTOR - STARTUP MANAGER
echo ===================================================
echo.
echo Cleaning up ports (8000, 5173) to prevent crashes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Press any key to ignite the Frontend ^& Backend...
pause >nul

echo.
echo [1/3] Booting AI Model Backend (FastAPI)...
start "Weather AI Backend" cmd /k "title Weather Backend & color 0A & cd backend & if exist venv\Scripts\python.exe (venv\Scripts\python.exe -m pip install -q fastapi uvicorn pandas openpyxl python-dotenv requests & venv\Scripts\python.exe -m uvicorn main:app --reload) else (pip install -q fastapi uvicorn pandas openpyxl python-dotenv requests & uvicorn main:app --reload)"

echo [2/3] Booting React UI Engine...
start "Weather UI Frontend" cmd /k "title Weather Frontend & color 0D & cd frontend & npm run dev"

echo [3/3] Warming up the engines... (Waiting 6 seconds)
timeout /t 6 /nobreak >nul

echo.
echo ===================================================
echo [SUCCESS] All Systems Operational!
echo Launching your dashboard natively in the browser...
start http://127.0.0.1:5173
echo ===================================================
echo.
echo You may close this window at any time. To shut down the servers, 
echo simply close the two newly opened terminal windows.
pause

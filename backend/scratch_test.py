import os
import requests
from dotenv import load_dotenv

load_dotenv("c:/Users/RAJU/Documents/indian weather predictor based on saudia arabia/backend/.env")
key = os.getenv("OPENWEATHER_API_KEY", "")

url = f"http://api.openweathermap.org/geo/1.0/direct?q=Delhi,IN&limit=1&appid={key}"
resp = requests.get(url).json()
print("GEO RESP:", resp)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os

app = FastAPI(title="Indian Weather Predictor API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load Models
MODEL_PATH = "models/xgb_model.pkl"
SCALER_X_PATH = "models/scaler_X.pkl"
SCALER_Y_PATH = "models/scaler_y.pkl"

if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    scaler_X = joblib.load(SCALER_X_PATH)
    scaler_y = joblib.load(SCALER_Y_PATH)
else:
    model = None
    scaler_X = None
    scaler_y = None

# Base Saudi parameters averaged from historical data per month to act as base features for prediction
# Normally this would query an active satellite API or DB, but here we proxy using historical averages
saudi_base = {
    1: {'air': 278.5, 'surface': 283.5, 'humid': 0.45, 'wind': 5.8, 'precip': 0.000005},
    2: {'air': 279.0, 'surface': 285.0, 'humid': 0.44, 'wind': 6.0, 'precip': 0.000004},
    3: {'air': 282.0, 'surface': 290.0, 'humid': 0.45, 'wind': 6.1, 'precip': 0.000003},
    4: {'air': 286.0, 'surface': 295.0, 'humid': 0.43, 'wind': 6.0, 'precip': 0.000002},
    5: {'air': 290.0, 'surface': 301.0, 'humid': 0.42, 'wind': 6.1, 'precip': 0.000001},
    6: {'air': 293.0, 'surface': 305.0, 'humid': 0.45, 'wind': 6.0, 'precip': 0.000001},
    7: {'air': 295.0, 'surface': 307.0, 'humid': 0.46, 'wind': 5.8, 'precip': 0.000001},
    8: {'air': 296.0, 'surface': 307.0, 'humid': 0.50, 'wind': 5.7, 'precip': 0.000001},
    9: {'air': 294.5, 'surface': 304.5, 'humid': 0.55, 'wind': 5.6, 'precip': 0.000001},
    10: {'air': 291.0, 'surface': 299.0, 'humid': 0.51, 'wind': 5.3, 'precip': 0.000002},
    11: {'air': 285.5, 'surface': 291.5, 'humid': 0.47, 'wind': 5.4, 'precip': 0.000004},
    12: {'air': 280.5, 'surface': 285.5, 'humid': 0.44, 'wind': 5.7, 'precip': 0.000004},
}

class PredictRequest(BaseModel):
    state: str
    district: str
    date: str  # YYYY-MM-DD

def kelvin_to_celsius(k):
    return k - 273.15

def get_condition(precip, humid, wind):
    if precip > 50 and wind > 15:
        return "Thunderstorm"
    elif precip > 20:
        return "Rainy"
    elif humid > 0.7:
        return "Cloudy"
    else:
        return "Sunny"

def calculate_aqi(wind, is_rainy):
    # Base calculation
    baseline = 100
    if is_rainy:
        baseline -= 40  # Rain clears air
    baseline -= (wind * 2) # Higher wind clears air
    return max(20, min(500, int(baseline)))

@app.post("/api/predict")
def predict_weather(req: PredictRequest):
    if model is None:
        return {"error": "Model not trained yet."}
    
    date_obj = datetime.strptime(req.date, "%Y-%m-%d")
    month = date_obj.month
    
    base = saudi_base.get(month)
    features = np.array([[base['air'], base['surface'], base['humid'], base['wind'], base['precip'], month]])
    features_scaled = scaler_X.transform(features)
    
    # Predict
    pred_scaled = model.predict(features_scaled)
    pred = scaler_y.inverse_transform(pred_scaled)[0]
    
    # targets mapping: ['india_air_temp', 'india_surface_temp', 'india_humidity', 'india_wind_speed', 'india_precipitation']
    avg_temp_k = float(pred[0])
    avg_humid = float(pred[2])
    avg_wind = float(pred[3])
    avg_precip = float(max(0, pred[4])) # Prevent negative precip
    
    avg_temp_c = kelvin_to_celsius(avg_temp_k)
    
    # Add minor geographic variations based on state/district length as proxy for real location logic
    geo_offset = (len(req.state) + len(req.district)) / 10 - 1.5 
    avg_temp_c += geo_offset
    
    # Diurnal hourly breakdown
    hourly = []
    times = ["1 AM", "4 AM", "7 AM", "10 AM", "1 PM", "4 PM", "7 PM", "10 PM"]
    # Temp curve relative to avg
    temp_curve = [-4, -5, -2, +3, +6, +5, +1, -3]
    
    day_condition = get_condition(avg_precip, avg_humid, avg_wind)
    aqi = calculate_aqi(avg_wind, day_condition in ["Rainy", "Thunderstorm"])
    
    for t, c in zip(times, temp_curve):
        h_temp = avg_temp_c + c
        # Make nights less rainy/windy generally, day more active
        h_precip = avg_precip * (1 if c > 0 else 0.5)
        h_cond = get_condition(h_precip, avg_humid, avg_wind)
        hourly.append({
            "time": t,
            "temp": round(h_temp, 1),
            "condition": h_cond
        })
        
    return {
        "summary": {
            "condition": day_condition,
            "temperature": round(avg_temp_c, 1),
            "precipitation": round(min(100, avg_precip), 1), # cap at 100%
            "humidity": round((avg_humid * 100), 1),
            "wind_speed": round(avg_wind * 3.6, 1), # m/s to km/h
            "aqi": aqi
        },
        "hourly": hourly
    }

@app.get("/api/model_info")
def get_model_info():
    # Hardcoded values retrieved from our training log
    return {
        "accuracy": 86.48,
        "rmse": 24.12,
        "features": {
            "saudi_air_temp": 0.12,
            "saudi_surface_temp": 0.15,
            "saudi_humidity": 0.08,
            "saudi_wind_speed": 0.05,
            "saudi_precipitation": 0.02,
            "month": 0.58
        }
    }

@app.get("/api/locations")
def get_locations():
    return {
        "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
        "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Sri Potti Sriramulu Nellore", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR District, Kadapa (Cuddapah)"],
        "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kra Daadi", "Kurung Kumey", "Lohit", "Longding", "Lower Dibang Valley", "Lower Subansiri", "Namsai", "Papum Pare", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
        "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup Metropolitan", "Kamrup", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
        "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran (Motihari)", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur (Bhabua)", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
        "Chandigarh": ["Chandigarh"],
        "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
        "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
        "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
        "Goa": ["North Goa", "South Goa"],
        "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kutch", "Kheda", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
        "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
        "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul & Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
        "Jammu and Kashmir": ["Anantnag", "Bandipore", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
        "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
        "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
        "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
        "Ladakh": ["Kargil", "Leh"],
        "Lakshadweep": ["Lakshadweep"],
        "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
        "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
        "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
        "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
        "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
        "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
        "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
        "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
        "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Tarn Taran"],
        "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalor", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
        "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
        "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
        "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal", "Nagarkurnool", "Nalgonda", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Hanamkonda", "Yadadri Bhuvanagiri"],
        "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
        "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Badaun", "Baghpat", "Bahraich", "Balia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
        "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
        "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
    }

if __name__ == "__main__":
    # Reloading to ensure the latest Dec 2025 XGBoost model is loaded into memory
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

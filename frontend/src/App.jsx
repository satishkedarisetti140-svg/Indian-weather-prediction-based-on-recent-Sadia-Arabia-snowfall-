import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CloudSun, CloudRain, CloudLightning, Sun, Wind, Droplets, 
  Thermometer, Activity, MapPin, Calendar, CheckCircle2, ChevronDown,
  TrendingUp, TrendingDown, Snowflake, CloudDrizzle, Moon
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler
);

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000/api");

const WeatherBackground = ({ condition }) => {
  if (!condition) return <div className="weather-bg-layer" />;
  
  const cond = condition.toLowerCase();
  
  const isNight = cond.includes('night');
  const isSunny = !isNight && (cond.includes('sun') || cond.includes('clear') || cond.includes('hot'));
  const isRainy = cond.includes('rain') || cond.includes('thunder') || cond.includes('drizzle') || cond.includes('storm');
  const isCloudy = cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze');

  // Determine video source
  let videoSrc = "";
  if (isNight) videoSrc = ""; // Safely blank for night to allow dark CSS theme to shine
  else if (isSunny) videoSrc = "/videos/sunny_v2.mp4";
  else if (isRainy) videoSrc = "/videos/rainy_v2.mp4";
  else if (isCloudy) videoSrc = "/videos/cloudy_v2.mp4";

  return (
    <div className="weather-bg-layer">
      {videoSrc && (
        <video 
          key={videoSrc}
          autoPlay 
          loop 
          muted 
          playsInline
          className="bg-video"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Layered 3D FX on top of video */}
      <div className="fx-layer">
        {isSunny && (
          <>
            <div className="rising-sun" />
            <div className="rising-sun" style={{ width: '60vw', height: '60vw', opacity: 0.3, filter: 'blur(40px)' }} />
          </>
        )}
        
        {isRainy && (
          <div className="rain-container">
            {[...Array(30)].map((_, i) => (
              <div 
                key={`drop-${i}`} 
                className="drop" 
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.3 + Math.random() * 0.4}s`,
                  opacity: 0.15
                }} 
              />
            ))}
          </div>
        )}

        {isCloudy && (
          <div className="smoke-layer">
            {[...Array(8)].map((_, i) => (
              <div 
                key={`smoke-${i}`} 
                className="smoke-particle" 
                style={{
                  top: `${Math.random() * 120 - 10}%`,
                  left: `${Math.random() * 120 - 10}%`,
                  width: `${400 + Math.random() * 600}px`,
                  height: `${300 + Math.random() * 500}px`,
                  animationDelay: `${Math.random() * 20}s`,
                  animationDuration: `${25 + Math.random() * 30}s`,
                  opacity: 0.2
                }} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Animated Emoji Component
const AnimatedEmoji = ({ condition }) => {
  if (!condition) return null;
  const c = condition.toLowerCase();
  
  if (c.includes('sun') || c === 'clear sky') {
    return <span className="animated-emoji emoji-sunny">☀️</span>;
  } else if (c.includes('night') || c === 'clear') {
    return <span className="animated-emoji emoji-night">🌙</span>;
  } else if (c.includes('rain') || c.includes('thunder') || c.includes('drizzle') || c.includes('shower')) {
    return <span className="animated-emoji emoji-rainy">⛈️</span>;
  } else if (c.includes('cloud') || c.includes('overcast')) {
    return <span className="animated-emoji emoji-cloudy">☁️</span>;
  } else if (c.includes('snow')) {
    return <span className="animated-emoji emoji-cloudy">❄️</span>;
  }
  return <span className="animated-emoji emoji-cloudy">🌤️</span>;
};

function App() {
  const [activeTab, setActiveTab] = useState('forecast'); // 'forecast' | 'model'
  
  const [locations, setLocations] = useState({});
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  const [weatherData, setWeatherData] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [seasonalTrends, setSeasonalTrends] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Fetch locations
    axios.get(`${API_URL}/locations`)
      .then(res => setLocations(res.data))
      .catch(err => console.error(err));

    // Fetch model info initially
    axios.get(`${API_URL}/model_info`)
      .then(res => setModelInfo(res.data))
      .catch(err => console.error(err));

    // Fetch seasonal trends
    axios.get(`${API_URL}/seasonal_trends`)
      .then(res => setSeasonalTrends(res.data))
      .catch(err => console.error(err));
  }, []);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!selectedState || !selectedDistrict || !selectedDate) {
      setError("Please select all fields.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/predict`, {
        state: selectedState,
        district: selectedDistrict,
        date: selectedDate
      });
      if (response.data.error) throw new Error(response.data.error);
      setWeatherData(response.data);
      setActiveTab('forecast');
    } catch (err) {
      setError(err.message || "Failed to fetch prediction");
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition, size = 24) => {
    const cond = (condition || '').toLowerCase();
    if (cond.includes('sun') || cond.includes('clear') || cond.includes('hot')) 
      return <Sun size={size} color="#fcd34d" />;
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('storm')) 
      return <CloudRain size={size} color="#60a5fa" />;
    if (cond.includes('thunder') || cond.includes('lightning')) 
      return <CloudLightning size={size} color="#a78bfa" />;
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze')) 
      return <CloudSun size={size} color="#94a3b8" />;
    return <Sun size={size} color="#fcd34d" />;
  };

  const renderForecastTab = () => {
    if (!weatherData) return (
      <div className="empty-state glass-panel">
        <Sun size={64} className="empty-state-icon" />
        <h2>No Prediction Yet</h2>
        <p>Select a location and future date to see the AI prediction based on Saudi Arabia weather patterns.</p>
      </div>
    );

    const { summary, hourly } = weatherData;

    return (
      <div className="forecast-content">
        <div className="glass-panel main-weather-panel">
          <div className="main-weather">
            <div>
              <div className="temp-large">{summary.temperature || summary.temp}°C</div>
              <div className="condition-large" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {summary.condition}
                <AnimatedEmoji condition={summary.condition} />
              </div>
            </div>
            <div className="weather-icon-large">
              {getWeatherIcon(summary.condition, 100)}
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <Droplets className="icon" size={28} />
              <div className="value">{summary.precipitation}%</div>
              <div className="label">Precipitation</div>
            </div>
            <div className="metric-card">
              <Thermometer className="icon" size={28} />
              <div className="value">{summary.humidity}%</div>
              <div className="label">Humidity</div>
            </div>
            <div className="metric-card">
              <Wind className="icon" size={28} />
              <div className="value">{summary.wind_speed} <span style={{fontSize:'1rem'}}>km/h</span></div>
              <div className="label">Wind Speed</div>
            </div>
            <div className="metric-card">
              <Activity className="icon" size={28} />
              <div className="value">{summary.aqi}</div>
              <div className="label">AQI</div>
            </div>
          </div>

          <div className="hourly-container">
            <h3 className="hourly-title">Time-Based Daily Forecast (Every 3 Hours)</h3>
            <div className="hourly-scroller">
              {hourly.map((hour, i) => (
                <div key={i} className="hourly-card glass-panel">
                <div className="time">{hour.time}</div>
                <div className="temp">{hour.temp}°C</div>
                <div className="hourly-condition">
                  {hour.condition}
                  <AnimatedEmoji condition={hour.condition} />
                </div>
                <div className="precip">
                  <Droplets size={14} className="icon-accent" />
                  {hour.precip}mm
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Hourly Chart */}
        <div className="glass-panel" style={{marginTop: '2rem'}}>
          <h3 style={{marginBottom: '1rem'}}>Temperature Trend</h3>
          <div className="chart-container">
            <Line 
              data={{
                labels: hourly.map(h => h.time),
                datasets: [{
                  label: 'Temperature (°C)',
                  data: hourly.map(h => h.temp),
                  borderColor: '#38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                  y: { grid: { color: 'rgba(255,255,255,0.1)' } },
                  x: { grid: { color: 'rgba(255,255,255,0.1)' } }
                },
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderModelTab = () => {
    if (!modelInfo) return <div className="glass-panel">Loading model info...</div>;

    const featureKeys = Object.keys(modelInfo.features);
    const featureVals = Object.values(modelInfo.features);

    return (
      <div className="model-content">
        <div className="model-info-grid">
          <div className="glass-panel">
            <h3>XGBoost Model Stats</h3>
            <div style={{marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--text-secondary)'}}>Algorithm</span>
                <span style={{fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <CheckCircle2 size={18} color="var(--accent)" /> XGBoost Regressor
                </span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--text-secondary)'}}>Prediction Accuracy</span>
                <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80'}}>
                  {modelInfo.accuracy}%
                </span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--text-secondary)'}}>RMSE</span>
                <span style={{fontWeight: 'bold'}}>{modelInfo.rmse}</span>
              </div>
            </div>
            
            <p style={{marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5'}}>
              The model learns patterns between snowfall-related atmospheric parameters in Saudi Arabia and weather conditions in India using historical datasets from NASA Giovanni.
            </p>
          </div>

          <div className="glass-panel">
            <h3>Feature Importance</h3>
            <div className="chart-container" style={{height: '250px'}}>
              <Bar 
                data={{
                  labels: featureKeys,
                  datasets: [{
                    label: 'Importance Score',
                    data: featureVals,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: { 
                    x: { grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { grid: { display: false } }
                  },
                  plugins: {
                    legend: { display: false }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSeasonalTab = () => {
    if (!seasonalTrends) return <div className="glass-panel">Loading seasonal trends...</div>;

    const seasonIcons = {
      Summer: <Sun size={28} color="#fbbf24" />,
      Winter: <Snowflake size={28} color="#60a5fa" />,
      Rainy: <CloudDrizzle size={28} color="#34d399" />
    };
    const seasonColors = {
      Summer: '#fbbf24',
      Winter: '#60a5fa',
      Rainy: '#34d399'
    };

    return (
      <div className="seasonal-content">
        <div className="seasonal-cards-grid">
          {['Summer', 'Winter', 'Rainy'].map(season => {
            const data = seasonalTrends[season];
            if (!data) return null;
            const isIncreasing = data.temp_trend === 'increasing';
            return (
              <div key={season} className="glass-panel seasonal-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem'}}>
                  {seasonIcons[season]}
                  <h3 style={{margin: 0}}>{season} Season</h3>
                </div>

                <div className="trend-row">
                  <span className="trend-label">Temperature</span>
                  <span className={`trend-badge ${isIncreasing ? 'trend-up' : 'trend-down'}`}>
                    {isIncreasing ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isIncreasing ? '+' : ''}{data.temp_total_change}°C
                  </span>
                </div>
                <div className="trend-detail">{Math.abs(data.temp_slope_per_year).toFixed(3)}°C / year</div>

                <div className="trend-row">
                  <span className="trend-label">Precipitation</span>
                  <span className={`trend-badge ${data.precip_trend === 'increasing' ? 'trend-up' : 'trend-down'}`}>
                    {data.precip_trend === 'increasing' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {data.precip_trend}
                  </span>
                </div>

                <div className="trend-row">
                  <span className="trend-label">Humidity</span>
                  <span className={`trend-badge ${data.humid_trend === 'increasing' ? 'trend-up' : 'trend-down'}`}>
                    {data.humid_trend === 'increasing' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {data.humid_trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Yearly Temperature Chart */}
        <div className="glass-panel" style={{marginTop: '2rem'}}>
          <h3 style={{marginBottom: '1rem'}}>Yearly Average Temperature by Season (2015-2026)</h3>
          <div className="chart-container">
            <Line
              data={{
                labels: seasonalTrends.Summer?.yearly_data?.map(d => d.year) || [],
                datasets: ['Summer', 'Winter', 'Rainy'].map(season => ({
                  label: season,
                  data: seasonalTrends[season]?.yearly_data?.map(d => d.avg_temp) || [],
                  borderColor: seasonColors[season],
                  backgroundColor: seasonColors[season] + '33',
                  tension: 0.4,
                  fill: false,
                  pointRadius: 4
                }))
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    title: { display: true, text: 'Temperature (°C)', color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                  },
                  x: {
                    title: { display: true, text: 'Year', color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                  }
                },
                plugins: {
                  legend: { labels: { color: '#e2e8f0' } }
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <button 
        className="theme-toggle" 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <WeatherBackground condition={weatherData?.summary?.condition} />
      <div className="app-container">
      <header>
        <h1>Indian Weather Predictor</h1>
        <p>AI Predictions based on Saudi Arabia Atmospheric Patterns</p>
      </header>

      <div className="dashboard-grid">
        {/* Sidebar Controls */}
        <div className="controls-sidebar">
          <div className="glass-panel">
            <h2 style={{marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <MapPin size={20} /> Setup Prediction
            </h2>
            
            <form onSubmit={handlePredict}>
              <div className="form-group">
                <label>Select State in India</label>
                <select 
                  value={selectedState} 
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict('');
                  }}
                  required
                >
                  <option value="">-- Choose State --</option>
                  {Object.keys(locations).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select District</label>
                <select 
                  value={selectedDistrict} 
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedState}
                  required
                >
                  <option value="">-- Choose District --</option>
                  {selectedState && locations[selectedState] && locations[selectedState].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Future Date</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} // Future dates only
                  required
                />
              </div>

              {error && <div style={{color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem'}}>{error}</div>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Predicting...' : 'Generate Prediction'}
              </button>
            </form>
          </div>
        </div>

        {/* Main Dashboard Area */}
        <div className="dashboard-main">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveTab('forecast')}
            >
              Weather Forecast
            </button>
            <button 
              className={`tab ${activeTab === 'model' ? 'active' : ''}`}
              onClick={() => setActiveTab('model')}
            >
              Model Information
            </button>
            <button 
              className={`tab ${activeTab === 'seasonal' ? 'active' : ''}`}
              onClick={() => setActiveTab('seasonal')}
            >
              Seasonal Trends
            </button>
          </div>

          {activeTab === 'forecast' && renderForecastTab()}
          {activeTab === 'model' && renderModelTab()}
          {activeTab === 'seasonal' && renderSeasonalTab()}
        </div>
        </div>
        
        {/* Profile Footer */}
        <div style={{ textAlign: 'center', padding: '1.5rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>Developed with ❤️ by RAJU</p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
            <a href="https://linkedin.com/in/yourusername" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              LinkedIn
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;

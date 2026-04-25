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

const API_URL = import.meta.env.VITE_API_URL || "https://weather-predictor-tup1.onrender.com/api";

const WeatherBackground = ({ condition }) => {
  if (!condition) return <div className="weather-bg-layer" />;

  const cond = condition.toLowerCase();

  const isNight = cond.includes('night');
  const isSunny = !isNight && (cond.includes('sun') || cond.includes('clear') || cond.includes('hot') || cond.includes('few clouds') || cond.includes('scattered clouds'));
  const isRainy = cond.includes('rain') || cond.includes('thunder') || cond.includes('drizzle') || cond.includes('storm');
  const isCloudy = !isSunny && (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze'));

  // Determine video source
  let videoSrc = "";
  if (isNight) videoSrc = ""; // Safely blank for night to allow dark CSS theme to shine
  else if (isSunny) videoSrc = "/videos/sunny_v2.mp4";
  else if (isRainy) videoSrc = "/videos/rainy_v2.mp4";
  else if (isCloudy) videoSrc = "/videos/cloudy_v2.mp4";

  return (
    <div className={`weather-bg-layer ${isSunny ? 'sunny-bg' : ''}`}>
      {videoSrc && (
        <video
          key={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className={`bg-video ${isSunny ? 'sunny-video' : ''}`}
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

  if (c === 'clear night' || c.includes('night')) {
    return <span className="animated-emoji emoji-night">🌙</span>;
  } else if (c.includes('sun') || c.includes('clear') || c.includes('few clouds') || c.includes('scattered clouds')) {
    return <span className="animated-emoji emoji-sunny">☀️</span>;
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
  const [loading, setLoading] = useState(true);
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
    if (cond === 'clear night' || cond.includes('night'))
      return <Moon size={size} color="#94a3b8" />;
    if (cond.includes('sun') || cond.includes('clear') || cond.includes('hot') || cond.includes('few clouds') || cond.includes('scattered clouds'))
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
              <div className="value">{summary.wind_speed} <span style={{ fontSize: '1rem' }}>km/h</span></div>
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
        <div className="glass-panel" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Temperature Trend</h3>
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
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Algorithm</span>
                <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="var(--accent)" /> XGBoost Regressor
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Prediction Accuracy</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>
                  {modelInfo.accuracy}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>RMSE</span>
                <span style={{ fontWeight: 'bold' }}>{modelInfo.rmse}</span>
              </div>
            </div>

            <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              The model learns patterns between snowfall-related atmospheric parameters in Saudi Arabia and weather conditions in India using historical datasets from NASA Giovanni.
            </p>
          </div>

          <div className="glass-panel">
            <h3>Feature Importance</h3>
            <div className="chart-container" style={{ height: '250px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
                  {seasonIcons[season]}
                  <h3 style={{ margin: 0 }}>{season} Season</h3>
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
        <div className="glass-panel" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Yearly Average Temperature by Season (2015-2026)</h3>
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
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} /> Setup Prediction
              </h2>

              <form /*onSubmit={handlePredict}*/>
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

                {error && <div style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                <button type="submit" className="btn-primary" onClick={handlePredict} disabled={loading}>
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

        {/* End of app-container */}
      </div>

      <style>
        {`
          .footer-section {
            position: relative;
            margin-top: 5rem;
            background: var(--glass-bg);
            backdrop-filter: blur(30px) saturate(180%);
            -webkit-backdrop-filter: blur(30px) saturate(180%);
            border-top: 1px solid var(--glass-border);
            padding: 4rem 5% 1.5rem;
            z-index: 10;
          }
          .footer-wavy-top {
            position: absolute;
            top: -99px; left: 0; width: 100%; height: 100px;
            display: block;
            pointer-events: none;
          }
          .footer-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 3rem;
            justify-content: space-between;
            max-width: 1400px;
            margin: 0 auto;
          }
          .footer-cols {
            display: flex;
            flex: 1;
            flex-wrap: wrap;
            gap: 3rem;
            justify-content: space-between;
            width: 100%;
          }
          .footer-col {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            min-width: 120px;
          }
          .footer-heading {
            color: var(--text-primary);
            margin: 0 0 0.5rem 0;
            font-size: 1rem;
            font-weight: 600;
          }
          .footer-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            transition: color 0.3s ease;
          }
          .footer-link:hover {
            color: var(--accent);
          }
          .footer-newsletter {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            min-width: 300px;
          }
          .footer-socials {
            display: flex;
            gap: 15px;
            align-items: center;
          }
          .social-icon {
            color: var(--text-primary);
            transition: color 0.3s, transform 0.3s;
          }
          .social-icon:hover {
            color: var(--accent);
            transform: translateY(-2px);
          }
          .footer-bottom {
            max-width: 1400px;
            margin: 3rem auto 0;
            padding-top: 2rem;
            border-top: 1px solid var(--glass-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
          }
        `}
      </style>

      <footer className="footer-section">
        {/* Wavy top border matching Olipop */}
        <svg className="footer-wavy-top" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path fill="var(--glass-bg)" fillOpacity="1" d="M0,32L80,37.3C160,43,320,53,480,53.3C640,53,800,43,960,37.3C1120,32,1280,32,1360,32L1440,32L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z" style={{ backdropFilter: 'blur(30px) saturate(180%)' }} />
          <path stroke="var(--glass-border)" strokeWidth="1" fill="none" d="M0,32L80,37.3C160,43,320,53,480,53.3C640,53,800,43,960,37.3C1120,32,1280,32,1360,32L1440,32" />
        </svg>

        <div className="footer-grid">
          <div className="footer-cols">
            <div className="footer-col">
              <h4 className="footer-heading">Predictor</h4>
              <a href="#" className="footer-link">Current Weather</a>
              <a href="#" className="footer-link">Hourly Forecast</a>
              <a href="#" className="footer-link">5-Day Forecast</a>
              <a href="#" className="footer-link">Interactive Map</a>
              <a href="#" className="footer-link">Climate Trends</a>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Models</h4>
              <a href="#" className="footer-link">XGBoost Details</a>
              <a href="#" className="footer-link">Algorithm Stats</a>
              <a href="#" className="footer-link">Data Sources</a>
              <a href="#" className="footer-link">Performance Metrics</a>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">About Us</h4>
              <a href="https://github.com/rajukedarisetti/weather-predictor" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                GitHub
              </a>
              <a href="https://www.linkedin.com/in/raju-kedarisetti-ba2696327?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                LinkedIn
              </a>
              <a href="https://wa.me/919948712312" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.393.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z" /></svg>
                Contact
              </a>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Legal</h4>
              <a href="#" className="footer-link">Terms of Service</a>
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Cookie Policy</a>
              <a href="#" className="footer-link">Licenses</a>
            </div>
          </div>


        </div>

        <div className="footer-bottom">
          <div>&copy; {new Date().getFullYear()} Indian Weather Predictor. All Rights Reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Do Not Sell My Information</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

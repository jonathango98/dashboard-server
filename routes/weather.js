const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/weather?lat=&lon=
router.get('/', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Weather API key not configured' });
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat, lon, appid: apiKey, units: 'imperial' },
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: { lat, lon, appid: apiKey, units: 'imperial', cnt: 8 },
      }),
    ]);

    const current = currentRes.data;
    const forecast = forecastRes.data;

    // High/low from the next 24h of forecast entries
    const temps = forecast.list.map((entry) => entry.main.temp);
    const high = Math.round(Math.max(...temps));
    const low = Math.round(Math.min(...temps));

    res.json({
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      high,
      low,
      condition: current.weather[0].main,
      icon: current.weather[0].icon,
      city: current.name,
    });
  } catch (err) {
    console.error('Weather proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch weather data' });
  }
});

module.exports = router;

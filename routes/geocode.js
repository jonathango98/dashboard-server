const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/geocode?q=city+name
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Weather API key not configured' });

  try {
    const result = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
      params: { q, limit: 5, appid: apiKey },
    });
    res.json(result.data.map((p) => ({
      name: p.name,
      state: p.state,
      country: p.country,
      lat: p.lat,
      lon: p.lon,
    })));
  } catch (err) {
    console.error('Geocode error:', err.message);
    res.status(502).json({ error: 'Failed to geocode location' });
  }
});

module.exports = router;

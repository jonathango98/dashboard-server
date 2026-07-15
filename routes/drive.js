const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/drive?destination=&origin=
// origin is optional; falls back to IP-based geolocation via the Maps API
router.get('/', async (req, res) => {
  const { destination, origin } = req.query;

  if (!destination) {
    return res.status(400).json({ error: 'destination is required' });
  }

  const apiKey = process.env.GMAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Maps API key not configured' });
  }

  try {
    const params = {
      destination,
      key: apiKey,
      departure_time: 'now',
      traffic_model: 'best_guess',
    };

    if (origin) {
      params.origin = origin;
    } else {
      const geo = await axios.post(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`,
        { considerIp: true }
      );
      const { lat, lng } = geo.data.location;
      params.origin = `${lat},${lng}`;
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params,
    });

    const data = response.data;

    if (data.status !== 'OK') {
      return res.status(502).json({ error: `Maps API error: ${data.status}` });
    }

    const leg = data.routes[0].legs[0];
    const normalDuration = leg.duration.value;           // seconds
    const trafficDuration = leg.duration_in_traffic?.value ?? normalDuration;
    const ratio = trafficDuration / normalDuration;

    let trafficCondition;
    if (ratio < 1.2) trafficCondition = 'light';
    else if (ratio < 1.5) trafficCondition = 'moderate';
    else trafficCondition = 'heavy';

    res.json({
      eta: Math.round(trafficDuration / 60),          // minutes
      distance: leg.distance.text,
      trafficCondition,
    });
  } catch (err) {
    console.error('Drive proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch directions data' });
  }
});

module.exports = router;

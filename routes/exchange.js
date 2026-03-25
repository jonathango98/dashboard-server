const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/exchange?from=USD&to=EUR
router.get('/', async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  try {
    const response = await axios.get('https://api.frankfurter.app/latest', {
      params: { from: from.toUpperCase(), to: to.toUpperCase() },
    });

    const rate = response.data.rates[to.toUpperCase()];
    if (rate === undefined) {
      return res.status(400).json({ error: 'Invalid currency pair' });
    }

    res.json({ from: from.toUpperCase(), to: to.toUpperCase(), rate });
  } catch (err) {
    console.error('Exchange proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch exchange rate' });
  }
});

module.exports = router;

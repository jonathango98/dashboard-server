require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const weatherRouter = require('./routes/weather');
const driveRouter = require('./routes/drive');
const geocodeRouter = require('./routes/geocode');
const bibleRouter = require('./routes/bible');
const exchangeRouter = require('./routes/exchange');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limit for external API proxies: 30 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(globalLimiter);

app.use('/api/weather', apiLimiter, weatherRouter);
app.use('/api/drive', apiLimiter, driveRouter);
app.use('/api/geocode', apiLimiter, geocodeRouter);
app.use('/api/bible', bibleRouter);
app.use('/api/exchange', apiLimiter, exchangeRouter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

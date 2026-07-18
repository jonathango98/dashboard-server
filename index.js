require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const weatherRouter = require('./routes/weather');
const driveRouter = require('./routes/drive');
const geocodeRouter = require('./routes/geocode');
const bibleRouter = require('./routes/bible');
const exchangeRouter = require('./routes/exchange');
const gradientRouter = require('./routes/gradient');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway terminates TLS at a single proxy hop; without this, express-rate-limit
// keys every client by the proxy's IP and logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// ALLOWED_ORIGIN accepts a comma-separated list, e.g. "https://a.com,https://b.com"
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
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

// Gemini calls cost API quota — keep this tighter than the general proxy limit
const gradientLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' },
});

app.use(globalLimiter);

app.use('/api/weather', apiLimiter, weatherRouter);
app.use('/api/drive', apiLimiter, driveRouter);
app.use('/api/geocode', apiLimiter, geocodeRouter);
app.use('/api/bible', bibleRouter);
app.use('/api/exchange', apiLimiter, exchangeRouter);
app.use('/api/gradient', gradientLimiter, gradientRouter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

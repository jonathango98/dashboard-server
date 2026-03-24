require('dotenv').config();
const express = require('express');
const cors = require('cors');

const weatherRouter = require('./routes/weather');
const driveRouter = require('./routes/drive');
const geocodeRouter = require('./routes/geocode');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/weather', weatherRouter);
app.use('/api/drive', driveRouter);
app.use('/api/geocode', geocodeRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

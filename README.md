# Dashboard Backend

A lightweight Express API proxy that securely forwards requests to third-party APIs (OpenWeatherMap, Google Maps, Bible verse scraper) without exposing API keys to the client.

## Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Key packages:** `axios`, `cors`, `dotenv`, `express-rate-limit`

## Endpoints

| Method | Path | Query Params | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/weather` | `lat`, `lon` | Current weather + high/low from OpenWeatherMap |
| `GET` | `/api/geocode` | `q` | Resolve city name → lat/lon |
| `GET` | `/api/drive` | `origin`, `destination` | Drive ETA + traffic via Google Maps Directions |
| `GET` | `/api/bible` | `translation` (`niv`/`nlt`/`esv`) | Daily Bible verse (scraped from dailyverses.net) |
| `GET` | `/health` | — | Health check |

Rate limits: 100 req/15 min globally, 30 req/15 min per API route.

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Configure environment variables**

Copy `.env.example` to `.env` and fill in your keys:

```env
OPENWEATHERMAP_API_KEY=your_openweathermap_key
GMAPS_API_KEY=your_google_maps_key
ALLOWED_ORIGIN=http://localhost:5173   # Frontend origin(s) for CORS, comma-separated
PORT=3001
```

**3. Run**
```bash
npm run dev    # Development (hot reload via --watch)
npm start      # Production
```

Server runs on `http://localhost:3001` by default.

## API Keys

| Key | Where to get |
|-----|-------------|
| `OPENWEATHERMAP_API_KEY` | [openweathermap.org/api](https://openweathermap.org/api) — free tier works |
| `GMAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) — enable Directions API |

## Deployment

Deployed on [Railway](https://railway.app). Pushes to `main` auto-deploy. Set environment variables in the Railway project dashboard.

const express = require('express');
const axios = require('axios');
const router = express.Router();

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_PROMPT_LEN = 200;

// Structured-output schema: force Gemini to return { colors: [4 hex strings] }
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    colors: {
      type: 'ARRAY',
      description: 'Exactly 4 hex color strings (e.g. "#A1B2C3") forming a harmonious palette.',
      items: { type: 'STRING' },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ['colors'],
};

function buildPrompt(userPrompt) {
  return `You are a color palette designer choosing colors for a smooth, blurry mesh gradient background.
Given a short scene or mood description, pick exactly 4 aesthetically harmonious hex colors (6-digit, e.g. "#A1B2C3") that visually capture that mood — consider lighting, time of day, and emotional tone. Favor colors that blend pleasingly into a gradient together (avoid harsh clashing hues unless the prompt calls for it).
Scene: "${userPrompt}"
Return only the 4 hex colors.`;
}

// Extract and validate the model's JSON payload. Exported for standalone testing.
function parseGeminiResponse(data) {
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (!candidate) {
    throw new Error('Gemini returned no candidates');
  }
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Gemini generation did not complete (finishReason: ${finishReason})`);
  }

  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini response missing text payload');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini response was not valid JSON');
  }

  const colors = parsed?.colors;
  if (!Array.isArray(colors) || colors.length !== 4) {
    throw new Error('Gemini did not return exactly 4 colors');
  }

  const normalized = colors.map((c) => (typeof c === 'string' ? c.trim() : c));
  if (!normalized.every((c) => typeof c === 'string' && HEX_RE.test(c))) {
    throw new Error('Gemini returned invalid hex color values');
  }

  return normalized;
}

// POST /api/gradient  { prompt: string } -> { colors: ["#aabbcc", ...] }
router.post('/', async (req, res) => {
  const { prompt } = req.body || {};

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return res.status(400).json({ error: `prompt must be ${MAX_PROMPT_LEN} characters or fewer` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [{ parts: [{ text: buildPrompt(prompt.trim()) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        timeout: 15000,
      }
    );

    const colors = parseGeminiResponse(response.data);
    res.json({ colors });
  } catch (err) {
    if (err.response) {
      console.error('Gemini API error:', err.response.status, err.response.data);
    } else {
      console.error('Gradient generation error:', err.message);
    }
    res.status(502).json({ error: 'Failed to generate gradient colors' });
  }
});

module.exports = router;
module.exports.parseGeminiResponse = parseGeminiResponse;

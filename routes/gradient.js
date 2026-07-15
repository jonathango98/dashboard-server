const express = require('express');
const axios = require('axios');

const router = express.Router();

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_PROMPT_LEN = 200;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    colors: {
      type: 'ARRAY',
      description:
        'Exactly 4 hex color strings forming a harmonious mesh gradient palette.',
      items: {
        type: 'STRING',
      },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ['colors'],
};

function buildPrompt(userPrompt) {
  return `
You are a professional color palette designer.

Create exactly 4 harmonious hex colors for a smooth blurry mesh gradient background.

Consider:
- mood
- lighting
- atmosphere
- time of day
- emotional tone

Colors should blend naturally together.
Avoid harsh combinations unless the scene requires it.

Scene:
"${userPrompt}"

Return only JSON:
{
  "colors": [
    "#AABBCC",
    "#DDEEFF",
    "#112233",
    "#445566"
  ]
}
`;
}

function parseGeminiResponse(data) {
  const candidate = data?.candidates?.[0];

  if (!candidate) {
    throw new Error('Gemini returned no candidates');
  }

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(
      `Gemini stopped early: ${candidate.finishReason}`
    );
  }

  const text =
    candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Missing Gemini response text');
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini response is not valid JSON');
  }

  const colors = parsed?.colors;

  if (!Array.isArray(colors) || colors.length !== 4) {
    throw new Error('Expected exactly 4 colors');
  }

  const normalized = colors.map((c) =>
    typeof c === 'string' ? c.trim() : c
  );

  if (
    !normalized.every(
      (c) =>
        typeof c === 'string' &&
        HEX_RE.test(c)
    )
  ) {
    throw new Error('Invalid hex colors returned');
  }

  return normalized;
}


// POST /api/gradient
// Body: { prompt: "sunset beach" }
// Response: { colors: ["#...", "#...", "#...", "#..."] }

router.post('/', async (req, res) => {
  const { prompt } = req.body || {};

  if (
    typeof prompt !== 'string' ||
    prompt.trim().length === 0
  ) {
    return res.status(400).json({
      error: 'prompt is required',
    });
  }

  if (prompt.length > MAX_PROMPT_LEN) {
    return res.status(400).json({
      error: `prompt must be ${MAX_PROMPT_LEN} characters or fewer`,
    });
  }


  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Gemini API key not configured',
    });
  }


  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [
          {
            parts: [
              {
                text: buildPrompt(prompt.trim()),
              },
            ],
          },
        ],

        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,

          // Faster response for simple palette generation
          thinkingConfig: {
            thinkingLevel: 'MINIMAL',
          },
        },
      },

      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },

        // Gemini 3.5 Flash has been observed taking 12s+ even on minimal
        // thinking; 15s caused intermittent 502s in production
        timeout: 30000,
      }
    );


    const colors = parseGeminiResponse(
      response.data
    );

    return res.json({
      colors,
    });


  } catch (err) {

    if (err.response) {
      console.error(
        'Gemini API Error:',
        err.response.status,
        JSON.stringify(
          err.response.data,
          null,
          2
        )
      );
    } else {
      console.error(
        'Gradient generation error:',
        err.message
      );
    }


    return res.status(502).json({
      error: 'Failed to generate gradient colors',
    });
  }
});


module.exports = router;
module.exports.parseGeminiResponse =
  parseGeminiResponse;
const express = require('express');
const axios = require('axios');

const router = express.Router();

// Preferred model first; fall back when it's overloaded (503) or slow.
// flash-lite runs thinking off by default, so no thinkingConfig for it.
const GEMINI_MODELS = [
  {
    model: 'gemini-3.5-flash',
    thinkingConfig: { thinkingLevel: 'MINIMAL' },
  },
  {
    model: 'gemini-3.1-flash-lite',
  },
];

const geminiUrl = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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
You are a professional color palette designer creating a mesh gradient background.

Create exactly 4 hex colors with these roles, ordered darkest to brightest:
1. A deep base color — dark, rich, sets the mood (lightness roughly 10-35%)
2. A mid-tone wash — hue adjacent to the base
3. A second mid-tone wash — hue adjacent to the first wash
4. A bright accent glow — the light source of the scene (lightness roughly 65-90%)

Rules:
- Keep hues mostly analogous (neighbors on the color wheel); at most ONE color
  may contrast for tension.
- Spread the lightness values wide apart — the gradient needs depth, and colors
  with similar lightness flatten into each other.
- Every color must be saturated enough to survive blending; avoid grayish,
  desaturated mid-tones, which turn to mud when washes overlap.

Consider mood, lighting, atmosphere, time of day, and emotional tone.

Scene:
"${userPrompt}"

Return only JSON:
{
  "colors": [
    "#112233",
    "#445566",
    "#AABBCC",
    "#DDEEFF"
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


  for (const { model, thinkingConfig } of GEMINI_MODELS) {
    try {
      const response = await axios.post(
        geminiUrl(model),
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
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        },

        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },

          // Gemini 3.5 Flash has been observed taking 12s+ even on minimal
          // thinking; keep per-attempt timeout short enough that the
          // fallback model still gets a turn within the request
          timeout: 20000,
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
          `Gemini API Error (${model}):`,
          err.response.status,
          JSON.stringify(
            err.response.data,
            null,
            2
          )
        );
      } else {
        console.error(
          `Gradient generation error (${model}):`,
          err.message
        );
      }
      // fall through to the next model
    }
  }

  return res.status(502).json({
    error: 'Failed to generate gradient colors',
  });
});


module.exports = router;
module.exports.parseGeminiResponse =
  parseGeminiResponse;
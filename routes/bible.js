const express = require('express');
const axios = require('axios');
const router = express.Router();

const VALID_TRANSLATIONS = ['niv', 'nlt', 'esv'];

// GET /api/bible?translation=niv
router.get('/', async (req, res) => {
  const translation = (req.query.translation || 'niv').toLowerCase();
  if (!VALID_TRANSLATIONS.includes(translation)) {
    return res.status(400).json({ error: 'Invalid translation' });
  }

  try {
    const response = await axios.get(
      `https://dailyverses.net/get/verse.js?language=${translation}`,
      { responseType: 'text' }
    );

    const raw = response.data;
    const match = raw.match(/innerHTML\s*=\s*'([\s\S]*?)';/);
    if (!match) return res.status(502).json({ error: 'Unexpected response format' });

    const html = match[1]
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\"/g, '"');

    const textMatch = html.match(/class="dailyVerses bibleText">([\s\S]*?)<\/div>/);
    const refMatch = html.match(/class="dailyVerses bibleVerse"><a[^>]*>([\s\S]*?)<\/a>/);

    if (!textMatch || !refMatch) {
      return res.status(502).json({ error: 'Could not parse verse' });
    }

    res.json({
      text: textMatch[1].trim(),
      reference: refMatch[1].trim(),
      version: translation.toUpperCase(),
    });
  } catch (err) {
    console.error('Bible proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch verse' });
  }
});

module.exports = router;

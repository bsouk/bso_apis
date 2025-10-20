const express = require('express');
const axios = require('axios');
const router = express.Router();

// POST /user/chatbot
// Forwards chat messages to OpenAI (or compatible) using env-configured base URL and key
router.post('/chatbot', async (req, res) => {
  try {
    const { messages, model, temperature, top_p, max_tokens } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server not configured with OPENAI_API_KEY' });
    }

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

    const requestBody = {
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      top_p: typeof top_p === 'number' ? top_p : 1,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : undefined,
    };

    const response = await axios.post(
      endpoint,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: error.message };
    return res.status(status).json(data);
  }
});

module.exports = router;



const express = require('express');
const axios = require('axios');
const router = express.Router();

// System prompt for Blue Sky Platform ChatBot
const SYSTEM_PROMPT = "You are a helpful assistant for the Blue Sky Platform, powered by BSO Services; always provide accurate, clear, and concise answers based on internal website data, respond only with 'No, the answer is not available' if not present, never guess, and keep a professional, simple, and supportive tone.";

// POST /user/chatbot
// Simplified endpoint - accepts only user messages, all config handled server-side
router.post('/chatbot', async (req, res) => {
  try {
    const { messages } = req.body || {};

    // Validate input
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Check API key configuration
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server not configured with OPENAI_API_KEY' });
    }

    // Get configuration from environment variables
    const model = process.env.OPENAI_MODEL;
    const baseUrl = process.env.OPENAI_BASE_URL;
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

    // Prepare messages with system prompt
    // Always include system prompt at the beginning
    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.filter(m => m.role !== 'system') // Remove any system messages from frontend
    ];

    // Prepare request body with all configuration
    const requestBody = {
      model: model,
      messages: fullMessages,
      temperature: 0.2,
      top_p: 1,
      max_tokens: undefined,
    };

    // Make request to OpenAI
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

    // Extract only the AI message content (remove all metadata)
    const aiMessage = response.data?.choices?.[0]?.message?.content || 'No response available';
    
    // Return clean response with only the AI message
    return res.status(200).json({
      message: aiMessage
    });
  } catch (error) {
    console.error('ChatBot API Error:', error.message);
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Failed to process chat request' };
    return res.status(status).json(data);
  }
});

module.exports = router;





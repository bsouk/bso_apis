const express = require('express');
const axios = require('axios');
const router = express.Router();

// POST /user/chatbot
// BSO Chatbot API Integration
// Accepts user messages and forwards to BSO custom chatbot
router.post('/chatbot', async (req, res) => {
  try {
    const { messages } = req.body || {};

    // Validate input
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Check chatbot API configuration
    const chatbotApiUrl = process.env.CHATBOT_API_URL || 'https://9fv4s4a42r.eu-west-2.awsapprunner.com/api/v1/chat';
    const chatbotApiKey = process.env.CHATBOT_X_API_KEY;

    // Require API key for authentication
    if (!chatbotApiUrl || !chatbotApiKey) {
      console.error('❌ Chatbot API not configured. Missing CHATBOT_API_URL or CHATBOT_X_API_KEY');
      return res.status(500).json({ 
        error: 'Chatbot service is not configured. Please contact support.' 
      });
    }

    // Extract the last user message as the question
    // The new BSO chatbot API expects a simple question string, not a messages array
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage || !lastUserMessage.content) {
      return res.status(400).json({ error: 'No user question found in messages' });
    }

    const question = lastUserMessage.content;

    console.log('💬 Sending question to BSO Chatbot:', question);

    // Prepare request body for BSO Chatbot API
    const requestBody = {
      question: question
    };

    // Make request to BSO Chatbot API with required authentication
    const response = await axios.post(
      chatbotApiUrl,
      requestBody,
      {
        headers: {
          'x-api-key': chatbotApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    // Extract answer and sources from BSO Chatbot response
    const answer = response.data?.answer || 'No response available';
    const sources = response.data?.sources || [];
    
    console.log('✅ BSO Chatbot response received');
    console.log('📚 Sources:', sources.length, 'document(s)');

    // Return clean response matching frontend expectations
    return res.status(200).json({
      message: answer,
      sources: sources // Optional: frontend can display sources if needed
    });

  } catch (error) {
    console.error('❌ BSO ChatBot API Error:', error.message);
    
    // Handle specific error responses
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      return res.status(error.response.status).json({
        error: error.response.data?.error || error.response.data?.message || 'Chatbot request failed'
      });
    }
    
    // Network or other errors
    return res.status(500).json({ 
      error: 'Failed to connect to chatbot service. Please try again later.' 
    });
  }
});

module.exports = router;





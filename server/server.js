// server/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { createVoiceSession } = require('./agents/voiceAgent');

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Serve the static frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Endpoint for VOICE Agent Session Creation ---
// This is the only API endpoint we need on the server.
// It creates a secure, short-lived token for the client to connect to OpenAI's voice service.
app.get('/api/session', async (req, res) => {
    try {
        console.log('🎙️  Requesting new voice session from OpenAI...');
        const session = await createVoiceSession();
        
        if (!session || !session.client_secret) {
            throw new Error('Invalid session creation response from OpenAI.');
        }
        
        console.log('✅  Voice session created successfully.');
        // Send the session object, which includes the client_secret, back to the client.
        res.json(session);

    } catch (error) {
        console.error('❌  Error creating voice session:', error);
        res.status(500).json({ 
            error: { message: error.message || 'Failed to create voice session' } 
        });
    }
});

// --- Start the server ---
app.listen(PORT, () => {
    console.log('==========================================');
    console.log(`✅  SoundVerse Server running on http://localhost:${PORT}`);
    console.log('==========================================');
});
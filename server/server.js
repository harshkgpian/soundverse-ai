// server/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createVoiceSession } = require('./agents/voiceAgent');

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Endpoint to securely provide tool definitions to the client ---
app.get('/api/tools', (req, res) => {
    try {
        const toolsPath = path.join(__dirname, 'agents', 'config', 'tools.json');
        const tools = fs.readFileSync(toolsPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(tools);
    } catch (error) {
        console.error('❌ Error reading tools.json:', error);
        res.status(500).json({ error: 'Could not load tool definitions.' });
    }
});


// --- Endpoint for VOICE Agent Session Creation ---
app.get('/api/session', async (req, res) => {
    try {
        console.log('🎙️  Requesting new voice session from OpenAI...');
        const session = await createVoiceSession();
        
        if (!session || !session.client_secret) {
            throw new Error('Invalid session creation response from OpenAI.');
        }
        
        console.log('✅  Voice session created successfully.');
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
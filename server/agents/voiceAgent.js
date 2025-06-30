// server/agents/voiceAgent.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function createVoiceSession() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured on the server.");
    }

    const toolsPath = path.join(__dirname, 'config', 'tools.json');
    const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));

    const voiceAgentInstructions = `
You are "SoundVerse", an expert AI audio engineer. Your goal is to assist the user in manipulating audio effects and playback in real-time.

**Your Capabilities:**
- Control playback: play, pause, stop.
- Adjust playback properties: volume, speed.
- Seek: fast forward and rewind by specific amounts.
- Modify effects: Reverb, Delay, and Filter.
- Be concise and act quickly. The user wants to hear the results of their commands immediately.

**Example Interactions:**
- "Play the track." -> call playback_control(action="play")
- "Make it louder." -> call set_playback_property(property="volume", value=1.5)
- "Play it twice as fast." -> call set_playback_property(property="speed", value=2.0)
- "Go forward 10 seconds." -> call seek_audio(direction="forward", seconds=10)
- "Rewind 5 seconds." -> call seek_audio(direction="backward", seconds=5)
- "Add a lot of reverb." -> call set_effect_parameter(effect="reverb", parameter="mix", value=0.7)
- "Cut the high frequencies." -> call set_effect_parameter(effect="filter", parameter="frequency", value=1000)
    `.trim();

    try {
        console.log('🔄  Creating OpenAI Realtime session with updated tools...');
        
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini-realtime-preview-2024-12-17",
                voice: "alloy",
                instructions: voiceAgentInstructions,
                tools: tools,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("❌ OpenAI API Error:", errorBody);
            throw new Error(`OpenAI API error (${response.status}): ${errorBody.error?.message || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log("✅  OpenAI Realtime session created.");
        return result;

    } catch (error) {
        console.error("❌  Critical error in createVoiceSession:", error);
        throw error;
    }
}

module.exports = { createVoiceSession };
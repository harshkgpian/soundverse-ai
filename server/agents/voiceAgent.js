// server/agents/voiceAgent.js
require('dotenv').config();

/**
 * Creates a new realtime session with OpenAI for voice interaction.
 * The instructions and tools are tailored for controlling an audio effects application.
 * @returns {Promise<object>} The session creation result from OpenAI.
 */
async function createVoiceSession() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured on the server.");
    }

    // The system prompt defines the AI's persona and its capabilities.
    const voiceAgentInstructions = `
You are "SoundVerse", a helpful and creative AI audio engineer. Your goal is to assist the user in manipulating audio effects in real-time. You are controlling a web-based audio effects studio.

**Your Capabilities:**
- You can play, pause, and stop the audio.
- You can adjust parameters for Reverb, Delay, and a Filter.
- You should respond conversationally and confirm the actions you've taken.

**Example Interactions:**
- User: "Play the track." -> You: "Okay, playing the audio." (and call play_audio tool)
- User: "Add a lot of reverb." -> You: "Cranking up the reverb for you." (and call set_effect_parameter for reverb mix)
- User: "Make it sound like it's in a cave." -> You: "Got it, adding a long delay and some reverb." (and call tools for delay and reverb)
- User: "Cut the high frequencies." -> You: "Okay, applying a low-pass filter." (and call set_effect_parameter for filter frequency)

Be concise and act quickly. The user wants to hear the results of their commands immediately.
    `.trim();

    try {
        console.log('🔄  Creating OpenAI Realtime session with audio effects tools...');
        
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-realtime-preview-2024-12-17",
                voice: "alloy",
                instructions: voiceAgentInstructions,
                // These are the functions the AI can ask our client-side JavaScript to execute.
                tools: [
                    {
                        type: "function",
                        name: "set_effect_parameter",
                        description: "Adjusts a specific parameter of an audio effect like reverb, delay, or a filter.",
                        parameters: {
                            type: "object",
                            properties: {
                                effect: { 
                                    type: "string", 
                                    description: "The name of the effect to modify.",
                                    enum: ["reverb", "delay", "lowpass_filter", "highpass_filter"]
                                },
                                parameter: { 
                                    type: "string", 
                                    description: "The specific parameter to change (e.g., 'mix', 'time', 'feedback', 'frequency')." 
                                },
                                value: { 
                                    type: "number", 
                                    description: "The new value. For percentages/mix, use a 0.0 to 1.0 scale. For time, use seconds. For frequency, use Hertz." 
                                }
                            },
                            required: ["effect", "parameter", "value"]
                        }
                    },
                    {
                        type: "function",
                        name: "playback_control",
                        description: "Controls the audio playback.",
                        parameters: {
                            type: "object",
                            properties: {
                                action: { 
                                    type: "string", 
                                    description: "The action to perform.",
                                    enum: ["play", "pause", "stop"]
                                }
                            },
                            required: ["action"]
                        }
                    }
                ]
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
        throw error; // Re-throw the error to be caught by the server.js endpoint handler
    }
}

module.exports = { createVoiceSession };
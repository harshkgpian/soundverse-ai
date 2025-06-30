/**
 * @file Factory function that creates audio tool implementations.
 * This pattern allows injecting a WebSocket manager for real-time communication with the client.
 */

/**
 * Creates and returns an object containing all audio tool functions.
 * @param {object} webSocketManager - An object with a `sendCommand(sessionId, command)` method.
 * @returns {object} An object mapping tool names to their implementation functions.
 */
module.exports = function(webSocketManager) {
    
    /**
     * Normalizes a value from the LLM's likely output (0-1) to a target audio range.
     * @param {number} value - The input value (typically 0 to 1).
     * @param {number} min - The minimum of the target range.
     * @param {number} max - The maximum of the target range.
     * @returns {number} The scaled and rounded value.
     */
    function scaleValue(value, min, max) {
        // Clamp the input value between 0 and 1 to be safe
        const clampedValue = Math.max(0, Math.min(1, value));
        return Math.floor(min + (clampedValue * (max - min)));
    }

    /**
     * Controls playback of the audio file.
     * @param {{ action: 'play' | 'pause' | 'stop' }} args - The playback action.
     * @param {string} sessionId - The client session ID.
     * @returns {string} A confirmation message for the user.
     */
    function control_playback({ action }, sessionId) {
        if (!['play', 'pause', 'stop'].includes(action)) {
            throw new Error("Invalid playback action. Must be 'play', 'pause', or 'stop'.");
        }
        webSocketManager.sendCommand(sessionId, {
            type: 'CONTROL_PLAYBACK',
            payload: { action }
        });
        const pastTense = { play: 'started', pause: 'paused', stop: 'stopped' };
        return `Okay, playback has been ${pastTense[action]}.`;
    }

    /**
     * Sets the parameters for the Reverb effect.
     * @param {{ wet_dry: number }} args - Reverb parameters. wet_dry is a value from 0 (fully dry) to 1 (fully wet).
     * @param {string} sessionId - The client session ID.
     * @returns {string} A confirmation message.
     */
    function set_reverb({ wet_dry }, sessionId) {
        // The front-end slider is 0-100
        const wetDryPercentage = scaleValue(wet_dry, 0, 100);
        webSocketManager.sendCommand(sessionId, {
            type: 'SET_EFFECT',
            payload: { effectId: 'reverbWetDry', value: wetDryPercentage }
        });
        return `Reverb mix set to ${wetDryPercentage}%.`;
    }

    /**
     * Sets the parameters for the Delay effect.
     * @param {{ time_ms?: number, feedback?: number }} args - Delay parameters.
     * @param {string} sessionId - The client session ID.
     * @returns {string} A confirmation message.
     */
    function set_delay({ time_ms, feedback }, sessionId) {
        if (time_ms === undefined && feedback === undefined) {
            throw new Error("Either 'time_ms' or 'feedback' must be provided for the delay effect.");
        }
        
        const responseParts = [];

        if (time_ms !== undefined) {
            // Front-end slider is 0-1000ms
            const delayTime = scaleValue(time_ms, 0, 1000);
            webSocketManager.sendCommand(sessionId, {
                type: 'SET_EFFECT',
                payload: { effectId: 'delayTime', value: delayTime }
            });
            responseParts.push(`delay time to ${delayTime}ms`);
        }

        if (feedback !== undefined) {
            // Front-end slider is 0-95%
            const feedbackAmount = scaleValue(feedback, 0, 95);
             webSocketManager.sendCommand(sessionId, {
                type: 'SET_EFFECT',
                payload: { effectId: 'delayFeedback', value: feedbackAmount }
            });
            responseParts.push(`feedback to ${feedbackAmount}%`);
        }

        return `Okay, I've set the ${responseParts.join(' and ')}.`;
    }

    /**
     * Sets the parameters for a Filter effect.
     * @param {{ type: 'lowpass' | 'highpass', frequency: number }} args - Filter parameters.
     * @param {string} sessionId - The client session ID.
     * @returns {string} A confirmation message.
     */
    function set_filter({ type, frequency }, sessionId) {
        let freqValue, effectId, unit;
        
        if (type === 'lowpass') {
            // Front-end slider is 100-20000Hz
            effectId = 'lowPassFreq';
            freqValue = scaleValue(frequency, 100, 20000);
            unit = freqValue > 1000 ? `${(freqValue/1000).toFixed(1)}kHz` : `${freqValue}Hz`;
        } else if (type === 'highpass') {
            // Front-end slider is 20-2000Hz
            effectId = 'highPassFreq';
            freqValue = scaleValue(frequency, 20, 2000);
            unit = `${freqValue}Hz`;
        } else {
            throw new Error("Invalid filter type. Must be 'lowpass' or 'highpass'.");
        }

        webSocketManager.sendCommand(sessionId, {
            type: 'SET_EFFECT',
            payload: { effectId: effectId, value: freqValue }
        });

        return `Okay, the ${type} filter is set to ${unit}.`;
    }

    /**
     * Resets all audio effects to their default values.
     * @param {object} args - Empty args object.
     * @param {string} sessionId - The client session ID.
     * @returns {string} A confirmation message.
     */
    function reset_effects(args, sessionId) {
        webSocketManager.sendCommand(sessionId, {
            type: 'RESET_EFFECTS',
            payload: {}
        });
        return "Done. All effects are back to their default settings.";
    }

    // Return the public-facing tool functions
    return {
        control_playback,
        set_reverb,
        set_delay,
        set_filter,
        reset_effects,
    };
};
// public/js/utils/AudioUtils.js

/**
 * Formats a frequency value (in Hz) into a readable string (Hz or kHz).
 * @param {number} freq - The frequency in Hertz.
 * @returns {string} The formatted frequency string.
 */
export function formatFrequency(freq) {
    if (freq >= 1000) {
        return (freq / 1000).toFixed(1) + 'kHz';
    }
    return Math.round(freq) + 'Hz';
}

/**
 * Formats a time value (in seconds) into a readable string (ms or s).
 * @param {number} time - The time in seconds.
 * @returns {string} The formatted time string.
 */
export function formatTime(time) {
    if (time < 1) {
        return (time * 1000).toFixed(0) + 'ms';
    }
    return time.toFixed(2) + 's';
}
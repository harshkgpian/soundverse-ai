// public/js/utils/AudioUtils.js

/**
 * Formats a numeric value into a readable string based on its unit type.
 * @param {number} value - The numeric value.
 * @param {string} unit - The unit type from the config ('%', 'time', 'frequency', 'decimal', 'multiplier').
 * @returns {string} The formatted string for display.
 */
export function formatDisplayValue(value, unit) {
    switch (unit) {
        case '%':
            // For volume, we can show over 100%
            return `${(value * 100).toFixed(0)}%`;
        case 'time':
            return value < 1 ? `${(value * 1000).toFixed(0)}ms` : `${value.toFixed(2)}s`;
        case 'frequency':
            return value >= 1000 ? `${(value / 1000).toFixed(1)}kHz` : `${Math.round(value)}Hz`;
        case 'decimal':
            return value.toFixed(2);
        case 'multiplier':
            return `x${value.toFixed(2)}`;
        default:
            return value.toString();
    }
}
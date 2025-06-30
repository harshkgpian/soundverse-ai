import { EFFECT_DEFAULTS, EFFECT_CONFIG } from '../utils/Constants.js';

export class EffectsManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.currentSettings = { ...EFFECT_DEFAULTS };
    }

    setEffect(effectId, value) {
        this.currentSettings[effectId] = value;
        this.audioEngine.setEffectValue(effectId, value);
        console.log(`Effect set: ${effectId} = ${value}`);
    }

    getEffectValue(effectId) {
        return this.currentSettings[effectId];
    }

    getEffectConfig(effectId) {
        return EFFECT_CONFIG[effectId];
    }
    
    getDisplayValue(effectId, value) {
        const config = this.getEffectConfig(effectId);
        if (!config || !config.formatter) {
            return value;
        }
        return config.formatter(value);
    }

    resetAllEffects() {
        this.currentSettings = { ...EFFECT_DEFAULTS };
        for (const [effectId, value] of Object.entries(EFFECT_DEFAULTS)) {
            this.audioEngine.setEffectValue(effectId, value);
        }
        console.log("All effects reset to default.");
    }
}
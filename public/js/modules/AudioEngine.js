// public/js/modules/AudioEngine.js
import { formatDisplayValue } from '../utils/AudioUtils.js';

class AudioEngine {
    constructor(uiManager) {
        this.uiManager = uiManager; // For updating the progress bar
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.effects = {};
        this.effectsConfig = null;
        
        // State for playback control
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;
        this.startOffset = 0; // Where in the track to resume from
        this.progressUpdateInterval = null;
    }

    async init(effectsConfig) {
        if (this.audioContext) return;
        this.effectsConfig = effectsConfig;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.setupEffectChain();
            console.log("🎧 AudioEngine Initialized");
        } catch (e) { console.error("Error initializing AudioContext:", e); }
    }

    setupEffectChain() {
        // Create nodes
        this.effects.inputNode = this.audioContext.createGain();
        this.effects.dryGain = this.audioContext.createGain();
        this.effects.reverb = this.audioContext.createConvolver();
        this.effects.reverbWetGain = this.audioContext.createGain();
        this.effects.delay = this.audioContext.createDelay(5.0);
        this.effects.delayFeedback = this.audioContext.createGain();
        this.effects.delayWetGain = this.audioContext.createGain();
        this.effects.lowpassFilter = this.audioContext.createBiquadFilter();
        this.effects.masterGain = this.audioContext.createGain();

        // Connect graph (as before)
        const { inputNode, lowpassFilter, dryGain, reverb, reverbWetGain, delay, delayFeedback, delayWetGain, masterGain } = this.effects;
        inputNode.connect(lowpassFilter);
        lowpassFilter.connect(dryGain);
        dryGain.connect(masterGain);
        lowpassFilter.connect(reverb);
        reverb.connect(reverbWetGain);
        reverbWetGain.connect(masterGain);
        lowpassFilter.connect(delay);
        delay.connect(delayFeedback);
        delayFeedback.connect(delay);
        delay.connect(delayWetGain);
        delayWetGain.connect(masterGain);
        masterGain.connect(this.audioContext.destination);

        this.effects.lowpassFilter.type = 'lowpass';
        this._createReverbImpulse(this.effects.reverb);

        // Apply defaults from config
        for (const key in this.effectsConfig) {
            for (const paramKey in this.effectsConfig[key].parameters) {
                const paramConfig = this.effectsConfig[key].parameters[paramKey];
                if(key === 'volume' || key === 'speed') {
                     this.setPlaybackProperty(key, paramConfig.defaultValue);
                } else {
                     this.setEffect(key, paramKey, paramConfig.defaultValue);
                }
            }
        }
    }
    
    async loadAudio(file) {
        if (!this.audioContext) throw new Error("Audio engine not initialized.");
        this.stop(); // Stop any currently playing track
        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        console.log("🔊 Audio file loaded and decoded.");
    }

    _createSourceNode() {
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.effects.inputNode);
        // Apply current speed setting
        this.sourceNode.playbackRate.value = this.effects.masterGain.playbackRate || 1.0;
    }

    play() {
        if (this.isPlaying) return;
        this._createSourceNode();
        this.startTime = this.audioContext.currentTime;
        this.sourceNode.start(0, this.startOffset % this.audioBuffer.duration);
        this.isPlaying = true;
        this.isPaused = false;
        this._startProgressUpdater();
        this.sourceNode.onended = () => { if (this.isPlaying) this.stop(); };
    }

    pause() {
        if (!this.isPlaying) return;
        this.sourceNode.stop(0);
        this.startOffset += (this.audioContext.currentTime - this.startTime) * this.sourceNode.playbackRate.value;
        this.isPlaying = false;
        this.isPaused = true;
        this._stopProgressUpdater();
    }

    stop() {
        if (this.sourceNode) this.sourceNode.stop(0);
        this.isPlaying = false;
        this.isPaused = false;
        this.startOffset = 0;
        this._stopProgressUpdater();
        this.uiManager.updatePlaybackProgress(0);
    }
    
    seek(seconds) {
        const wasPlaying = this.isPlaying;
        if (this.isPlaying) this.sourceNode.stop(0);
        
        this.startOffset += seconds;
        // Clamp to valid range
        this.startOffset = Math.max(0, Math.min(this.startOffset, this.audioBuffer.duration));
        
        if (wasPlaying) {
             this._createSourceNode();
             this.startTime = this.audioContext.currentTime;
             this.sourceNode.start(0, this.startOffset);
        }
        this._updateProgress(); // Immediate UI update
    }

    _startProgressUpdater() {
        this._stopProgressUpdater(); // Ensure no duplicates
        this.progressUpdateInterval = setInterval(() => this._updateProgress(), 100);
    }

    _stopProgressUpdater() {
        clearInterval(this.progressUpdateInterval);
    }

    _updateProgress() {
        if (!this.audioBuffer) return;
        const speed = this.sourceNode?.playbackRate.value || 1.0;
        const elapsed = this.isPaused ? this.startOffset : this.startOffset + (this.audioContext.currentTime - this.startTime) * speed;
        const percentage = (elapsed / this.audioBuffer.duration) * 100;
        this.uiManager.updatePlaybackProgress(Math.min(100, percentage));
    }

    setPlaybackProperty(property, value) {
        let displayValue;
        switch (property) {
            case 'volume':
                this.effects.masterGain.gain.value = value;
                displayValue = formatDisplayValue(value, 'multiplier');
                break;
            case 'speed':
                if (this.sourceNode) this.sourceNode.playbackRate.value = value;
                // Store it for the next time a sourceNode is created
                this.effects.masterGain.playbackRate = value;
                displayValue = formatDisplayValue(value, 'multiplier');
                break;
        }
        return displayValue;
    }

    setEffect(effect, parameter, value) {
        const paramConfig = this.effectsConfig[effect]?.parameters[parameter];
        if (!paramConfig) return;
        
        switch (`${effect}-${parameter}`) {
            case 'reverb-mix':
                this.effects.reverbWetGain.gain.value = value;
                this.effects.dryGain.gain.value = 1.0 - value;
                break;
            case 'delay-time':
                this.effects.delay.delayTime.value = value;
                break;
            case 'delay-feedback':
                this.effects.delayFeedback.gain.value = value;
                this.effects.delayWetGain.gain.value = value;
                break;
            case 'filter-frequency':
                this.effects.lowpassFilter.frequency.value = value;
                break;
        }
        return formatDisplayValue(value, paramConfig.unit);
    }

    _createReverbImpulse(reverbNode) {
        const sr = this.audioContext.sampleRate;
        const len = sr * 2.0;
        const impulse = this.audioContext.createBuffer(2, len, sr);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        for (let i = 0; i < len; i++) {
            let n = len - i;
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(n / len, 2.5);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(n / len, 2.5);
        }
        reverbNode.buffer = impulse;
    }
}

export default AudioEngine;
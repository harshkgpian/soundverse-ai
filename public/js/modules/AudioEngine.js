// public/js/modules/AudioEngine.js
import { formatFrequency, formatTime } from '../utils/AudioUtils.js';

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        
        // This will hold all our audio nodes
        this.effects = {};
    }

    async init() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.setupEffectChain();
            console.log("🎧 AudioEngine Initialized");
        } catch (e) {
            console.error("Error initializing AudioContext:", e);
            alert("Web Audio API is not supported in this browser.");
        }
    }

    setupEffectChain() {
        // --- Create all necessary audio nodes ---
        const inputNode = this.audioContext.createGain();
        
        // The "Dry" path
        const dryGain = this.audioContext.createGain();

        // The "Wet" path for Reverb
        const reverb = this.audioContext.createConvolver();
        const reverbWetGain = this.audioContext.createGain();
        this._createReverbImpulse(reverb); // Pass the node to populate it

        // The "Wet" path for Delay
        const delay = this.audioContext.createDelay(5.0); // Allow up to 5s delay
        const delayFeedback = this.audioContext.createGain();
        const delayWetGain = this.audioContext.createGain();

        // Filter
        const lowpassFilter = this.audioContext.createBiquadFilter();
        
        // Master output
        const masterGain = this.audioContext.createGain();

        // Store references to all nodes we need to control
        this.effects = { 
            inputNode,
            dryGain, 
            reverb, 
            reverbWetGain, 
            delay, 
            delayFeedback,
            delayWetGain,
            lowpassFilter,
            masterGain
        };

        // --- Configure initial values ---
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.value = 20000;
        
        delay.delayTime.value = 0.3;
        delayFeedback.gain.value = 0.4;
        
        // Initial Mix: 70% dry, 30% reverb, 30% delay
        dryGain.gain.value = 0.7; 
        reverbWetGain.gain.value = 0.3;
        delayWetGain.gain.value = 0.3;
        
        // --- Connect the audio graph ---
        // 1. Input connects to the filter first
        inputNode.connect(lowpassFilter);

        // 2. The filtered signal splits into three paths
        //    a) Dry path
        lowpassFilter.connect(dryGain);
        dryGain.connect(masterGain);

        //    b) Reverb path
        lowpassFilter.connect(reverb);
        reverb.connect(reverbWetGain);
        reverbWetGain.connect(masterGain);

        //    c) Delay path with feedback loop
        lowpassFilter.connect(delay);
        delay.connect(delayFeedback);
        delayFeedback.connect(delay); // Feedback loop
        delay.connect(delayWetGain);
        delayWetGain.connect(masterGain);

        // 3. Final master output connects to destination
        masterGain.connect(this.audioContext.destination);
    }
    
    async loadAudio(file) {
        if (!this.audioContext) await this.init();
        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        console.log("🔊 Audio file loaded and decoded.");
    }
    
    play() {
        if (this.isPlaying || !this.audioBuffer) return;
        
        // Stop any previous source to avoid multiple playbacks
        if(this.sourceNode) {
            this.sourceNode.stop();
        }

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        
        // Connect the audio source to the beginning of our effect chain
        this.sourceNode.connect(this.effects.inputNode);

        this.sourceNode.start(0);
        this.isPlaying = true;

        // Update UI state when track ends
        this.sourceNode.onended = () => { 
            this.isPlaying = false; 
            console.log("Playback finished.");
        };
    }

    stop() {
        if (!this.sourceNode || !this.isPlaying) return;
        this.sourceNode.stop(0);
        this.isPlaying = false;
    }

    // --- Public methods for controlling effects ---
    setEffect(effect, parameter, value) {
        console.log(`Setting ${effect}.${parameter} to ${value}`);
        // This is a simple mixing strategy. More advanced ones could ensure constant power.
        const dryValue = 1.0 - value; 

        switch (`${effect}-${parameter}`) {
            case 'reverb-mix':
                // THIS IS THE FIX: We control the gain of the dedicated reverbWetGain node.
                this.effects.reverbWetGain.gain.value = value;
                // We also adjust the dry gain to compensate.
                this.effects.dryGain.gain.value = dryValue;
                return `${(value * 100).toFixed(0)}%`;
            case 'delay-time':
                this.effects.delay.delayTime.value = value;
                return formatTime(value);
            case 'delay-feedback':
                this.effects.delayFeedback.gain.value = value;
                // Also control the output gain of the delay path
                this.effects.delayWetGain.gain.value = value;
                return value.toFixed(2);
            case 'filter-frequency':
                this.effects.lowpassFilter.frequency.value = value;
                return formatFrequency(value);
            default:
                console.warn(`Unknown effect/parameter: ${effect}-${parameter}`);
                return value;
        }
    }

    _createReverbImpulse(reverbNode) {
        const sr = this.audioContext.sampleRate;
        const len = sr * 2.0; // 2 seconds
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
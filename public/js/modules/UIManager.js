// public/js/modules/UIManager.js
class UIManager {
    constructor() {
        // Cache DOM elements for performance
        this.elements = {
            audioFileInput: document.getElementById('audio-file-input'),
            fileStatus: document.getElementById('file-status'),
            manualControls: document.getElementById('manual-controls'),
            playBtn: document.getElementById('play-btn'),
            stopBtn: document.getElementById('stop-btn'),
            voiceControlBtn: document.getElementById('voice-control-btn'),
            voiceStatus: document.getElementById('voice-status'),
            sliders: document.querySelectorAll('input[type="range"]'),
        };
    }

    bindEventListeners(audioEngine, fileManager, voiceAgent) {
        // File loading
        this.elements.audioFileInput.addEventListener('change', (e) => {
            fileManager.handleFileSelect(e.target.files[0]);
        });

        // Playback controls
        this.elements.playBtn.addEventListener('click', () => audioEngine.play());
        this.elements.stopBtn.addEventListener('click', () => audioEngine.stop());

        // Voice control
        this.elements.voiceControlBtn.addEventListener('click', (e) => {
            const btn = e.target;
            if (btn.dataset.active === "true") {
                voiceAgent.stopSession();
            } else {
                voiceAgent.startSession();
            }
        });
        
        // Manual effect sliders
        this.elements.sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const effect = e.target.closest('.effect-group').dataset.effect;
                const parameter = e.target.id.split('-')[1];
                const value = parseFloat(e.target.value);
                const displayValue = audioEngine.setEffect(effect, parameter, value);
                this.updateSliderValue(e.target, displayValue);
            });
            // Trigger initial display value
            slider.dispatchEvent(new Event('input'));
        });
    }

    updateSliderValue(sliderElement, displayValue) {
        const valueSpan = sliderElement.nextElementSibling;
        if (valueSpan && valueSpan.classList.contains('slider-value')) {
            valueSpan.textContent = displayValue;
        }
    }
    
    // --- UI State Update Methods ---
    
    showManualControls() {
        this.elements.manualControls.style.display = 'block';
        this.elements.playBtn.disabled = false;
        this.elements.stopBtn.disabled = false;
        this.elements.voiceControlBtn.disabled = false;
    }

    updateFileStatus(message) {
        this.elements.fileStatus.textContent = message;
    }

    updateVoiceStatus(message, isActive = false) {
        this.elements.voiceStatus.textContent = message;
        this.elements.voiceControlBtn.textContent = isActive ? "Stop Voice Control" : "Start Voice Control";
        this.elements.voiceControlBtn.dataset.active = isActive;
    }

    // <<< THE NEW METHOD FOR SLIDER SYNCING >>>
    /**
     * Finds a slider by its effect and parameter name and updates its value.
     * @param {string} effect - The effect name (e.g., 'reverb').
     * @param {string} parameter - The parameter name (e.g., 'mix').
     * @param {number} value - The new value for the slider.
     */
    syncSlider(effect, parameter, value) {
        // Construct the slider's ID from the arguments (e.g., 'reverb-mix')
        const sliderId = `${effect}-${parameter}`;
        const slider = document.getElementById(sliderId);

        if (slider) {
            console.log(`Syncing UI slider: #${sliderId} to value ${value}`);
            // Programmatically set the slider's value
            slider.value = value;
            // Manually dispatch an 'input' event to trigger the text label update
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.warn(`UI Sync Warning: Slider with ID #${sliderId} not found.`);
        }
    }
}

export default UIManager;
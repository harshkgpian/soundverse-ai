// public/js/modules/UIManager.js
class UIManager {
    constructor() {
        this.elements = {
            audioFileInput: document.getElementById('audio-file-input'),
            fileStatus: document.getElementById('file-status'),
            progressBarContainer: document.querySelector('.progress-bar-container'),
            progressBar: document.getElementById('progress-bar'),
            manualControls: document.getElementById('manual-controls'),
            effectsPanel: document.getElementById('effects-panel'),
            playBtn: document.getElementById('play-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            stopBtn: document.getElementById('stop-btn'),
            voiceControlBtn: document.getElementById('voice-control-btn'),
            voiceStatus: document.getElementById('voice-status'),
            lastCommandDisplay: document.getElementById('last-command-display'),
            lastCommandText: document.getElementById('last-command-text'),
        };
        this.effectsConfig = null;
    }

    async init(effectsConfig) {
        this.effectsConfig = effectsConfig;
        this.buildEffectsPanel();
    }

    buildEffectsPanel() {
        this.elements.effectsPanel.innerHTML = '';
        for (const effectKey in this.effectsConfig) {
            const effectConfig = this.effectsConfig[effectKey];
            const group = document.createElement('div');
            group.className = 'effect-group';
            group.dataset.effect = effectKey;
            group.innerHTML = `<h3>${effectConfig.name}</h3>`;

            for (const paramKey in effectConfig.parameters) {
                const paramConfig = effectConfig.parameters[paramKey];
                const sliderId = `${effectKey}-${paramKey}`;
                const container = document.createElement('div');
                container.className = 'slider-container';
                container.innerHTML = `
                    <label for="${sliderId}">${paramConfig.label}</label>
                    <input type="range" id="${sliderId}" min="${paramConfig.min}" max="${paramConfig.max}" value="${paramConfig.defaultValue}" step="${paramConfig.step}">
                    <span class="slider-value"></span>
                `;
                group.appendChild(container);
            }
            this.elements.effectsPanel.appendChild(group);
        }
    }

    bindEventListeners(audioEngine) {
        const sliders = this.elements.effectsPanel.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const effectKey = e.target.closest('.effect-group').dataset.effect;
                const paramKey = e.target.id.split('-')[1];
                const value = parseFloat(e.target.value);
                
                const displayValue = effectKey === "volume" || effectKey === "speed"
                    ? audioEngine.setPlaybackProperty(paramKey, value)
                    : audioEngine.setEffect(effectKey, paramKey, value);

                this.updateSliderValue(e.target, displayValue);
            });
            slider.dispatchEvent(new Event('input'));
        });
    }

    updateSliderValue(sliderElement, displayValue) {
        const valueSpan = sliderElement.nextElementSibling;
        if (valueSpan) valueSpan.textContent = displayValue;
    }

    updatePlaybackProgress(percentage) {
        this.elements.progressBar.style.width = `${percentage}%`;
    }
    
    showLastCommand(toolName, args) {
        const text = `${toolName}(${JSON.stringify(args)})`;
        this.elements.lastCommandText.textContent = text;
        this.elements.lastCommandDisplay.style.display = 'block';
    }

    syncSlider(effect, parameter, value) {
        const sliderId = `${effect}-${parameter}`;
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.value = value;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    showManualControls() {
        this.elements.manualControls.style.display = 'block';
        this.elements.progressBarContainer.style.display = 'block';
        this.elements.playBtn.disabled = false;
        this.elements.pauseBtn.disabled = false;
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
}

export default UIManager;
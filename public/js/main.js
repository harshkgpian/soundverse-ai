// public/js/main.js
import AudioEngine from './modules/AudioEngine.js';
import UIManager from './modules/UIManager.js';
import FileManager from './modules/FileManager.js';
import VoiceAgent from './modules/VoiceAgent.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 SoundVerse Studio Initializing...");

    // 1. Fetch all necessary configurations from the server
    const [effectsConfig, toolsConfig] = await Promise.all([
        fetch('./effects_config.json').then(res => res.json()),
        fetch('/api/tools').then(res => res.json()) // Fetch tools from the secure backend endpoint
    ]);

    // 2. Initialize core components
    const uiManager = new UIManager();
    const audioEngine = new AudioEngine(uiManager); // Pass UIManager to AudioEngine for progress updates
    
    await uiManager.init(effectsConfig);
    await audioEngine.init(effectsConfig);

    // 3. Initialize managers that depend on core components
    const fileManager = new FileManager(audioEngine, uiManager);
    const voiceAgent = new VoiceAgent(audioEngine, uiManager, toolsConfig); // Pass tools config to the agent

    // 4. Bind UI event listeners now that everything is initialized
    uiManager.elements.audioFileInput.addEventListener('change', (e) => fileManager.handleFileSelect(e.target.files[0]));
    uiManager.elements.playBtn.addEventListener('click', () => audioEngine.play());
    uiManager.elements.pauseBtn.addEventListener('click', () => audioEngine.pause());
    uiManager.elements.stopBtn.addEventListener('click', () => audioEngine.stop());
    uiManager.elements.voiceControlBtn.addEventListener('click', (e) => {
        const btn = e.target;
        if (btn.dataset.active === "true") {
            voiceAgent.stopSession();
        } else {
            voiceAgent.startSession();
        }
    });

    uiManager.bindEventListeners(audioEngine);
    
    console.log("✅ Studio Ready. Load an audio file to begin.");
});
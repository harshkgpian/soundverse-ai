// public/js/main.js
import AudioEngine from './modules/AudioEngine.js';
import UIManager from './modules/UIManager.js';
import FileManager from './modules/FileManager.js';
import VoiceAgent from './modules/VoiceAgent.js';

document.addEventListener('DOMContentLoaded', async () => { // Make listener async
    console.log("🚀 SoundVerse Studio Initializing...");

    // 1. Initialize core components
    const audioEngine = new AudioEngine();
    // <<< FIX >>> Initialize the AudioEngine immediately on page load
    await audioEngine.init();

    const uiManager = new UIManager();
    
    // 2. Initialize managers that depend on core components
    const fileManager = new FileManager(audioEngine, uiManager);
    const voiceAgent = new VoiceAgent(audioEngine, uiManager);

    // 3. Connect UI events to the appropriate managers
    // Now this will only run AFTER audioEngine.init() is complete.
    uiManager.bindEventListeners(audioEngine, fileManager, voiceAgent);
    
    console.log("✅ Studio Ready.");
});
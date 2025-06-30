// public/js/modules/FileManager.js
class FileManager {
    constructor(audioEngine, uiManager) {
        this.audioEngine = audioEngine;
        this.uiManager = uiManager;
    }

    async handleFileSelect(file) {
        if (!file) return;

        this.uiManager.updateFileStatus(`Loading "${file.name}"...`);
        try {
            await this.audioEngine.loadAudio(file);
            this.uiManager.updateFileStatus(`Ready: "${file.name}"`);
            this.uiManager.showManualControls();
            this.uiManager.updateVoiceStatus("Ready to start voice control.");
        } catch (error) {
            console.error("File loading error:", error);
            this.uiManager.updateFileStatus("Error: Could not load audio file.");
            alert("Failed to load or decode the audio file. Please try another file.");
        }
    }
}

export default FileManager;
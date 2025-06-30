// public/js/modules/VoiceAgent.js
class VoiceAgent {
    constructor(audioEngine, uiManager, toolsConfig) {
        this.audioEngine = audioEngine;
        this.uiManager = uiManager;
        this.toolsConfig = toolsConfig;
        this.session = null;
    }

    get toolImplementations() {
        return {
            set_effect_parameter: (args) => {
                const { effect, parameter, value } = args;
                if (effect && parameter && value !== undefined) {
                    this.audioEngine.setEffect(effect, parameter, value);
                    this.uiManager.syncSlider(effect, parameter, value);
                }
            },
            set_playback_property: (args) => {
                const { property, value } = args;
                if (property && value !== undefined) {
                    this.audioEngine.setPlaybackProperty(property, value);
                    // 'volume' is the effect key, 'volume' is the param key
                    this.uiManager.syncSlider(property, property, value);
                }
            },
            seek_audio: (args) => {
                const { direction, seconds } = args;
                if (direction && seconds) {
                    const seekSeconds = direction === 'forward' ? seconds : -seconds;
                    this.audioEngine.seek(seekSeconds);
                }
            },
            playback_control: (args) => {
                switch (args.action) {
                    case 'play': this.audioEngine.play(); break;
                    case 'pause': this.audioEngine.pause(); break;
                    case 'stop': this.audioEngine.stop(); break;
                }
            }
        };
    }

    async startSession() {
        if (this.session) return;
        this.uiManager.updateVoiceStatus("Initializing session...", true);
        
        try {
            const response = await fetch('/api/session');
            const sessionData = await response.json();
            if (!response.ok) throw new Error(sessionData.error?.message);
            const ephemeralKey = sessionData.client_secret.value;
            this.uiManager.updateVoiceStatus("Requesting microphone...", true);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const peerConnection = new RTCPeerConnection();
            stream.getTracks().forEach(track => peerConnection.addTransceiver(track, { direction: 'sendrecv' }));

            peerConnection.ontrack = (event) => {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.autoplay = true;
            };

            const dataChannel = peerConnection.createDataChannel('oai-events');
            
            dataChannel.onopen = () => {
                this.uiManager.updateVoiceStatus("Connection open. Speak now!", true);
                // Send our tool list to the session
                dataChannel.send(JSON.stringify({
                    type: 'session.update',
                    session: { tools: this.toolsConfig }
                }));
            };

            dataChannel.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                console.log("📨 OpenAI:", message);

                if (message.type === 'response.function_call_arguments.done') {
                    const toolFunction = this.toolImplementations[message.name];
                    if (toolFunction) {
                        try {
                            const args = JSON.parse(message.arguments);
                            this.uiManager.showLastCommand(message.name, args);
                            toolFunction(args); // Result isn't needed for these tools
                            
                            const toolResponse = {
                                type: 'conversation.item.create', item: {
                                    type: 'function_call_output', call_id: message.call_id, output: JSON.stringify({success: true})
                                }
                            };
                            dataChannel.send(JSON.stringify(toolResponse));
                            dataChannel.send(JSON.stringify({ type: 'response.create' }));
                        } catch (e) { console.error("Tool exec error:", e); }
                    }
                } else if (message.type === 'response.done') {
                    this.uiManager.updateVoiceStatus("Listening...", true);
                }
            };
            
            this.session = { peerConnection, dataChannel, stream };

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            this.uiManager.updateVoiceStatus("Connecting to OpenAI...", true);

            const realtimeResponse = await fetch('https://api.openai.com/v1/realtime', {
                method: 'POST', headers: { 'Authorization': `Bearer ${ephemeralKey}`, 'Content-Type': 'application/sdp' }, body: offer.sdp
            });

            if (!realtimeResponse.ok) throw new Error(`API error: ${await realtimeResponse.text()}`);

            await peerConnection.setRemoteDescription({ type: 'answer', sdp: await realtimeResponse.text() });
        } catch (error) {
            console.error("❌ Voice session error:", error);
            this.uiManager.updateVoiceStatus(`Error: ${error.message}`, false);
            this.stopSession();
        }
    }

    stopSession() {
        if (!this.session) return;
        this.session.stream?.getTracks().forEach(t => t.stop());
        this.session.dataChannel?.close();
        this.session.peerConnection?.close();
        this.session = null;
        this.uiManager.updateVoiceStatus("Ready to start voice control.", false);
    }
}

export default VoiceAgent;
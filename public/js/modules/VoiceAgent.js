// public/js/modules/VoiceAgent.js
class VoiceAgent {
    constructor(audioEngine, uiManager) {
        this.audioEngine = audioEngine;
        this.uiManager = uiManager;
        this.session = null; // To hold peerConnection, dataChannel, stream, etc.
    }

    // --- Tool Implementations ---
    // These are the actual JavaScript functions that get executed when the AI calls a "tool".
    get toolImplementations() {
        return {
            set_effect_parameter: (args) => {
                console.log(`[Voice Tool] Executing 'set_effect_parameter' with:`, args);
                const { effect, parameter, value } = args;

                if (effect && parameter && value !== undefined) {
                    // Step 1: Tell the AudioEngine to change the actual sound.
                    this.audioEngine.setEffect(effect, parameter, value);
                    
                    // <<< THE FIX FOR UI SYNC >>>
                    // Step 2: Tell the UIManager to visually update the slider on the screen.
                    this.uiManager.syncSlider(effect, parameter, value);
                    
                    return { success: true, message: `Set ${effect} ${parameter} to ${value}` };
                }
                return { success: false, error: "Missing required arguments." };
            },
            playback_control: (args) => {
                console.log(`[Voice Tool] Executing 'playback_control' with:`, args);
                switch (args.action) {
                    case 'play':
                        this.audioEngine.play();
                        return { success: true, message: "Playback started." };
                    case 'pause':
                        this.audioEngine.stop(); 
                        return { success: true, message: "Playback paused/stopped." };
                    case 'stop':
                        this.audioEngine.stop();
                        return { success: true, message: "Playback stopped." };
                    default:
                        return { success: false, error: `Unknown action: ${args.action}` };
                }
            }
        };
    }

    async startSession() {
        if (this.session) return;
        this.uiManager.updateVoiceStatus("Initializing session...", true);
        
        try {
            // 1. Get session credentials from our server
            const response = await fetch('/api/session');
            const sessionData = await response.json();
            if (!response.ok || !sessionData.client_secret) {
                throw new Error(sessionData.error?.message || "Failed to get session token from server.");
            }
            const ephemeralKey = sessionData.client_secret.value;
            this.uiManager.updateVoiceStatus("Requesting microphone...", true);

            // 2. Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 3. Set up WebRTC Peer Connection
            const peerConnection = new RTCPeerConnection();
            stream.getTracks().forEach(track => peerConnection.addTransceiver(track, { direction: 'sendrecv' }));

            peerConnection.ontrack = (event) => {
                console.log("✅ Received audio track from OpenAI.");
                const audioElement = new Audio();
                audioElement.srcObject = event.streams[0];
                audioElement.autoplay = true;
            };

            // 4. Set up the data channel for tool calls
            const dataChannel = peerConnection.createDataChannel('oai-events');

            dataChannel.onopen = () => {
                this.uiManager.updateVoiceStatus("Connection open. Speak now!", true);
                console.log("✅ Data channel opened.");
            };

            dataChannel.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                console.log("📨 Received from OpenAI:", message);

                if (message.type === 'response.function_call_arguments.done') {
                    const toolFunction = this.toolImplementations[message.name];
                    if (toolFunction) {
                        try {
                            const args = JSON.parse(message.arguments);
                            const result = toolFunction(args);
                            
                            const toolResponse = {
                                type: 'conversation.item.create',
                                item: {
                                    type: 'function_call_output',
                                    call_id: message.call_id,
                                    output: JSON.stringify(result)
                                }
                            };
                            dataChannel.send(JSON.stringify(toolResponse));
                            dataChannel.send(JSON.stringify({ type: 'response.create' }));
                            
                        } catch (error) {
                            console.error("❌ Tool execution error:", error);
                        }
                    }
                } else if (message.type === 'response.done') {
                    this.uiManager.updateVoiceStatus("Listening...", true);
                }
            };
            
            this.session = { peerConnection, dataChannel, stream };

            // 5. Create WebRTC offer and connect
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            this.uiManager.updateVoiceStatus("Connecting to OpenAI...", true);

            const realtimeResponse = await fetch('https://api.openai.com/v1/realtime', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ephemeralKey}`,
                    'Content-Type': 'application/sdp'
                },
                body: offer.sdp
            });

            if (!realtimeResponse.ok) {
                const errorText = await realtimeResponse.text();
                throw new Error(`OpenAI Realtime API error: ${realtimeResponse.status} - ${errorText}`);
            }

            const answerSdp = await realtimeResponse.text();
            await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
            
            console.log("✅ WebRTC connection established.");

        } catch (error) {
            console.error("❌ Voice session error:", error);
            this.uiManager.updateVoiceStatus(`Error: ${error.message}`, false);
            this.stopSession();
        }
    }

    stopSession() {
        if (!this.session) return;
        
        this.session.stream?.getTracks().forEach(track => track.stop());
        this.session.dataChannel?.close();
        this.session.peerConnection?.close();
        this.session = null;
        
        this.uiManager.updateVoiceStatus("Ready to start voice control.", false);
        console.log("⏹️ Voice session cleaned up.");
    }
}

export default VoiceAgent;
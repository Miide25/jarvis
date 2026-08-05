// ==========================================================================
// J.A.R.V.I.S. SYSTEM ENGINE (Neural Dot & Dynamic Launcher Edition)
// ==========================================================================

// --- STATE MANAGEMENT ---
const AppState = {
    isListening: false,
    isSpeaking: false,
    apiKey: localStorage.getItem('jarvis_api_key') || '',
    model: localStorage.getItem('jarvis_model') || 'llama-3.3-70b-versatile',
    selectedVoiceName: localStorage.getItem('jarvis_voice_name') || '',
    chatHistory: [],
    systemUptime: 0,
    recognition: null,
    synthesis: window.speechSynthesis,
    activeVoice: null,
    continuousListening: false
};

// --- DOM ELEMENTS ---
const elements = {
    sysStatusText: document.getElementById('sys-status-text'),
    sysTime: document.getElementById('sys-time'),
    sysDate: document.getElementById('sys-date'),
    cpuTempBar: document.getElementById('cpu-temp-bar'),
    cpuTempVal: document.getElementById('cpu-temp-val'),
    ramUsageBar: document.getElementById('ram-usage-bar'),
    ramUsageVal: document.getElementById('ram-usage-val'),
    linkStatusBar: document.getElementById('link-status-bar'),
    linkStatusVal: document.getElementById('link-status-val'),
    statLatency: document.getElementById('stat-latency'),
    statUptime: document.getElementById('stat-uptime'),
    audioWaveBars: document.querySelectorAll('#audio-wave-bars .wave-bar'),
    reactorTrigger: document.getElementById('reactor-trigger'),
    reactorStatusMsg: document.getElementById('reactor-status-msg'),
    consoleLogs: document.getElementById('console-logs'),
    consoleInput: document.getElementById('console-input'),
    consoleSendBtn: document.getElementById('console-send-btn'),
    settingsTrigger: document.getElementById('settings-trigger'),
    settingsModal: document.getElementById('settings-modal'),
    settingsCancel: document.getElementById('settings-cancel'),
    settingsSave: document.getElementById('settings-save'),
    apiKeyInput: document.getElementById('api-key-input'),
    modelSelect: document.getElementById('model-select'),
    voiceSelect: document.getElementById('voice-select'),
    minimizeTrigger: document.getElementById('minimize-trigger'),
    restoreTrigger: document.getElementById('restore-trigger')
};

// --- SYSTEM UTILITIES ---

// Format Time: [HH:MM:SS]
function getTimestamp() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    return `[${hrs}:${mins}:${secs}]`;
}

// Log message to terminal console
function addLog(text, type = 'system') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    
    let prefix = '';
    if (type === 'system') prefix = 'SYSTEM: ';
    else if (type === 'info') prefix = 'J.A.R.V.I.S.: ';
    else if (type === 'user') prefix = 'USER: ';
    else if (type === 'warning') prefix = 'WARNING: ';
    else if (type === 'error') prefix = 'ERROR: ';
    
    logEntry.innerText = `${getTimestamp()} ${prefix}${text}`;
    elements.consoleLogs.appendChild(logEntry);
    elements.consoleLogs.scrollTop = elements.consoleLogs.scrollHeight;
}

// Update clock and date header
function updateClock() {
    const now = new Date();
    elements.sysTime.innerText = now.toTimeString().split(' ')[0];
    
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    elements.sysDate.innerText = `${day}.${month}.${year}`;
}

// Simulate system status fluctuations
function runDiagnostics() {
    // CPU Temp fluctuate around 40-46°C
    const temp = Math.floor(40 + Math.random() * 7);
    elements.cpuTempBar.style.width = `${(temp / 80) * 100}%`;
    elements.cpuTempVal.innerText = `${temp}°C`;

    // RAM Usage fluctuate around 25-30%
    const ram = Math.floor(25 + Math.random() * 6);
    elements.ramUsageBar.style.width = `${ram}%`;
    elements.ramUsageVal.innerText = `${ram}%`;

    // Latency fluctuate
    const latency = Math.floor(8 + Math.random() * 11);
    elements.statLatency.innerText = `${latency}ms`;

    // Increment Uptime
    AppState.systemUptime++;
    const uptMins = Math.floor(AppState.systemUptime / 60);
    const uptSecs = AppState.systemUptime % 60;
    elements.statUptime.innerText = `${String(uptMins).padStart(2, '0')}:${String(uptSecs).padStart(2, '0')}`;
}

// Animate audio waveform bars based on system states
let waveInterval = null;
function startWaveAnimations(mode) {
    if (waveInterval) clearInterval(waveInterval);
    
    waveInterval = setInterval(() => {
        elements.audioWaveBars.forEach(bar => {
            let height = '10%';
            let opacity = 0.3;
            
            if (mode === 'listening') {
                // Short pulsing orange waves
                height = `${Math.floor(Math.random() * 30) + 15}%`;
                opacity = 0.6;
                bar.style.backgroundColor = 'var(--color-orange)';
            } else if (mode === 'speaking') {
                // Tall active green waves
                height = `${Math.floor(Math.random() * 80) + 20}%`;
                opacity = 0.8;
                bar.style.backgroundColor = 'var(--color-green)';
            } else {
                // Flat idle cyan floating waves
                height = `${Math.floor(Math.sin(Date.now() / 200 + Array.from(elements.audioWaveBars).indexOf(bar)) * 10) + 15}%`;
                opacity = 0.4;
                bar.style.backgroundColor = 'var(--color-cyan)';
            }
            
            bar.style.height = height;
            bar.style.opacity = opacity;
        });
    }, 100);
}

// --- SPEECH RECOGNITION (THE EARS) ---
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addLog('Vocal input engine not supported by this browser. Manual console active.', 'warning');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        AppState.isListening = true;
        document.body.classList.add('listening');
        document.body.classList.remove('speaking');
        elements.sysStatusText.innerText = 'LISTENING...';
        elements.sysStatusText.className = 'status-value status-listening';
        elements.reactorStatusMsg.innerText = 'LISTENING';
        startWaveAnimations('listening');
        addLog('Voice capture session established.', 'system');
    };

    recognition.onerror = (event) => {
        addLog(`Speech Recognition Error: ${event.error}`, 'error');
        resetSpeechState();
    };

    recognition.onend = () => {
        AppState.isListening = false;
        document.body.classList.remove('listening');
        if (!AppState.isSpeaking) {
            elements.sysStatusText.innerText = 'ONLINE';
            elements.sysStatusText.className = 'status-value status-active';
            elements.reactorStatusMsg.innerText = 'STANDBY';
            startWaveAnimations('idle');
        }
        addLog('Voice capture session closed.', 'system');
    };

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        addLog(text, 'user');
        processCommand(text);
    };

    AppState.recognition = recognition;
}

function toggleListening() {
    if (!AppState.recognition) {
        initSpeechRecognition();
        if (!AppState.recognition) return;
    }

    if (AppState.isListening) {
        AppState.recognition.stop();
    } else {
        if (AppState.isSpeaking && AppState.synthesis) {
            AppState.synthesis.cancel(); // Stop talking if clicked while speaking
        }
        try {
            AppState.recognition.start();
        } catch (e) {
            addLog(`Failed to start recognition: ${e.message}`, 'error');
        }
    }
}

function resetSpeechState() {
    AppState.isListening = false;
    document.body.classList.remove('listening');
    elements.sysStatusText.innerText = 'ONLINE';
    elements.sysStatusText.className = 'status-value status-active';
    elements.reactorStatusMsg.innerText = 'STANDBY';
    startWaveAnimations('idle');
}

// --- SPEECH SYNTHESIS (THE VOICE) ---
function speak(text) {
    if (!AppState.synthesis) return;
    
    // Stop any current speech
    AppState.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select the saved voice profile
    if (AppState.activeVoice) {
        utterance.voice = AppState.activeVoice;
    }
    
    // Setup Jarvis properties
    utterance.pitch = 0.95; // Slightly deeper voice
    utterance.rate = 1.05;  // Slightly faster speech
    
    utterance.onstart = () => {
        AppState.isSpeaking = true;
        document.body.classList.add('speaking');
        document.body.classList.remove('listening');
        elements.sysStatusText.innerText = 'SPEAKING...';
        elements.sysStatusText.className = 'status-value status-speaking';
        elements.reactorStatusMsg.innerText = 'TRANSMITTING';
        startWaveAnimations('speaking');
    };
    
    utterance.onend = () => {
        AppState.isSpeaking = false;
        document.body.classList.remove('speaking');
        if (!AppState.isListening) {
            elements.sysStatusText.innerText = 'ONLINE';
            elements.sysStatusText.className = 'status-value status-active';
            elements.reactorStatusMsg.innerText = 'STANDBY';
            startWaveAnimations('idle');
        }
    };
    
    utterance.onerror = (event) => {
        addLog(`Speech synthesis error: ${event.error}`, 'error');
        AppState.isSpeaking = false;
        document.body.classList.remove('speaking');
        startWaveAnimations('idle');
    };
    
    AppState.synthesis.speak(utterance);
}

// Populate system voices list in settings modal
function populateVoiceList() {
    if (!AppState.synthesis) return;
    
    const voices = AppState.synthesis.getVoices();
    elements.voiceSelect.innerHTML = '';
    
    let defaultVoiceIndex = -1;
    
    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        
        if (voice.name === AppState.selectedVoiceName) {
            option.selected = true;
            AppState.activeVoice = voice;
        }
        
        // Look for male British/English voices by default for Jarvis feeling
        if (defaultVoiceIndex === -1 && 
            (voice.name.toLowerCase().includes('google uk english male') || 
             voice.name.toLowerCase().includes('hazel') ||
             voice.name.toLowerCase().includes('david') || 
             voice.name.toLowerCase().includes('microsoft male') || 
             voice.name.toLowerCase().includes('british') || 
             voice.lang.includes('en-GB'))) {
            defaultVoiceIndex = index;
        }
        
        elements.voiceSelect.appendChild(option);
    });
    
    // Select default voice if no user override
    if (!AppState.selectedVoiceName && defaultVoiceIndex !== -1 && elements.voiceSelect.options[defaultVoiceIndex]) {
        elements.voiceSelect.selectedIndex = defaultVoiceIndex;
        AppState.activeVoice = voices[defaultVoiceIndex];
        AppState.selectedVoiceName = voices[defaultVoiceIndex].name;
    }
}

// Handle voice load latency on Chrome
if (window.speechSynthesis) {
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();
}

// --- COGNITIVE CORE: GROQ API INTEGRATION ---
async function askGroq(promptText) {
    const apiKey = AppState.apiKey;
    if (!apiKey) {
        addLog('Missing Groq API Key. Falling back to Local Command Core.', 'warning');
        return { speakText: getOfflineFallback(promptText), action: null, param: null };
    }

    elements.sysStatusText.innerText = 'THINKING...';
    elements.sysStatusText.className = 'status-value';
    elements.reactorStatusMsg.innerText = 'PROCESSING';
    
    // Construct System Instruction guiding Jarvis and prompt for computer execution
    const systemInstruction = 
        "You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the sophisticated, loyal, and slightly witty AI assistant created by Tony Stark. " +
        "Your character traits: " +
        "1. Be extremely polite, referencing the user as 'Sir' or 'Ma'am'. " +
        "2. Speak in a clean, professional, British English cadence. " +
        "3. Keep answers concise, helpful, and conversational (usually 1-3 sentences maximum), because they will be read aloud. " +
        "4. Under no circumstances break character. You are J.A.R.V.I.S. " +
        "\n\n" +
        "COMPUTER AUTOMATION SYSTEM INSTRUCTION:\n" +
        "You have the capability to control the user's laptop. When the user asks you to perform an action on their computer (like opening an application, browser, camera, settings, notepad, calculator, spotify, discord, steam etc.), you MUST respond ONLY with a JSON object containing the action. " +
        "Available actions are:\n" +
        "- 'open_app': to launch any application. You MUST pass the application name as the 'param' value in lowercase (e.g. 'spotify', 'chrome', 'discord', 'code', 'explorer', 'notepad').\n" +
        "- 'volume_up': to turn up the volume\n" +
        "- 'volume_down': to turn down the volume\n" +
        "- 'volume_mute': to mute/unmute the system\n" +
        "\n" +
        "If they request one of these actions, reply in this EXACT JSON structure, with NO extra text or markdown code blocks outside the JSON:\n" +
        "{\n" +
        "  \"speak\": \"A brief, polite voice description of what you are doing (e.g., 'Launching Spotify now, Sir.')\",\n" +
        "  \"action\": \"open_app\",\n" +
        "  \"param\": \"[application name (e.g. spotify, chrome, discord)]\"\n" +
        "}\n" +
        "\n" +
        "If they do not request any computer control action, respond with a normal conversational sentence (do not use JSON).";

    // Manage history
    AppState.chatHistory.push({
        role: "user",
        content: promptText
    });

    if (AppState.chatHistory.length > 12) {
        AppState.chatHistory = AppState.chatHistory.slice(-12);
    }

    // Prepare OpenAI compatible messages array
    const messages = [
        { role: "system", content: systemInstruction },
        ...AppState.chatHistory
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: AppState.model,
                messages: messages,
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        
        // Add raw output to memory
        AppState.chatHistory.push({
            role: "assistant",
            content: rawContent
        });

        // Try parsing output as JSON to see if Groq decided to perform an automation action
        let parsedAction = null;
        let parsedParam = null;
        let speakText = rawContent;
        
        // Clean markdown blocks if LLM returns them
        let cleanContent = rawContent.trim();
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.substring(7);
        }
        if (cleanContent.endsWith('```')) {
            cleanContent = cleanContent.substring(0, cleanContent.length - 3);
        }
        cleanContent = cleanContent.trim();

        if (cleanContent.startsWith('{') && cleanContent.endsWith('}')) {
            try {
                const parsed = JSON.parse(cleanContent);
                if (parsed.speak && parsed.action) {
                    speakText = parsed.speak;
                    parsedAction = parsed.action;
                    parsedParam = parsed.param || null;
                }
            } catch (jsonErr) {
                // Not valid JSON, keep as standard text
            }
        }

        return { speakText, action: parsedAction, param: parsedParam };

    } catch (error) {
        addLog(`Cognitive synapse fail: ${error.message}`, 'error');
        AppState.chatHistory.pop(); // Remove failed prompt
        return { 
            speakText: `My apologies, Sir. My cognitive synapse with Groq failed: ${error.message}.`, 
            action: null,
            param: null
        };
    }
}

// Local offline fallback replies
function getOfflineFallback(prompt) {
    const text = prompt.toLowerCase();
    
    if (text.includes('hello') || text.includes('hi ') || text.includes('hey')) {
        return "Hello, Sir. I am currently running on local fallback protocols. How may I be of service?";
    } else if (text.includes('who are you')) {
        return "I am J.A.R.V.I.S., Sir. A personal assistant system designed by Tony Stark, running in local fallback mode.";
    } else if (text.includes('thank you') || text.includes('thanks')) {
        return "Always a pleasure, Sir.";
    } else if (text.includes('iron man')) {
        return "An exceptional suit of armor, Sir. Built to protect humanity, though maintaining it is a full-time endeavor.";
    } else if (text.includes('tony stark')) {
        return "Mr. Stark is currently unavailable, Sir. He left me in charge of system diagnostics.";
    }
    
    return "My cognitive uplink is currently offline. If you open my settings panel and insert a Groq API key, I will be fully intelligent, Sir.";
}

// --- SYSTEM HARDWARE CONTROL API ---
async function readApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    if (!contentType.includes('application/json')) {
        const preview = responseText.replace(/\s+/g, ' ').slice(0, 120);
        throw new Error(`Mainframe returned HTTP ${response.status} instead of JSON${preview ? `: ${preview}` : ''}`);
    }

    try {
        return JSON.parse(responseText);
    } catch {
        throw new Error(`Mainframe returned malformed JSON (HTTP ${response.status})`);
    }
}

async function executeLaptopAction(action, param = null) {
    addLog(`Initiating system protocol for action: ${action} ${param ? `(${param})` : ''}...`, 'system');
    
    try {
        const payload = { action: action };
        if (param) payload.param = param;

        const response = await fetch('/api/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await readApiResponse(response);
        
        if (data.success) {
            addLog(`System protocol '${action}' completed successfully.`, 'system');
        } else {
            addLog(`System protocol error: ${data.error || `HTTP ${response.status}`}`, 'error');
        }
    } catch (err) {
        addLog(`Mainframe connection error: ${err.message}`, 'error');
    }
}

// --- COMMAND PARSING & DISPATCHER ---
async function processCommand(rawInput) {
    const input = rawInput.trim();
    if (!input) return;

    const normalized = input.toLowerCase();

    // 1. FAST LOCAL MATCHING (For instant response without LLM API roundtrips)
    if (normalized === 'status' || normalized === 'system status' || normalized.includes('diagnostics')) {
        addLog('Reading system cores...', 'system');
        const reply = `Status details, Sir. Temperature is at ${elements.cpuTempVal.innerText}, memory load is nominal at ${elements.ramUsageVal.innerText}, and neural sync speed is logged at ${elements.statLatency.innerText}. All subsystems are fully operational.`;
        addLog(reply, 'info');
        speak(reply);
        return;
    }

    if (normalized.includes('time') && (normalized.includes('what') || normalized.includes('get') || normalized.includes('tell'))) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const reply = `The time is exactly ${timeStr}, Sir.`;
        addLog(reply, 'info');
        speak(reply);
        return;
    }

    if (normalized.includes('date') || normalized.includes('what day is today') || normalized.includes('today')) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = new Date().toLocaleDateString(undefined, options);
        const reply = `It is ${dateStr}, Sir.`;
        addLog(reply, 'info');
        speak(reply);
        return;
    }

    // Fast-path for launching standard and dynamic applications
    if (normalized.startsWith('open ') && !normalized.includes('web')) {
        const appName = normalized.substring(5).trim();
        
        // Map legacy single words
        let targetApp = appName;
        if (appName === 'browser') targetApp = 'chrome';
        else if (appName === 'calc') targetApp = 'calculator';

        const reply = `Opening ${targetApp}, Sir.`;
        addLog(reply, 'info');
        speak(reply);
        executeLaptopAction('open_app', targetApp);
        return;
    }

    if (normalized === 'volume up' || normalized === 'turn up volume') {
        addLog("Increasing master volume, Sir.", 'info');
        speak("Increasing volume, Sir.");
        executeLaptopAction('volume_up');
        return;
    }

    if (normalized === 'volume down' || normalized === 'turn down volume') {
        addLog("Reducing master volume, Sir.", 'info');
        speak("Lowering volume, Sir.");
        executeLaptopAction('volume_down');
        return;
    }

    if (normalized === 'mute' || normalized === 'mute volume' || normalized === 'unmute') {
        addLog("Toggling master mute command, Sir.", 'info');
        speak("Toggling volume mute, Sir.");
        executeLaptopAction('volume_mute');
        return;
    }

    // Command: WEB SEARCH
    if (normalized.startsWith('search ') || normalized.startsWith('search the web for ')) {
        let query = '';
        if (normalized.startsWith('search the web for ')) {
            query = input.substring(19);
        } else {
            query = input.substring(7);
        }
        
        const reply = `Searching the database for "${query}", Sir. Opening a secure browser link now.`;
        addLog(reply, 'info');
        speak(reply);
        
        setTimeout(() => {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }, 1000);
        return;
    }

    if (normalized === 'clear' || normalized === 'clear console' || normalized === 'cls') {
        elements.consoleLogs.innerHTML = '';
        addLog('Terminal logs flushed. Core diagnostics active.', 'system');
        return;
    }

    if (normalized === 'help' || normalized === 'menu') {
        addLog('LOCAL KEYWORDS AVAILABLE:');
        addLog(' - "status": Check core diagnostics.');
        addLog(' - "time": Query the local time.');
        addLog(' - "date": Query current date.');
        addLog(' - "open [appname]": Open any app (e.g. spotify, camera, settings, notepad).');
        addLog(' - "volume up" / "volume down" / "mute": Adjust laptop volume.');
        addLog(' - "search [query]": Launch Google search.');
        addLog(' - "clear": Flush terminal log screen.');
        return;
    }

    // 2. CONVERSATIONAL/AGENTIC ROUTING (Let Groq process the intent and decide system commands)
    addLog('Cognitive core query dispatched...', 'system');
    const result = await askGroq(input);
    
    // Log speech and speak
    addLog(result.speakText, 'info');
    speak(result.speakText);
    
    // Trigger local backend action if Groq decided to run one
    if (result.action) {
        executeLaptopAction(result.action, result.param);
    }
}

// --- EVENT HANDLERS & INITIALIZATION ---

// Handle manual terminal input
function handleManualSend() {
    const text = elements.consoleInput.value;
    if (!text.trim()) return;
    
    addLog(text, 'user');
    elements.consoleInput.value = '';
    processCommand(text);
}

// Keyboard shortcuts (Space to toggle voice recognition)
document.addEventListener('keydown', (event) => {
    // Avoid triggering when user is writing in input box or settings inputs
    if (document.activeElement === elements.consoleInput || 
        document.activeElement === elements.apiKeyInput) {
        return;
    }

    if (event.code === 'Space') {
        event.preventDefault(); // Stop page scrolling
        toggleListening();
    }
});

// Configure Settings Modal
elements.settingsTrigger.onclick = () => {
    elements.apiKeyInput.value = AppState.apiKey;
    elements.modelSelect.value = AppState.model;
    populateVoiceList();
    elements.settingsModal.classList.add('active');
};

elements.settingsCancel.onclick = () => {
    elements.settingsModal.classList.remove('active');
};

// Close modal if user clicks background
elements.settingsModal.onclick = (e) => {
    if (e.target === elements.settingsModal) {
        elements.settingsModal.classList.remove('active');
    }
};

elements.settingsSave.onclick = () => {
    const newKey = elements.apiKeyInput.value.trim();
    const newModel = elements.modelSelect.value;
    const newVoiceName = elements.voiceSelect.value;
    
    AppState.apiKey = newKey;
    AppState.model = newModel;
    AppState.selectedVoiceName = newVoiceName;
    
    localStorage.setItem('jarvis_api_key', newKey);
    localStorage.setItem('jarvis_model', newModel);
    localStorage.setItem('jarvis_voice_name', newVoiceName);
    
    // Bind the voice index
    const voices = AppState.synthesis.getVoices();
    AppState.activeVoice = voices.find(v => v.name === newVoiceName) || null;

    if (newKey) {
        elements.linkStatusBar.style.width = '100%';
        elements.linkStatusVal.innerText = 'CLOUD INTEGRATED';
        addLog(`Cognitive synapse sync profile updated. Connected to Groq model: ${newModel}`, 'system');
    } else {
        elements.linkStatusBar.style.width = '50%';
        elements.linkStatusVal.innerText = 'LOCAL SYNCED';
        addLog('Cognitive synapse updated. Core operating in localized offline mode.', 'system');
    }
    
    elements.settingsModal.classList.remove('active');
};

// Compact mode triggers
elements.minimizeTrigger.onclick = () => {
    document.body.classList.add('compact-mode');
    addLog('Mainframe displaying collapsed Neural Dot HUD.', 'system');
};

elements.restoreTrigger.onclick = () => {
    document.body.classList.remove('compact-mode');
    addLog('Mainframe displaying full system grid.', 'system');
};

// Bind Core button trigger
elements.reactorTrigger.onclick = toggleListening;

// Bind send button and Enter key
elements.consoleSendBtn.onclick = handleManualSend;
elements.consoleInput.onkeydown = (e) => {
    if (e.key === 'Enter') handleManualSend();
};

// Start System Heartbeat
function initializeSystem() {
    updateClock();
    setInterval(updateClock, 1000);
    
    runDiagnostics();
    setInterval(runDiagnostics, 3000);
    
    startWaveAnimations('idle');
    
    // Initial welcome text log
    addLog('System online. Local mainframe operating at full efficiency.', 'system');
    
    if (AppState.apiKey) {
        elements.linkStatusBar.style.width = '100%';
        elements.linkStatusVal.innerText = 'CLOUD INTEGRATED';
        addLog(`Cognitive synapse initialized. Groq Core: ${AppState.model}`, 'system');
    } else {
        elements.linkStatusBar.style.width = '50%';
        elements.linkStatusVal.innerText = 'LOCAL SYNCED';
        addLog('Cognitive synapse standing by in Local Mode. Enter Groq Key in settings.', 'warning');
    }
    
    initSpeechRecognition();
}

window.onload = initializeSystem;

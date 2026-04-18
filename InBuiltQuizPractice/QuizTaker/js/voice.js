/**
 * QUIZ APP — voice.js
 * Handles hands-free voice commands using Web Speech API
 */

const VoiceEngine = (() => {
  let _recognition = null;
  let _active = false;
  let _isStarted = false;
  let _isLearning = false;

  const COMMANDS = {
    NEXT: ['next', 'continue', 'forward', 'show next', 'next concept'],
    BACK: ['back', 'previous', 'go back', 'behind'],
    SELECT_A: ['select a', 'option a', 'choice a', 'answer a', 'select 1', 'option 1', 'choice 1'],
    SELECT_B: ['select b', 'option b', 'choice b', 'answer b', 'select 2', 'option 2', 'choice 2'],
    SELECT_C: ['select c', 'option c', 'choice c', 'answer c', 'select 3', 'option 3', 'choice 3'],
    SELECT_D: ['select d', 'option d', 'choice d', 'answer d', 'select 4', 'option 4', 'choice 4'],
    SELECT_E: ['select e', 'option e', 'choice e', 'answer e', 'select 5', 'option 5', 'choice 5'],
    TYPE: ['type', 'answer is', 'fill', 'input'],
    ZEN: ['zen', 'focus', 'zen mode', 'focus mode'],
    FINISH: ['finish', 'submit', 'complete', 'end quiz'],
    HINT: ['hint', 'help', 'give me a hint'],
    SPEAK: ['read', 'speak', 'read question', 'read out loud']
  };

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    _recognition = new SpeechRecognition();
    _recognition.continuous = true;
    _recognition.interimResults = false;
    _recognition.lang = 'en-US';

    _recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      updateStatusDisplay(transcript);
      processCommand(transcript);
    };

    _recognition.onstart = () => {
      _isStarted = true;
      updateStatusDisplay("Listening...", true);
    };

    _recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'no-speech') return; // Ignore silent periods
      
      updateStatusDisplay("Error: " + event.error, false);
      if (event.error === 'not-allowed') {
        _active = false;
        UI.toast("Voice access denied. Please allow microphone.", "error");
        hideStatusBar();
      }
    };

    _recognition.onend = () => {
      _isStarted = false;
      if (_active) {
        // Delay restart slightly to let browser breathe
        setTimeout(() => {
          if (_active && !_isStarted) {
            try { _recognition.start(); } catch(e) {}
          }
        }, 300);
      } else {
        hideStatusBar();
      }
    };
  }

  function toggle() {
    if (!_recognition) {
      UI.toast("Voice Recognition not supported in this browser.", "error");
      return;
    }

    _active = !_active;
    if (_active) {
      if (window.location.protocol === 'file:') {
        UI.toast("Running locally (file://). Chrome will prompt for Mic each session. Use a local server for persistent access.", "info", 6000);
      }
      
      if (!_isStarted) {
        try {
          _recognition.start();
        } catch(e) {
          console.warn("Recognition already started");
        }
      }
      showStatusBar();
      UI.toast("Voice Mode Active", "success");
      document.body.classList.add('voice-active');
    } else {
      stop();
      UI.toast("Voice Mode Deactivated", "info");
    }
    return _active;
  }

  function stop() {
    _active = false;
    try { _recognition.stop(); } catch(e) {}
    hideStatusBar();
    UI.stopSpeaking();
    document.body.classList.remove('voice-active');
  }

  function showStatusBar() {
    let el = document.getElementById('voice-status-bar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'voice-status-bar';
      el.innerHTML = `
        <div class="voice-bar-content">
           <div class="mic-orbit">
              <div class="mic-pulse"></div>
              <div class="mic-icon">🎙️</div>
           </div>
           <div class="transcript-area">
              <span class="status-label">VOICE CONTROL</span>
              <p id="voice-transcript">Waiting for command...</p>
           </div>
           <div class="voice-actions">
              <button class="close-btn" onclick="QuizEngine.toggleVoice()">×</button>
           </div>
        </div>
        <style>
          #voice-status-bar { 
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
            background: rgba(15, 15, 15, 0.95); backdrop-filter: blur(10px);
            border: 1px solid var(--border-color); border-radius: 20px;
            padding: 12px 20px; z-index: 10000; width: 400px; max-width: 90vw;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            animation: slideInUp 0.4s var(--ease);
          }
          .voice-bar-content { display: flex; align-items: center; gap: 15px; }
          
          .mic-orbit { position: relative; width: 40px; height: 40px; display: grid; place-items: center; }
          .mic-icon { font-size: 1.2rem; z-index: 2; }
          .mic-pulse { position: absolute; inset: 0; background: var(--accent-primary); border-radius: 50%; opacity: 0.3; animation: pulse 2s infinite; }
          
          .transcript-area { flex: 1; text-align: left; }
          .status-label { font-size: 0.6rem; font-weight: 900; color: var(--accent-primary); letter-spacing: 1px; }
          #voice-transcript { font-size: 0.85rem; color: #fff; margin: 2px 0 0 0; font-weight: 500; }
          
          .voice-actions { display: flex; gap: 8px; }
          .stop-btn { background: #ef444422; color: #ef4444; border: 1px solid #ef444444; padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 800; }
          .close-btn { background: transparent; color: var(--text-muted); border: none; font-size: 1.2rem; cursor: pointer; }
          
          @keyframes slideInUp { from { transform: translate(-50%, 100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        </style>
      `;
      document.body.appendChild(el);
    }
  }

  function hideStatusBar() {
    const el = document.getElementById('voice-status-bar');
    if (el) el.remove();
  }

  function updateStatusDisplay(text, isListening = false) {
    const el = document.getElementById('voice-transcript');
    if (el) el.innerText = text;
  }

  function processCommand(text) {
    if (match(text, COMMANDS.NEXT)) {
      QuizEngine.next();
    } else if (match(text, COMMANDS.BACK)) {
      QuizEngine.prev();
    } else if (match(text, COMMANDS.SELECT_A)) {
      selectOption(0);
    } else if (match(text, COMMANDS.SELECT_B)) {
      selectOption(1);
    } else if (match(text, COMMANDS.SELECT_C)) {
      selectOption(2);
    } else if (match(text, COMMANDS.SELECT_D)) {
      selectOption(3);
    } else if (match(text, COMMANDS.SELECT_E)) {
      selectOption(4);
    } else if (match(text, COMMANDS.ZEN)) {
      QuizEngine.toggleZen();
    } else if (match(text, COMMANDS.FINISH)) {
      QuizEngine.confirmSubmit();
    } else if (match(text, COMMANDS.HINT)) {
      QuizEngine.showHint();
    } else if (match(text, COMMANDS.SPEAK)) {
      const q = State.get("quiz").questions[State.get("quiz").currentIdx];
      UI.speak(q.Question || q.text || "");
    } else if (match(text, COMMANDS.TYPE)) {
      handleTypeCommand(text);
    } else {
      // DYNAMIC CLICKER: If no command matches, search for text in UI
      clickElementByText(text);
    }
  }

  function clickElementByText(text) {
    if (!text || text.length < 2) return;
    
    // Find all clickable-like elements
    const selectors = 'button, a, .option-card, .nav-item, .btn, .sat-q-box, label, option';
    const elements = document.querySelectorAll(selectors);
    
    let bestMatch = null;
    let maxMatch = 0;

    for (const el of elements) {
      if (el.offsetParent === null) continue; // Skip hidden
      
      const elText = el.innerText.toLowerCase().trim();
      const val = el.dataset.val ? el.dataset.val.toLowerCase().trim() : "";
      
      if (elText === text || val === text) {
        bestMatch = el;
        break; // Exact match found
      }
      
      if (elText.length > 2 && (elText.includes(text) || text.includes(elText))) {
        if (elText.length > maxMatch) {
          maxMatch = elText.length;
          bestMatch = el;
        }
      }
    }

    if (bestMatch) {
      if (bestMatch.tagName === 'LABEL') {
         const input = document.getElementById(bestMatch.htmlFor) || bestMatch.querySelector('input');
         if (input) input.click();
      } else if (bestMatch.tagName === 'OPTION') {
         const select = bestMatch.parentNode;
         if (select && select.tagName === 'SELECT') {
            select.value = bestMatch.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
         }
      } else {
         bestMatch.click();
      }
      
      updateStatusDisplay(`Clicked: "${bestMatch.innerText.substring(0, 20)}..."`);
      UI.toast(`Clicked: ${bestMatch.innerText.substring(0, 15)}`, "info");
    }
  }

  function handleTypeCommand(text) {
    const keywords = COMMANDS.TYPE;
    let payload = "";
    for (let k of keywords) {
      if (text.startsWith(k)) {
        payload = text.replace(k, "").trim();
        break;
      }
    }
    
    if (payload) {
      const inputs = document.querySelectorAll('input[type="text"], textarea, .form-control');
      const target = Array.from(inputs).find(i => i.offsetParent !== null); // Find visible input
      if (target) {
        target.value = payload;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        UI.toast(`Entered: "${payload}"`, "info");
      } else {
        UI.toast("No text field found for typing", "warn");
      }
    }
  }

  function match(text, list) {
    return list.some(cmd => text.startsWith(cmd) || text.includes(cmd));
  }

  function selectOption(index) {
    // 1. Try option-card (custom UI)
    const options = document.querySelectorAll('.option-card');
    if (options[index]) {
      options[index].click();
      UI.toast("Selected Option " + String.fromCharCode(65 + index), "info");
      return;
    }

    // 2. Try native radio/checkbox
    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    if (inputs[index]) {
      inputs[index].click();
      UI.toast("Toggled Input " + (index + 1), "info");
      return;
    }

    // 3. Try select elements
    const selects = document.querySelectorAll('select');
    if (selects.length > 0) {
      const firstSelect = selects[0];
      if (firstSelect.options[index + 1]) {
        firstSelect.selectedIndex = index + 1;
        firstSelect.dispatchEvent(new Event('change', { bubbles: true }));
        UI.toast("Selected from dropdown", "info");
        return;
      }
    }

    UI.toast("Option not found", "warn");
  }

  return { init, toggle, stop, isActive: () => _active };
})();

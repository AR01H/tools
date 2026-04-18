/**
 * QUIZ APP — voice.js
 * Enhanced hands-free voice commands with:
 * - Noise filter, Confidence threshold
 * - Voice confirmation for dangerous actions
 * - Confirm selection readback
 * - Verbose mode
 * - "How much time left?" + auto time warnings
 * - Animated circular waveform
 * - "What can I say?" help overlay
 * - "I don't know" skip + flag
 */

const VoiceEngine = (() => {
  let _recognition  = null;
  let _active       = false;
  let _isStarted    = false;
  let _isSpeaking   = false;   // true while TTS is playing
  let _lastSpoken   = "";
  let _verbose      = false;
  let _pendingConfirm = null;
  let _lastCmdTime  = 0;        // for command cooldown
  let _watchdogTimer = null;    // restarts recognition if it silently dies
  let _currentLang   = 'en-US'; // Active recognition & TTS language
  let _speakRate     = 1.0;     // TTS speed playback base
  let _holdToTalk    = false;   // is Shift held?

  // Waveform
  let _audioCtx        = null;
  let _analyser        = null;
  let _waveAnimFrame   = null;

  // Time warnings
  let _timeWarned        = { fiveMin: false, oneMin: false, thirtyS: false };
  let _timeCheckInterval = null;

  // Status bar animation
  let _typingInterval  = null;
  let _resetColorTimer = null;

  const CONFIDENCE_THRESHOLD = 0.42;
  const CMD_COOLDOWN_MS      = 700;   // min ms between commands

  // ── Command Definitions ───────────────────────────────────
  // Each entry: { c: [phrases], color, icon, label }
  const CMD = {
    // Navigation — green
    NEXT:  { c: ['next','continue','forward','show next','next concept','next question','next one','move on','go next'], color:'#22c55e', icon:'→', label:'NEXT' },
    BACK:  { c: ['back','previous','go back','behind','previous question','previous one','go previous'], color:'#22c55e', icon:'←', label:'BACK' },
    JUMP:  { c: ['go to','jump to','question number','goto','navigate to', 'come to'], color:'#22c55e', icon:'⤵', label:'JUMP' },

    // Selection — cyan
    SELECT_A: { c: ['select a','option a','choice a','answer a','select 1','option 1','option one','select one','first option','number one'], color:'#06b6d4', icon:'A', label:'SELECT A' },
    SELECT_B: { c: ['select b','option b','choice b','answer b','select 2','option 2','option two','select two','second option','number two'], color:'#06b6d4', icon:'B', label:'SELECT B' },
    SELECT_C: { c: ['select c','option c','choice c','answer c','select 3','option 3','option three','select three','third option','number three'], color:'#06b6d4', icon:'C', label:'SELECT C' },
    SELECT_D: { c: ['select d','option d','choice d','answer d','select 4','option 4','option four','select four','fourth option','number four'], color:'#06b6d4', icon:'D', label:'SELECT D' },
    SELECT_E: { c: ['select e','option e','choice e','answer e','select 5','option 5','option five','select five','fifth option','number five'], color:'#06b6d4', icon:'E', label:'SELECT E' },
    CLEAR:    { c: ['clear answer','clear','clear selection','deselect','remove answer','unselect','reset answer'], color:'#06b6d4', icon:'✕', label:'CLEAR' },

    // Reading — indigo
    SPEAK_Q:    { c: ['read question','read the question','read out loud','speak question','say question','read it'], color:'#818cf8', icon:'🔊', label:'READ Q' },
    SPEAK_OPTS: { c: ['read options','read all options','read choices','list options','what are the options','read all'], color:'#818cf8', icon:'📋', label:'READ ALL' },
    SPEAK_A:    { c: ['read option a','read choice a','read a','what is option a','read option 1','read first'], color:'#818cf8', icon:'🔊A', label:'READ A' },
    SPEAK_B:    { c: ['read option b','read choice b','read b','what is option b','read option 2','read second'], color:'#818cf8', icon:'🔊B', label:'READ B' },
    SPEAK_C:    { c: ['read option c','read choice c','read c','what is option c','read option 3','read third'], color:'#818cf8', icon:'🔊C', label:'READ C' },
    SPEAK_D:    { c: ['read option d','read choice d','read d','what is option d','read option 4','read fourth'], color:'#818cf8', icon:'🔊D', label:'READ D' },
    REPEAT:     { c: ['repeat','say again','again','repeat that','say it again'], color:'#818cf8', icon:'↩', label:'REPEAT' },

    // Actions — orange
    MARK:      { c: ['flag','mark','flag question','mark question','mark for review','flag for review','bookmark'], color:'#f97316', icon:'🚩', label:'MARK' },
    HINT:      { c: ['hint','help','give me a hint','show hint','need help'], color:'#f97316', icon:'💡', label:'HINT' },
    PAUSE:     { c: ['pause','pause quiz','pause timer','hold on','wait'], color:'#f97316', icon:'⏸', label:'PAUSE' },
    TYPE:      { c: ['type','answer is','fill','input','write','enter'], color:'#f97316', icon:'⌨', label:'TYPE' },
    DONT_KNOW: { c: ["i don't know","i dont know","skip","not sure","pass question","skip question","don't know","no idea","i have no idea"], color:'#f97316', icon:'?', label:'SKIP' },

    // Info — yellow
    PROGRESS:  { c: ['progress','how many','my progress','how many answered','quiz status','how far'], color:'#eab308', icon:'📊', label:'PROGRESS' },
    TIME_LEFT: { c: ['how much time','time left','how long','remaining time','how many minutes','whats the time','timer'], color:'#eab308', icon:'⏱', label:'TIME' },

    // Speed Control
    SPEED_UP:     { c: ['speed up', 'speak faster', 'read faster', 'faster'], color:'#8b5cf6', icon:'⏩', label:'FASTER' },
    SPEED_DOWN:   { c: ['slow down', 'speak slower', 'read slower', 'slower'], color:'#8b5cf6', icon:'⏪', label:'SLOWER' },
    SPEED_NORMAL: { c: ['normal speed', 'default speed', 'reset speed'], color:'#8b5cf6', icon:'▶️', label:'NORMAL SPD' },

    // Eliminate specific options
    ELIM_A: { c: ['eliminate a', 'cross out a', 'remove a', 'dim a'], color:'#64748b', icon:'A✕', label:'ELIM A' },
    ELIM_B: { c: ['eliminate b', 'cross out b', 'remove b', 'dim b'], color:'#64748b', icon:'B✕', label:'ELIM B' },
    ELIM_C: { c: ['eliminate c', 'cross out c', 'remove c', 'dim c'], color:'#64748b', icon:'C✕', label:'ELIM C' },
    ELIM_D: { c: ['eliminate d', 'cross out d', 'remove d', 'dim d'], color:'#64748b', icon:'D✕', label:'ELIM D' },
    ELIM_E: { c: ['eliminate e', 'cross out e', 'remove e', 'dim e'], color:'#64748b', icon:'E✕', label:'ELIM E' },
    RESTORE_OPTS: { c: ['restore options', 'uneliminate', 'reset options', 'show all options'], color:'#64748b', icon:'↺', label:'RESTORE' },

    // Verbose — violet
    VERBOSE_ON:  { c: ['verbose mode','verbose on','detailed mode','full mode','read mode on','turn on verbose'], color:'#a78bfa', icon:'📢', label:'VERBOSE ON' },
    VERBOSE_OFF: { c: ['verbose off','quiet mode','silent mode','read mode off','turn off verbose','concise mode'], color:'#a78bfa', icon:'🔇', label:'VERBOSE OFF' },

    // Help
    HELP: { c: ['what can i say','help me','show commands','command list','show help','voice help','what commands'], color:'#f0abfc', icon:'❓', label:'HELP' },

    // Language
    LANG_US: { c: ['switch to us english','american english','use us english'], color:'#3b82f6', icon:'🇺🇸', label:'EN-US' },
    LANG_UK: { c: ['switch to uk english','british english','use uk english'],  color:'#3b82f6', icon:'🇬🇧', label:'EN-GB' },
    LANG_IN: { c: ['switch to indian english','indian english','use indian english'], color:'#3b82f6', icon:'🇮🇳', label:'EN-IN' },

    // Confirmation interceptors
    CONFIRM: { c: ['confirm','yes confirm','yes do it','proceed','yes proceed','do it','yes'], color:'#22c55e', icon:'✔', label:'CONFIRM' },
    CANCEL:  { c: ['cancel','no cancel','stop it','abort','never mind','no'], color:'#ef4444', icon:'✕', label:'CANCEL' },

    // Danger — red (require voice confirmation)
    FINISH: { c: ['finish','end quiz','complete','done with quiz','i am done','end test'], color:'#ef4444', icon:'⚑', label:'FINISH' },
    SUBMIT: { c: ['submit quiz','submit all','submit answers','confirm submit','submit my answers'], color:'#ef4444', icon:'✔', label:'SUBMIT' },

    // Console — purple
    OPEN_CONSOLE:  { c: ['open command','open console','show command','show console','command mode','open cli'], color:'#a855f7', icon:'⎣', label:'CONSOLE ON' },
    CLOSE_CONSOLE: { c: ['close command','close console','hide command','hide console','exit command','close cli'], color:'#a855f7', icon:'⎤', label:'CONSOLE OFF' },
  };

  // ── Init ─────────────────────────────────────────────────
  function init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { console.warn('Speech recognition not supported.'); return; }

    _recognition = new SR();
    _recognition.continuous      = true;
    _recognition.interimResults  = false;
    _recognition.lang            = _currentLang;
    _recognition.maxAlternatives = 3;

    _recognition.onresult = (event) => {
      // Ignore anything picked up while TTS is playing
      if (_isSpeaking) return;

      const result     = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase().trim();
      const confidence = result[0].confidence;

      if (!passesNoiseFilter(transcript, confidence)) return;

      // Command cooldown — prevent double-fire
      const now = Date.now();
      if (now - _lastCmdTime < CMD_COOLDOWN_MS) return;
      _lastCmdTime = now;

      updateStatusDisplay(transcript, 'listening');
      processCommand(transcript);
    };

    _recognition.onstart = () => {
      _isStarted = true;
      updateStatusDisplay('Listening for commands...', 'listening');
    };

    _recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;  // normal — ignore
      if (event.error === 'aborted')   return;  // happens during TTS pause — ignore
      console.warn('[Voice] Recognition error:', event.error);
      updateStatusDisplay('Error: ' + event.error, 'error');
      if (event.error === 'not-allowed') {
        _active = false;
        UI.toast('Microphone access denied.', 'error');
        hideStatusBar();
      }
      // For all other errors (network, audio-capture) attempt auto-restart
      else if (_active) {
        setTimeout(() => {
          if (_active && !_isStarted && !_isSpeaking) {
            try { _recognition.start(); } catch(e) {}
          }
        }, 800);
      }
    };

    _recognition.onend = () => {
      _isStarted = false;
      if (_active) {
        // Delay restart — if TTS is playing, wait until it finishes
        const delay = _isSpeaking ? 1200 : 350;
        setTimeout(() => {
          if (_active && !_isStarted && !_isSpeaking) {
            try { _recognition.start(); } catch(e) {}
          }
        }, delay);
      } else {
        hideStatusBar();
      }
    };
  }

  // ── Noise Filter ──────────────────────────────────────────
  function passesNoiseFilter(text, confidence) {
    if (!text || text.length < 2) return false;
    if (/^\d+$/.test(text)) return false;
    if (confidence !== undefined && confidence < CONFIDENCE_THRESHOLD) {
      console.log(`[Voice] Low confidence (${confidence.toFixed(2)}): "${text}" — ignored`);
      return false;
    }
    const junk = ['uh','um','ah','hmm','hm','oh','a','the','and','or','so','like'];
    if (junk.includes(text)) return false;
    return true;
  }

  // ── Toggle / Stop ─────────────────────────────────────────
  function toggle() {
    if (!_recognition) { UI.toast('Voice not supported.', 'error'); return; }
    _active = !_active;

    if (_active) {
      if (!_isStarted) try { _recognition.start(); } catch(e) {}
      showStatusBar();
      startWaveform();
      startTimeWarnings();
      startWatchdog();
      UI.toast('🎙️ Voice Mode Active', 'success');
      document.body.classList.add('voice-active');
    } else {
      stop();
      UI.toast('Voice Mode Off', 'info');
    }
    return _active;
  }

  function stop() {
    _active = false;
    try { _recognition.stop(); } catch(e) {}
    hideStatusBar();
    stopWaveform();
    stopTimeWarnings();
    stopWatchdog();
    UI.stopSpeaking();
    document.body.classList.remove('voice-active');
    _pendingConfirm = null;
    _isSpeaking = false;
  }

  // ── TTS-safe speak (pauses recognition during speech) ────
  function speakSafe(text) {
    if (!text) return;
    _lastSpoken = text;
    _isSpeaking = true;

    // Gently abort recognition while speaking to avoid feedback loop
    try { if (_isStarted) _recognition.stop(); } catch(e) {}

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = _speakRate;
    utter.pitch = 1.0;
    utter.lang  = _currentLang;
    utter.onend = () => {
      _isSpeaking = false;
      // Restart recognition after a short pause so mic settles
      setTimeout(() => {
        if (_active && !_isStarted) {
          try { _recognition.start(); } catch(e) {}
        }
      }, 500);
    };
    utter.onerror = () => { _isSpeaking = false; };
    window.speechSynthesis.cancel(); // cancel any queued speech
    window.speechSynthesis.speak(utter);
  }

  // ── Watchdog: restarts recognition if it silently dies ───
  function startWatchdog() {
    stopWatchdog();
    _watchdogTimer = setInterval(() => {
      if (_active && !_isStarted && !_isSpeaking) {
        console.log('[Voice] Watchdog: restarting recognition...');
        try { _recognition.start(); } catch(e) {}
      }
    }, 4000);
  }

  function stopWatchdog() {
    if (_watchdogTimer) clearInterval(_watchdogTimer);
    _watchdogTimer = null;
  }

  // ── Status Bar ────────────────────────────────────────────
  function showStatusBar() {
    if (document.getElementById('voice-status-bar')) return;
    const el = document.createElement('div');
    el.id = 'voice-status-bar';
    el.innerHTML = `
      <div class="voice-bar-content">
        <div class="mic-orbit">
          <div class="mic-pulse-ring" id="mic-pulse-ring"></div>
          <canvas id="voice-waveform" width="40" height="40"></canvas>
        </div>
        <div class="vsb-history" id="voice-cmd-history"></div>
        <div class="transcript-area">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <span class="vsb-label" id="voice-cmd-label">VOICE CONTROL</span>
            <span class="vsb-badge" id="voice-cmd-badge"></span>
            <span id="verbose-badge" style="display:none;font-size:.45rem;font-weight:900;letter-spacing:1px;padding:1px 5px;border-radius:3px;background:#a78bfa22;color:#a78bfa;border:1px solid #a78bfa44">VERBOSE</span>
          </div>
          <p id="voice-transcript">Listening for commands...</p>
        </div>
        <div class="vsb-actions">
          <button class="vsb-help-btn" onclick="VoiceEngine.showHelp()" title="What can I say?">?</button>
          <button class="vsb-close-btn" onclick="PageQuiz.toggleVoice()" title="Turn off voice">×</button>
        </div>
      </div>
      <div id="voice-confirm-bar" style="display:none">
        <span id="voice-confirm-text"></span>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button onclick="VoiceEngine._resolveConfirm(true)"  class="vsb-ok-btn">✔ CONFIRM</button>
          <button onclick="VoiceEngine._resolveConfirm(false)" class="vsb-no-btn">✕ CANCEL</button>
        </div>
      </div>
      <style>
        #voice-status-bar {
          position:fixed; bottom:110px; left:50%; transform:translateX(-50%);
          background:rgba(6,6,18,.97); backdrop-filter:blur(20px);
          border:1.5px solid #ffffff14; border-radius:18px;
          padding:10px 16px; z-index:100000000; width:440px; max-width:92vw;
          box-shadow:0 24px 60px rgba(0,0,0,.7);
          animation:vsb-in .35s cubic-bezier(.34,1.56,.64,1);
          transition:border-color .25s, box-shadow .25s;
        }
        .voice-bar-content { display:flex; align-items:center; gap:14px; }
        .mic-orbit { position:relative; width:40px; height:40px; flex-shrink:0; display:grid; place-items:center; }
        #voice-waveform { position:absolute; inset:0; border-radius:50%; }
        .mic-pulse-ring { position:absolute; inset:0; border-radius:50%; background:var(--accent-primary); opacity:.2; animation:vring 2s infinite; transition:background .3s; }
        .vsb-history { position:absolute; bottom:calc(100% + 4px); left:16px; display:flex; flex-direction:column; align-items:flex-start; gap:4px; pointer-events:none; }
        .vsb-history-item { font-size:0.6rem; background:rgba(0,0,0,0.78); padding:3px 8px; border-radius:6px; opacity:0; animation:vh-in 0.3s forwards; border:1px solid #333; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; transition:opacity 0.3s; }
        .transcript-area { flex:1; min-width:0; }
        .vsb-label { font-size:.52rem; font-weight:900; letter-spacing:1.5px; color:var(--accent-primary); transition:color .3s; text-transform:uppercase; }
        .vsb-badge { display:none; font-size:.5rem; font-weight:900; letter-spacing:1px; padding:2px 7px; border-radius:4px; text-transform:uppercase; transition:all .2s; }
        .vsb-badge.on { display:inline-block; }
        #voice-transcript { font-size:.8rem; color:#cbd5e1; margin:3px 0 0; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .vsb-actions { display:flex; gap:6px; flex-shrink:0; align-items:center; }
        .vsb-close-btn { background:transparent; color:#555; border:none; font-size:1.3rem; cursor:pointer; padding:0 2px; line-height:1; }
        .vsb-close-btn:hover { color:#ef4444; }
        .vsb-help-btn { background:rgba(255,255,255,.06); color:#888; border:1px solid #333; width:22px; height:22px; border-radius:50%; font-size:.7rem; font-weight:900; cursor:pointer; display:grid; place-items:center; }
        .vsb-help-btn:hover { border-color:var(--accent-primary); color:var(--accent-primary); }
        #voice-confirm-bar { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.25); border-radius:8px; padding:8px 12px; margin-top:8px; font-size:.75rem; color:#fca5a5; font-weight:600; }
        .vsb-ok-btn { background:#22c55e22; color:#22c55e; border:1px solid #22c55e44; padding:3px 12px; border-radius:6px; font-size:.7rem; font-weight:800; cursor:pointer; }
        .vsb-no-btn { background:#ef444422; color:#ef4444; border:1px solid #ef444444; padding:3px 12px; border-radius:6px; font-size:.7rem; font-weight:800; cursor:pointer; }
        @keyframes vsb-in { from{transform:translate(-50%,28px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
        @keyframes vring  { 0%,100%{transform:scale(1);opacity:.2} 50%{transform:scale(1.8);opacity:.06} }
      </style>
    `;
    document.body.appendChild(el);

    // ── Drag Logic ──
    let isDragging = false, startX, startY, initialLeft, initialTop;
    const handle = el.querySelector('.voice-bar-content');
    handle.style.cursor = 'grab';

    handle.addEventListener('mousedown', e => {
      if(e.target.closest('button')) return; // ignore buttons
      isDragging = true;
      handle.style.cursor = 'grabbing';
      const rect = el.getBoundingClientRect();
      
      el.style.transform = 'none'; // detach from CSS centering
      el.style.left = rect.left + 'px';
      el.style.top = rect.top + 'px';
      el.style.bottom = 'auto';    // break from css bottom attach
      
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;
      e.preventDefault(); // prevent text selection while dragging
    });

    const onMove = e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = (initialLeft + dx) + 'px';
      el.style.top = (initialTop + dy) + 'px';
    };

    const onUp = () => {
      if (isDragging) {
        isDragging = false;
        handle.style.cursor = 'grab';
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    
    // Store cleanup functions so we can remove them when hidden
    el._dragCleanups = [
      () => document.removeEventListener('mousemove', onMove),
      () => document.removeEventListener('mouseup', onUp)
    ];
  }

  function hideStatusBar() {
    const el = document.getElementById('voice-status-bar');
    if (el) {
      if (el._dragCleanups) el._dragCleanups.forEach(fn => fn());
      el.remove();
    }
    hideHelp();
  }

  // ── Animated Waveform ─────────────────────────────────────
  function startWaveform() {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = _audioCtx.createMediaStreamSource(stream);
        _analyser = _audioCtx.createAnalyser();
        _analyser.fftSize = 64;
        src.connect(_analyser);
        drawWaveform();
      })
      .catch(() => {}); // cosmetic — fail silently
  }

  function drawWaveform() {
    const canvas = document.getElementById('voice-waveform');
    if (!canvas || !_analyser) return;
    const ctx  = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const data = new Uint8Array(_analyser.frequencyBinCount);

    function frame() {
      if (!_active) return;
      _waveAnimFrame = requestAnimationFrame(frame);
      _analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, W, H);
      const bars = 18, cx = W / 2, cy = H / 2, r = 12;
      for (let i = 0; i < bars; i++) {
        const angle  = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const val    = data[Math.floor(i * data.length / bars)] / 255;
        const barLen = 3 + val * 9;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.lineTo(cx + Math.cos(angle) * (r + barLen), cy + Math.sin(angle) * (r + barLen));
        ctx.strokeStyle = `hsla(${255 + val * 70},75%,68%,${0.35 + val * 0.65})`;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.fill();
    }
    frame();
  }

  function stopWaveform() {
    if (_waveAnimFrame) cancelAnimationFrame(_waveAnimFrame);
    if (_audioCtx) { try { _audioCtx.close(); } catch(e) {} _audioCtx = null; }
    _analyser = null;
  }

  // ── Time Warnings ─────────────────────────────────────────
  function startTimeWarnings() {
    _timeWarned = { fiveMin: false, oneMin: false, thirtyS: false };
  }

  function stopTimeWarnings() {
    if (_timeCheckInterval) clearInterval(_timeCheckInterval);
  }

  // function checkTimeWarnings() {
  //   const el = document.getElementById('total-timer') || document.getElementById('total-timer-qp');
  //   if (!el) return;
  //   const parts = el.textContent.trim().split(':');
  //   if (parts.length < 2) return;
  //   const totalSec = parts.length === 3
  //     ? +parts[0] * 3600 + +parts[1] * 60 + +parts[2]
  //     : +parts[0] * 60 + +parts[1];
  //   if (isNaN(totalSec)) return;

  //   if (totalSec <= 30 && !_timeWarned.thirtyS) {
  //     _timeWarned.thirtyS = true;
  //     const m = 'Warning! Only 30 seconds remaining!';
  //     speakSafe(m); cmdFeedback({ color:'#ef4444', icon:'⏱', label:'30s LEFT' }, m);
  //     UI.toast('⏱ 30 seconds left!', 'error', 4000);
  //   } else if (totalSec <= 60 && !_timeWarned.oneMin) {
  //     _timeWarned.oneMin = true;
  //     const m = 'One minute remaining. Please submit soon.';
  //     speakSafe(m); cmdFeedback({ color:'#ef4444', icon:'⏱', label:'1 MIN' }, m);
  //     UI.toast('⏱ 1 minute left!', 'warn', 4000);
  //   } else if (totalSec <= 300 && !_timeWarned.fiveMin) {
  //     _timeWarned.fiveMin = true;
  //     const m = 'Five minutes remaining.';
  //     speakSafe(m); cmdFeedback({ color:'#eab308', icon:'⏱', label:'5 MINS' }, m);
  //     UI.toast('⏱ 5 minutes left', 'warn', 3000);
  //   }
  // }

  // ── Status Display ────────────────────────────────────────
  function updateStatusDisplay(text, mode = 'default', cmdMeta = null) {
    const bar         = document.getElementById('voice-status-bar');
    const transcriptEl = document.getElementById('voice-transcript');
    const labelEl     = document.getElementById('voice-cmd-label');
    const badgeEl     = document.getElementById('voice-cmd-badge');
    if (!transcriptEl) return;

    if (_typingInterval) clearInterval(_typingInterval);
    _typingInterval = UI.typewriter(transcriptEl, text, 8);

    if (cmdMeta && bar) {
      const { color, icon, label } = cmdMeta;
      bar.style.borderColor = color;
      bar.style.boxShadow   = `0 24px 60px rgba(0,0,0,.7),0 0 24px ${color}33`;
      if (labelEl) { labelEl.textContent = label; labelEl.style.color = color; }
      if (badgeEl) {
        badgeEl.textContent    = icon;
        badgeEl.style.background = color + '1a';
        badgeEl.style.color      = color;
        badgeEl.style.border     = `1px solid ${color}33`;
        badgeEl.classList.add('on');
      }
      const ring = document.getElementById('mic-pulse-ring');
      if (ring) ring.style.background = color;

      if (_resetColorTimer) clearTimeout(_resetColorTimer);
      _resetColorTimer = setTimeout(() => {
        bar.style.borderColor = '';
        bar.style.boxShadow   = '';
        if (labelEl) { labelEl.textContent = _verbose ? 'VERBOSE MODE' : 'VOICE CONTROL'; labelEl.style.color = ''; }
        if (badgeEl) badgeEl.classList.remove('on');
        if (ring) ring.style.background = '';
      }, 2000);
    }
  }

  function cmdFeedback(meta, text) {
    updateStatusDisplay(text, 'cmd', meta);
    
    // Mini History Log
    const hist = document.getElementById('voice-cmd-history');
    if (!hist) return;
    const el = document.createElement('div');
    el.className = 'vsb-history-item';
    el.style.borderColor = meta.color + '66';
    el.style.color = meta.color;
    el.innerHTML = `<span style="opacity:0.7;margin-right:4px">${meta.icon}</span> ${meta.label}`;
    hist.appendChild(el);
    
    while (hist.children.length > 3) hist.firstChild.remove();
    setTimeout(() => { if (el.parentNode) el.style.opacity = '0'; }, 3500);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 3800);
  }

  // ── Voice Confirmation ────────────────────────────────────
  function requestConfirmation(actionLabel, onConfirm) {
    _pendingConfirm = onConfirm;
    const bar  = document.getElementById('voice-confirm-bar');
    const span = document.getElementById('voice-confirm-text');
    if (bar)  bar.style.display  = 'block';
    if (span) span.textContent   = `⚠ Say "confirm" to ${actionLabel}, or "cancel" to stop.`;
    speakSafe(`Say confirm to ${actionLabel}, or cancel to stop.`);
    cmdFeedback(CMD.FINISH, `⚠ Confirm to ${actionLabel}?`);
  }

  // Exposed for inline onclick buttons
  function _resolveConfirm(doIt) {
    const bar = document.getElementById('voice-confirm-bar');
    if (bar) bar.style.display = 'none';
    if (doIt && _pendingConfirm) {
      _pendingConfirm();
      cmdFeedback({ color:'#22c55e', icon:'✔', label:'DONE' }, '✔ Action confirmed');
    } else {
      cmdFeedback({ color:'#ef4444', icon:'✕', label:'CANCELLED' }, 'Action cancelled');
    }
    _pendingConfirm = null;
  }

  // ── Process Command ───────────────────────────────────────
  function processCommand(text) {
    // Intercept confirmation dialog first
    if (_pendingConfirm) {
      if (match(text, CMD.CONFIRM.c)) { _resolveConfirm(true);  return; }
      if (match(text, CMD.CANCEL.c))  { _resolveConfirm(false); return; }
    }

    // Navigation
    if      (match(text, CMD.NEXT.c))  { PageQuiz.next(); cmdFeedback(CMD.NEXT, '→ Next question'); if (_verbose) verboseReadCurrent(350); }
    else if (match(text, CMD.BACK.c))  { PageQuiz.prev(); cmdFeedback(CMD.BACK, '← Previous question'); if (_verbose) verboseReadCurrent(350); }
    else if (match(text, CMD.JUMP.c))  { handleJump(text); }

    // Selection
    else if (match(text, CMD.SELECT_A.c)) { doSelect(0, 'A'); }
    else if (match(text, CMD.SELECT_B.c)) { doSelect(1, 'B'); }
    else if (match(text, CMD.SELECT_C.c)) { doSelect(2, 'C'); }
    else if (match(text, CMD.SELECT_D.c)) { doSelect(3, 'D'); }
    else if (match(text, CMD.SELECT_E.c)) { doSelect(4, 'E'); }
    else if (match(text, CMD.CLEAR.c))    { clearSelection(); }

    // Reading
    else if (match(text, CMD.SPEAK_OPTS.c)) { readAllOptions(); }
    else if (match(text, CMD.SPEAK_A.c))    { readOption(0); }
    else if (match(text, CMD.SPEAK_B.c))    { readOption(1); }
    else if (match(text, CMD.SPEAK_C.c))    { readOption(2); }
    else if (match(text, CMD.SPEAK_D.c))    { readOption(3); }
    else if (match(text, CMD.SPEAK_Q.c))    { readQuestion(); }
    else if (match(text, CMD.REPEAT.c))     { if (_lastSpoken) speakSafe(_lastSpoken); cmdFeedback(CMD.REPEAT, '↩ Repeating...'); }

    // Actions
    else if (match(text, CMD.DONT_KNOW.c)) { handleDontKnow(); }
    else if (match(text, CMD.MARK.c))      { PageQuiz.toggleMark(); cmdFeedback(CMD.MARK, '🚩 Flagged for review'); }
    else if (match(text, CMD.HINT.c))      { PageQuiz.showHint();   cmdFeedback(CMD.HINT, '💡 Hint shown'); }
    else if (match(text, CMD.PAUSE.c))     { PageQuiz.togglePause(); cmdFeedback(CMD.PAUSE, '⏸ Paused'); }
    else if (match(text, CMD.TYPE.c))      { handleTypeCommand(text); }

    // Info
    else if (match(text, CMD.PROGRESS.c))  { readProgress(); }
    else if (match(text, CMD.TIME_LEFT.c)) { readTimeLeft(); }

    // Speed Control
    else if (match(text, CMD.SPEED_UP.c))     { _speakRate = Math.min(_speakRate + 0.25, 2.0); cmdFeedback(CMD.SPEED_UP, 'Speed increased'); speakSafe('Speed increased'); }
    else if (match(text, CMD.SPEED_DOWN.c))   { _speakRate = Math.max(_speakRate - 0.25, 0.5); cmdFeedback(CMD.SPEED_DOWN, 'Speed decreased'); speakSafe('Speed decreased'); }
    else if (match(text, CMD.SPEED_NORMAL.c)) { _speakRate = 1.0; cmdFeedback(CMD.SPEED_NORMAL, 'Normal speed'); speakSafe('Normal speed'); }

    // Eliminate specific options
    else if (match(text, CMD.ELIM_A.c)) { doEliminate(0, 'A'); }
    else if (match(text, CMD.ELIM_B.c)) { doEliminate(1, 'B'); }
    else if (match(text, CMD.ELIM_C.c)) { doEliminate(2, 'C'); }
    else if (match(text, CMD.ELIM_D.c)) { doEliminate(3, 'D'); }
    else if (match(text, CMD.ELIM_E.c)) { doEliminate(4, 'E'); }
    else if (match(text, CMD.RESTORE_OPTS.c)) { restoreOptions(); }

    // Verbose
    else if (match(text, CMD.VERBOSE_ON.c))  { _verbose = true;  updateVerboseBadge(); cmdFeedback(CMD.VERBOSE_ON,  '📢 Verbose ON');  UI.toast('📢 Verbose mode ON', 'info'); }
    else if (match(text, CMD.VERBOSE_OFF.c)) { _verbose = false; updateVerboseBadge(); cmdFeedback(CMD.VERBOSE_OFF, '🔇 Verbose OFF'); UI.toast('Verbose mode OFF', 'info'); }

    // Help
    else if (match(text, CMD.HELP.c)) { showHelp(); cmdFeedback(CMD.HELP, '❓ Command list shown'); }

    // Language Switch
    else if (match(text, CMD.LANG_US.c)) { handleLangSwitch('en-US', CMD.LANG_US, 'American English'); }
    else if (match(text, CMD.LANG_UK.c)) { handleLangSwitch('en-GB', CMD.LANG_UK, 'British English'); }
    else if (match(text, CMD.LANG_IN.c)) { handleLangSwitch('en-IN', CMD.LANG_IN, 'Indian English'); }

    // Danger — confirmation required
    else if (match(text, CMD.SUBMIT.c)) { requestConfirmation('submit the quiz',   () => { UI.closeModal(); PageQuiz.submit(); }); }
    else if (match(text, CMD.FINISH.c)) { requestConfirmation('end the quiz',      () => PageQuiz.confirmSubmit()); }

    // Console
    else if (match(text, CMD.OPEN_CONSOLE.c))  { PageQuiz.toggleConsole(true);  cmdFeedback(CMD.OPEN_CONSOLE,  '⎣ Console open'); }
    else if (match(text, CMD.CLOSE_CONSOLE.c)) { PageQuiz.toggleConsole(false); cmdFeedback(CMD.CLOSE_CONSOLE, '⎤ Console closed'); }

    // Fuzzy fallback
    else { clickElementByText(text); }
  }

  // ── Handlers ─────────────────────────────────────────────
  function handleDontKnow() {
    PageQuiz.toggleMark();
    setTimeout(() => PageQuiz.next(), 350);
    cmdFeedback(CMD.DONT_KNOW, '? Flagged & skipped');
    UI.toast('Flagged & skipped', 'info', 2000);
  }

  function doSelect(index, label) {
    selectOption(index);
    // Readback after DOM settles
    setTimeout(() => {
      const cards = document.querySelectorAll('.option-card');
      if (cards[index]) {
        const txt    = cards[index].innerText.replace(/^[A-E][.)]\s*/i, '').trim();
        const speech = `Selected option ${label}: ${txt}`;
        _lastSpoken  = speech;
        speakSafe(speech);
        cmdFeedback({ ...CMD.SELECT_A, icon: label, label: `SELECT ${label}` }, `✓ Option ${label} selected`);
      }
    }, 220);
  }

  function verboseReadCurrent(delay = 0) {
    setTimeout(() => {
      try {
        const quiz = State.get('quiz');
        const q    = quiz.questions[quiz.currentIdx];
        if (!q) return;
        const tmp  = document.createElement('div');
        tmp.innerHTML = q.Question || '';
        const qTxt = tmp.textContent || '';
        const speech = `Question ${quiz.currentIdx + 1} of ${quiz.questions.length}. ${q.Category || ''}. Difficulty: ${q.Difficulty || 'unknown'}. ${qTxt}`;
        _lastSpoken  = speech;
        speakSafe(speech);
      } catch(e) {}
    }, delay);
  }

  function updateVerboseBadge() {
    const b = document.getElementById('verbose-badge');
    if (b) b.style.display = _verbose ? 'inline-block' : 'none';
  }

  function readQuestion() {
    const quiz = State.get('quiz');
    const q    = quiz.questions[quiz.currentIdx];
    const tmp  = document.createElement('div');
    tmp.innerHTML  = q.Question || q.text || '';
    const clean    = tmp.textContent || tmp.innerText || '';
    _lastSpoken    = clean;
    speakSafe(clean);
    cmdFeedback(CMD.SPEAK_Q, '🔊 Reading question...');
  }

  function readAllOptions() {
    const cards = document.querySelectorAll('.option-card');
    if (!cards.length) { UI.toast('No options found', 'warn'); return; }
    const labels = ['A','B','C','D','E'];
    let full = '';
    cards.forEach((c, i) => { full += `Option ${labels[i]}: ${c.innerText.replace(/^[A-E][.)]\s*/i,'').trim()}. `; });
    _lastSpoken = full;
    speakSafe(full);
    cmdFeedback(CMD.SPEAK_OPTS, '📋 Reading all options...');
  }

  function readOption(index) {
    const cards  = document.querySelectorAll('.option-card');
    const labels = ['A','B','C','D','E'];
    const metas  = [CMD.SPEAK_A, CMD.SPEAK_B, CMD.SPEAK_C, CMD.SPEAK_D];
    if (cards[index]) {
      const txt    = cards[index].innerText.replace(/^[A-E][.)]\s*/i,'').trim();
      const speech = `Option ${labels[index]}: ${txt}`;
      _lastSpoken  = speech;
      speakSafe(speech);
      cmdFeedback(metas[index] || CMD.SPEAK_A, `🔊 Option ${labels[index]}`);
    }
  }

  function readTimeLeft() {
    const el = document.getElementById('total-timer') || document.getElementById('total-timer-qp');
    if (!el || !el.textContent.trim() || el.textContent.trim() === '∞') {
      const m = 'There is no time limit for this quiz.';
      speakSafe(m); cmdFeedback(CMD.TIME_LEFT, '∞ No time limit'); return;
    }
    const time   = el.textContent.trim();
    const speech = `Time : ${time.split(':').join(' minutes and ')} seconds.`;
    _lastSpoken  = speech;
    speakSafe(speech);
    cmdFeedback(CMD.TIME_LEFT, `⏱ ${time} left`);
  }

  function readProgress() {
    const quiz     = State.get('quiz');
    const total    = quiz.questions.length;
    const answered = Object.values(quiz.answers).filter(a => a.userAnswer != null).length;
    const current  = (quiz.currentIdx || 0) + 1;
    const flagged  = Object.values(quiz.answers).filter(a => a.flagged).length;
    const speech   = `Question ${current} of ${total}. ${answered} answered, ${flagged} flagged, ${total - answered} remaining.`;
    _lastSpoken    = speech;
    speakSafe(speech);
    cmdFeedback(CMD.PROGRESS, `📊 Q${current}/${total} • ${answered} done`);
  }

  function doEliminate(index, label) {
    const cards = document.querySelectorAll('.option-card');
    if (cards[index]) {
      cards[index].style.opacity = '0.25';
      cards[index].style.pointerEvents = 'none';
      cards[index].style.filter = 'grayscale(1)';
      cmdFeedback(CMD[`ELIM_${label}`] || { color:'#64748b', icon:label+'✕', label:'ELIM' }, `✕ Eliminated ${label}`);
      UI.toast(`Eliminated Option ${label}`, 'info');
    }
  }

  function restoreOptions() {
    const cards = document.querySelectorAll('.option-card');
    cards.forEach(c => {
      c.style.opacity = '';
      c.style.pointerEvents = '';
      c.style.filter = '';
    });
    cmdFeedback(CMD.RESTORE_OPTS, '↺ Options Restored');
    UI.toast('Options Restored', 'info');
  }

  function clearSelection() {
    document.querySelectorAll('.option-card.selected').forEach(el =>
      el.classList.remove('selected','correct','incorrect')
    );
    cmdFeedback(CMD.CLEAR, '✕ Answer cleared');
    UI.toast('Answer cleared', 'info');
  }

  function handleJump(text) {
    const num = text.match(/\d+/);
    if (!num) return;
    const idx  = parseInt(num[0]) - 1;
    const quiz = State.get('quiz');
    if (idx >= 0 && idx < quiz.questions.length) {
      PageQuiz.jumpTo(idx);
      cmdFeedback(CMD.JUMP, `⤵ Question ${idx + 1}`);
      if (_verbose) verboseReadCurrent(400);
    } else {
      UI.toast(`Question ${idx + 1} not found`, 'warn');
      updateStatusDisplay(`Q${idx + 1} out of range`);
    }
  }

  function handleTypeCommand(text) {
    let payload = '';
    for (const k of CMD.TYPE.c) {
      if (text.startsWith(k)) { payload = text.slice(k.length).trim(); break; }
    }
    if (!payload) return;
    const inputs = document.querySelectorAll('input[type="text"], textarea, .form-control');
    const target = Array.from(inputs).find(i => i.offsetParent !== null);
    if (target) {
      target.value = payload;
      target.dispatchEvent(new Event('input',  { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      cmdFeedback(CMD.TYPE, `⌨ "${payload.substring(0, 18)}"`);
    } else {
      UI.toast('No text field found', 'warn');
    }
  }

  function handleLangSwitch(langCode, cmdMeta, langName) {
    if (_currentLang === langCode) {
      speakSafe(`Already using ${langName}`);
      return;
    }
    _currentLang = langCode;
    _recognition.lang = langCode;
    
    // Must restart recognition to apply language change
    try { _recognition.stop(); } catch(e) {}
    
    const msg = `Switched to ${langName}`;
    cmdFeedback(cmdMeta, `🗣️ ${msg}`);
    UI.toast(msg, 'success');
    speakSafe(msg);
  }

  // ── Help Overlay ──────────────────────────────────────────
  function showHelp() {
    hideHelp();
    const secs = [
      { title:'🟢 Navigate',  color:'#22c55e', items:['next / continue / move on','back / previous','go to 5 / jump to 3'] },
      { title:'🔵 Select',    color:'#06b6d4', items:['select A / B / C / D / E','clear answer',"i don't know (flag & skip)"] },
      { title:'🟣 Read',      color:'#818cf8', items:['read question / read it','read options (all)','read option A / B / C / D','repeat'] },
      { title:'🟠 Actions',   color:'#f97316', items:['flag / mark for review','hint / give me a hint','pause','type [text]'] },
      { title:'🟡 Info',      color:'#eab308', items:['progress / quiz status','how much time left'] },
      { title:'🔴 Submit',    color:'#ef4444', items:['finish / end quiz → asks confirm','submit quiz → asks confirm'] },
      { title:'🟤 Console',   color:'#a855f7', items:['open command / close command'] },
      { title:'⚙ Verbose',   color:'#a78bfa', items:['verbose mode (reads question aloud after each nav)','verbose off / silent mode'] },
    ];
    const overlay = document.createElement('div');
    overlay.id = 'voice-help-overlay';
    overlay.innerHTML = `
      <div id="vhp">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:.9rem;font-weight:900;letter-spacing:.06em">🎙️ VOICE COMMANDS</h3>
          <button onclick="VoiceEngine.hideHelp()" style="background:transparent;border:none;color:#666;font-size:1.3rem;cursor:pointer">×</button>
        </div>
        <div id="vhp-grid">
          ${secs.map(s => `
            <div class="vhp-sec">
              <div style="font-size:.62rem;font-weight:900;letter-spacing:.06em;margin-bottom:6px;color:${s.color}">${s.title}</div>
              ${s.items.map(i => `<div class="vhp-item">"${i}"</div>`).join('')}
            </div>
          `).join('')}
        </div>
        <p style="text-align:center;font-size:.6rem;color:#555;margin-top:14px">
          Partial matches work — say any part of the phrase above
        </p>
      </div>
      <style>
        #voice-help-overlay { position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200000000;display:grid;place-items:center;backdrop-filter:blur(5px);animation:vho-in .2s ease; }
        #vhp { background:rgba(8,8,22,.98);border:1px solid #ffffff12;border-radius:18px;padding:22px;width:480px;max-width:92vw;max-height:80vh;overflow-y:auto;box-shadow:0 40px 80px rgba(0,0,0,.85); }
        #vhp-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
        .vhp-sec { background:rgba(255,255,255,.03);border:1px solid #ffffff08;border-radius:8px;padding:10px; }
        .vhp-item { font-size:.71rem;color:#94a3b8;padding:2px 0;font-family:monospace; }
        @keyframes vho-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        @media(max-width:480px){ #vhp-grid{grid-template-columns:1fr} }
      </style>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) hideHelp(); });
    document.body.appendChild(overlay);
  }

  function hideHelp() {
    const el = document.getElementById('voice-help-overlay');
    if (el) el.remove();
  }

  // ── Fuzzy Click Fallback ──────────────────────────────────
  function clickElementByText(text) {
    if (!text || text.length < 2) return;
    const els = document.querySelectorAll('button, a, .option-card, .nav-item, .btn, label, option');
    let bestMatch = null, maxScore = 0;

    for (const el of els) {
      if (el.offsetParent === null) continue;
      const elText = (el.innerText || el.textContent || '').toLowerCase().trim();
      const val    = (el.dataset.val || '').toLowerCase().trim();
      if (elText === text || val === text) { bestMatch = el; break; }
      const score = fuzzyScore(text, elText);
      if (score > 0.55 && score > maxScore) { maxScore = score; bestMatch = el; }
    }

    if (bestMatch) {
      if (bestMatch.classList.contains('option-card')) {
        const _cards = document.querySelectorAll('.option-card');
        const idx = Array.from(_cards).indexOf(bestMatch);
        const letter = ['A','B','C','D','E'][idx] || '?';
        doSelect(idx, letter);
        return; // doSelect handles feedback & click
      } else if (bestMatch.tagName === 'LABEL') {
        const inp = document.getElementById(bestMatch.htmlFor) || bestMatch.querySelector('input');
        if (inp) inp.click();
      } else if (bestMatch.tagName === 'OPTION') {
        const sel = bestMatch.parentNode;
        if (sel && sel.tagName === 'SELECT') {
          sel.value = bestMatch.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        bestMatch.click();
      }
      const lbl = (bestMatch.innerText || '').substring(0, 20).trim();
      cmdFeedback({ color:'#06b6d4', icon:'✓', label:'CLICKED' }, `Activated: "${lbl}"`);
    }
  }

  function fuzzyScore(a, b) {
    if (!a || !b) return 0;
    const wa = new Set(a.split(/\s+/));
    const wb = new Set(b.split(/\s+/));
    const inter = [...wa].filter(w => wb.has(w)).length;
    const union = new Set([...wa, ...wb]).size;
    return union > 0 ? inter / union : 0;
  }

  // ── Select Option ─────────────────────────────────────────
  function selectOption(index) {
    const cards = document.querySelectorAll('.option-card');
    if (cards[index]) { cards[index].click(); return; }
    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    if (inputs[index]) { inputs[index].click(); return; }
    const sels = document.querySelectorAll('select');
    if (sels.length && sels[0].options[index + 1]) {
      sels[0].selectedIndex = index + 1;
      sels[0].dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    UI.toast('Option not found', 'warn');
  }

  function match(text, list) {
    return list.some(cmd => text === cmd || text.startsWith(cmd) || text.includes(cmd));
  }

  // ── Global Event Listeners (Push-to-Talk) ─────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat && !_active) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
        // Enforce supported question types for Push-to-Talk
        const quiz = (typeof State !== 'undefined') ? State.get('quiz') : null;
        if (quiz && quiz.questions) {
           const q = quiz.questions[quiz.currentIdx];
           if (q) {
             const qType = (q["Question Type"] || "Multichoice").trim();
             const isVoiceSupported = ["Multichoice", "Multi Multichoice", "Multichoice Anycorrect", "True/False"].includes(qType);
             if (!isVoiceSupported) {
               UI.toast("Voice features not available for this question type", "warn");
               return;
             }
           }
        }
        
        _holdToTalk = true;
        toggle(); // turn on
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && _holdToTalk) {
      _holdToTalk = false;
      if (_active) stop(); // turn off
    }
  });

  return { init, toggle, stop, isActive: () => _active, showHelp, hideHelp, hideStatusBar, _resolveConfirm };
})();

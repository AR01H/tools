// ============================================================
//  QUIZ APP — dashboard.js
//  Welcome page + user registration
// ============================================================

const PageWelcome = (() => {

  function render(main) {
    const user   = State.get('user');
    const topics = State.get('topics');
    const scriptConfigured = !!State.get('scriptUrl');

    if (!user) { renderRegister(main); return; }

    main.innerHTML = `
      <div class="animate-up" style="max-width:800px;margin:0 auto">
        <!-- Greeting -->
        <div style="margin-bottom:var(--sp-xl)">
          <p class="text-muted text-sm">Welcome back,</p>
          <h1 style="font-size:2rem;font-weight:800;letter-spacing:-.03em">
            ${user.name} <span style="opacity:.4">👋</span>
          </h1>
          <p class="text-muted" style="margin-top:4px">Ready to challenge yourself today?</p>
        </div>

        ${!scriptConfigured ? `
          <div class="card" style="border-left:4px solid var(--color-warn);margin-bottom:var(--sp-lg)">
            <p class="font-bold" style="margin-bottom:4px">⚙️ Setup Required</p>
            <p class="text-muted text-sm">Add your Google Apps Script URL and Folder ID to connect your quiz data.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:var(--sp-sm)" onclick="UI.openSettings()">Open Settings</button>
          </div>` : ''}

        <!-- Start Quiz CTA -->
        <div class="card-elevated" style="background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));border:none;margin-bottom:var(--sp-xl);position:relative;overflow:hidden">
          <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;background:rgba(255,255,255,.08);border-radius:50%"></div>
          <div style="position:absolute;bottom:-30px;right:60px;width:80px;height:80px;background:rgba(255,255,255,.06);border-radius:50%"></div>
          <div style="position:relative">
            <p style="color:rgba(255,255,255,.8);font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">NEW QUIZ</p>
            <h2 style="color:#fff;font-size:1.6rem;font-weight:800;margin-bottom:var(--sp-sm)">Start a Practice Session</h2>
            <p style="color:rgba(255,255,255,.75);margin-bottom:var(--sp-lg);font-size:.9rem">
              ${topics.length ? `${topics.length} topic${topics.length>1?'s':''} available` : 'Configure your Drive folder to load topics'}
            </p>
            <button class="btn" style="background:#fff;color:var(--accent-primary);font-weight:700"
              onclick="Dashboard.startQuiz()">
              🚀 Begin Quiz →
            </button>
          </div>
        </div>

        <!-- Topic pills -->
        ${topics.length ? `
          <div class="card" style="margin-bottom:var(--sp-lg)">
            <p class="form-label" style="margin-bottom:var(--sp-md)">Available Topics</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${topics.map(t => `
                <div class="chip selected" style="cursor:default">
                  📚 ${t.name}
                </div>`).join('')}
            </div>
          </div>` : ''}

        <!-- Recent result card -->
        ${State.get('result') ? renderRecentResult() : ''}

        <!-- User info -->
        <div class="card">
          <div style="display:flex;align-items:center;gap:var(--sp-md);justify-content:space-between">
            <div style="display:flex;align-items:center;gap:var(--sp-md)">
              <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-muted);
                          display:grid;place-items:center;font-size:1.4rem;border:2px solid var(--accent-primary)">
                ${user.name[0].toUpperCase()}
              </div>
              <div>
                <p class="font-bold">${user.name}</p>
                <p class="text-muted text-sm">${user.email || user.phone || user.dob || ''}</p>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Dashboard.changeUser()">Switch User</button>
          </div>
        </div>
      </div>`;
  }

  function renderRecentResult() {
    const result = State.get('result');
    const { score } = result;
    const color = score.accuracy >= 70 ? 'var(--color-success)' : score.accuracy >= 40 ? 'var(--color-warn)' : 'var(--color-error)';
    return `
      <div class="card" style="margin-bottom:var(--sp-lg);border-left:4px solid ${color}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-md)">
          <div>
            <p class="form-label" style="margin-bottom:4px">Last Attempt</p>
            <p class="font-bold text-lg" style="color:${color}">${score.accuracy}% Accuracy</p>
            <p class="text-muted text-sm">${score.correct} correct · ${score.wrong} wrong · ${fmtTime(score.timeTaken)}</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="UI.navigate('result')">View Full Report →</button>
        </div>
      </div>`;
  }

  function renderRegister(main) {
    const fields  = State.get('personalFields');
    const fieldDefs = {
      name:  { label:'Full Name',        type:'text',  placeholder:'John Doe',          required:true  },
      dob:   { label:'Date of Birth',    type:'date',  placeholder:'',                  required:false },
      email: { label:'Email Address',    type:'email', placeholder:'you@example.com',   required:false },
      phone: { label:'Phone Number',     type:'tel',   placeholder:'+91 98765 43210',   required:false },
    };

    main.innerHTML = `
      <div class="animate-up" style="max-width:480px;margin:60px auto 0">
        <div style="text-align:center;margin-bottom:var(--sp-xl)">
          <div style="font-size:3rem;margin-bottom:var(--sp-sm)">📝</div>
          <h1 style="font-size:1.8rem;font-weight:800;letter-spacing:-.03em">Welcome to QuizPro</h1>
          <p class="text-muted" style="margin-top:var(--sp-sm)">Enter your details to get started</p>
        </div>
        <div class="card-elevated">
          <div style="display:flex;flex-direction:column;gap:var(--sp-md)">
            ${fields.map(f => {
              const def = fieldDefs[f] || { label:f, type:'text', placeholder:f, required:false };
              return `
                <div class="form-group">
                  <label class="form-label">${def.label} ${def.required?'<span style="color:var(--color-error)">*</span>':''}</label>
                  <input id="reg-${f}" class="form-control" type="${def.type}" placeholder="${def.placeholder}"
                         ${def.required?'required':''}>
                </div>`;
            }).join('')}
            <button class="btn btn-primary btn-full btn-lg" style="margin-top:var(--sp-sm)" onclick="Dashboard.register()">
              Continue →
            </button>
          </div>
        </div>
        <p class="text-xs text-muted" style="text-align:center;margin-top:var(--sp-md)">
          Your data is stored locally for this session only
        </p>
      </div>`;
  }

  return { render };
})();

// ── Dashboard actions ─────────────────────────────────────
const Dashboard = (() => {
  function register() {
    const fields = State.get('personalFields');
    const user   = {};
    let valid    = true;
    fields.forEach(f => {
      const el = document.getElementById('reg-' + f);
      if (!el) return;
      if (el.required && !el.value.trim()) {
        el.style.borderColor = 'var(--color-error)';
        valid = false;
      } else {
        el.style.borderColor = '';
        user[f] = el.value.trim();
      }
    });
    if (!valid) { UI.toast('Please fill required fields', 'warn'); return; }
    user.name = user.name || user.email || 'User';
    State.set('user', user);
    UI.toast('Welcome, ' + user.name + '!', 'success');
    UI.navigate('welcome');
  }

  async function startQuiz() {
    if (!State.get('scriptUrl')) {
      UI.toast('Configure your Google Script URL in Settings first', 'warn');
      UI.openSettings(); return;
    }
    UI.setLoading(true, 'Loading topics…');
    try {
      const topics = await API.getTopics();
      State.set('topics', topics);
      const configs = await API.getQuizConfigs();
      State.set('quizConfigs', configs);
      UI.setLoading(false);
      State.reset('setup');
      UI.pushPage('setup-topics');
    } catch(e) {
      UI.setLoading(false);
      UI.toast('Failed to load: ' + e.message, 'error');
    }
  }

  function changeUser() {
    UI.confirm2('Switch to a different user? (Current session will end)', () => {
      State.set('user', null);
      State.set('result', null);
      UI.navigate('welcome');
    });
  }

  return { register, startQuiz, changeUser };
})();
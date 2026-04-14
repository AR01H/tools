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
      <div class="animate-up" style="max-width:1050px; margin:0 auto; padding-top:var(--sp-xl)">
        
        <!-- Header Section -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:var(--sp-xl)">
          <div>
            <p style="font-size:12px; font-weight:700; color:var(--accent-primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px">Welcome Back</p>
            <h1 style="font-size:2.8rem; font-weight:800; letter-spacing:-0.03em; color:var(--text-primary); line-height:1.1">
              ${user.name} <span style="display:inline-block; animation:wave 2s infinite; transform-origin:70% 70%">👋</span>
            </h1>
          </div>
          <div style="display:flex; align-items:center; gap:var(--sp-sm)">
             <div style="background:var(--bg-elevated); padding:8px 16px; border-radius:30px; border:1px solid var(--border-color); font-size:13px; font-weight:600; color:var(--text-primary); box-shadow:0 2px 8px rgba(0,0,0,0.02)">
                📝 <span style="color:var(--text-muted); font-weight:500; margin-right:4px">Mode:</span> Study
             </div>
          </div>
        </div>

        ${!scriptConfigured ? `
          <div class="card" style="border-left:4px solid var(--color-warn); margin-bottom:var(--sp-xl); background:linear-gradient(90deg, rgba(245,158,11,0.05), transparent); display:flex; justify-content:space-between; align-items:center">
            <div>
              <p class="font-bold" style="font-size:1.05rem; color:var(--color-warn); margin-bottom:4px">⚠️ Integration Pending</p>
              <p class="text-muted text-sm">Link your Google Framework API in settings to seamlessly sync real-world database topics.</p>
            </div>
            <button class="btn btn-primary" onclick="UI.openSettings()">Configure Sync</button>
          </div>` : ''}

        <!-- Hero Action Card -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: var(--radius-lg); padding: 48px; position:relative; overflow:hidden; box-shadow: 0 20px 40px -10px rgba(99,102,241,0.3); margin-bottom:48px; color:white; display:flex; justify-content:space-between; align-items:center; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer;" onclick="Dashboard.startQuiz()" class="hero-card-hover">
          <div style="position:absolute; top:-50%; left:-10%; width:400px; height:400px; background:radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%); border-radius:50%"></div>
          <div style="position:absolute; bottom:-40%; right:-10%; width:300px; height:300px; background:radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%); border-radius:50%"></div>
          
          <div style="position:relative; z-index:2; max-width:600px">
            <span style="background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:20px; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.15)">Test Center</span>
            <h2 style="font-size:2.6rem; font-weight:800; margin:16px 0 10px 0; letter-spacing:-0.03em; line-height:1.2">Launch a Practice Session</h2>
            <p style="font-size:1.1rem; opacity:0.85; font-weight:500; line-height:1.5">
              ${topics.length ? `${topics.length} assessment modules synchronized and ready.` : 'Add your external API to unlock high-yield testing matrices.'}
            </p>
          </div>
          
          <div style="position:relative; z-index:2">
            <div style="width:72px; height:72px; background:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 12px 28px -6px rgba(0,0,0,0.3); transition:transform 0.3s" class="hero-arrow">
               <svg width="28" height="28" fill="none" stroke="#4f46e5" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>
          </div>
        </div>

        <!-- Single Column Layout -->
        <div style="display:flex; flex-direction:column; gap:var(--sp-xl)">
          
          <!-- Library Section -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
              <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary);">Library Modules</h3>
              ${topics.length ? `<span class="badge badge-neutral" style="font-size:0.75rem">${topics.length} Sets Available</span>` : ''}
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px">
              ${topics.length ? topics.map(t => `
                <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px; transition:all 0.2s; cursor:pointer;" class="topic-hover-card">
                  <div style="display:flex; align-items:center; gap:12px">
                    <div style="width:32px; height:32px; background:var(--bg-hover); border-radius:6px; display:grid; place-items:center; font-size:1rem;">📚</div>
                    <p style="font-weight:600; font-size:0.9rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="${t.name}">${t.name}</p>
                  </div>
                </div>
              `).join('') : `
                <div style="background:var(--bg-elevated); border:1px dashed var(--border-color); border-radius:var(--radius-md); padding:24px; text-align:center; grid-column: 1 / -1">
                  <p style="color:var(--text-muted); font-size:0.9rem;">No synchronized topics available.</p>
                </div>
              `}
            </div>
          </div>

        </div>
      </div>
      <style>
        @keyframes wave { 0% {transform: rotate(0deg);} 10% {transform: rotate(14deg);} 20% {transform: rotate(-8deg);} 30% {transform: rotate(14deg);} 40% {transform: rotate(-4deg);} 50% {transform: rotate(10deg);} 60% {transform: rotate(0deg);} 100% {transform: rotate(0deg);} }
        .hero-card-hover:hover { transform: translateY(-4px) scale(1.005); box-shadow: 0 25px 50px -12px rgba(99,102,241,0.5) !important; }
        .hero-card-hover:hover .hero-arrow { transform: translateX(6px); }
        .topic-hover-card:hover { transform: translateY(-2px); box-shadow: 0 12px 20px -8px rgba(0,0,0,0.1); border-color: var(--accent-primary) !important; }
      </style>
    `;
  }

  function renderRecentResult() {
    const result = State.get('result');
    const { score } = result;
    const color = score.accuracy >= 70 ? 'var(--color-success)' : score.accuracy >= 40 ? 'var(--color-warn)' : 'var(--color-error)';
    const exactHex = score.accuracy >= 70 ? '#10b981' : score.accuracy >= 40 ? '#f59e0b' : '#ef4444';
    
    return `
      <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-top:4px solid ${color}; border-radius:var(--radius-lg); padding:24px; display:flex; flex-direction:column; position:relative; overflow:hidden">
         <div style="position:absolute; top:-20px; right:-20px; width:100px; height:100px; background:radial-gradient(circle, ${exactHex}1A 0%, transparent 70%); border-radius:50%"></div>
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; position:relative">
           <h4 style="font-size:0.85rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.8px">Latest Run</h4>
           <span style="background:${exactHex}1A; color:${color}; font-size:0.85rem; font-weight:800; padding:4px 12px; border-radius:20px">${score.accuracy}%</span>
         </div>
         <p style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:8px">${score.correct} Correct <span style="color:var(--text-muted);font-weight:400;margin:0 4px">•</span> ${score.wrong} Wrong</p>
         <p style="font-size:0.85rem; color:var(--text-muted); font-weight:500; margin-bottom:20px; display:flex; align-items:center;">
           <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:6px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
           ${fmtTime(score.timeTaken)} Duration
         </p>
         <button class="btn btn-secondary w-full" style="font-size:0.9rem; font-weight:600; padding:10px; border-radius:8px" onclick="UI.navigate('result')">
           Deep Analytics →
         </button>
      </div>
    `;
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
      <div class="animate-up" style="margin:60px auto 0">
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
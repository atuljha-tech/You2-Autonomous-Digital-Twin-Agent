'use strict';
const API = 'http://localhost:5000/api';
const APP = 'http://localhost:3000';

function getUserId() { return new Promise(r => chrome.storage.local.get(['userId'], d => r(d.userId || null))); }
function fmtTime(s) { if (s < 60) return `${s}s`; const m = Math.floor(s/60); return m < 60 ? `${m}m ${s%60}s` : `${Math.floor(m/60)}h ${m%60}m`; }

const CAT_CONFIG = {
  productive:  { label:'✅ Productive',  cls:'cat-productive'  },
  distracting: { label:'⚠️ Distracting', cls:'cat-distracting' },
  neutral:     { label:'○ Neutral',      cls:'cat-neutral'     },
  sensitive:   { label:'🔒 Sensitive',   cls:'cat-sensitive'   },
};

const CAT_EXPLANATION = {
  productive: 'Boosts deep work & cognitive alignment',
  distracting: 'Triggers dopamine loop & attention fragmentation',
  neutral: 'Utility / search site with minimal fatigue impact',
  sensitive: 'Private / auth portal — background tracking paused',
};

function applyCategory(category, scores) {
  const badge = document.getElementById('categoryBadge');
  const cfg = CAT_CONFIG[category] || { label:'— Unknown', cls:'cat-unknown' };
  if (badge) {
    badge.textContent = cfg.label;
    badge.className = `cat-badge ${cfg.cls}`;
  }
  const prod = scores?.productive ?? 0, dist = scores?.distract ?? 0;
  const prodBar = document.getElementById('prodBar');
  const distBar = document.getElementById('distBar');
  const prodNum = document.getElementById('prodNum');
  const distNum = document.getElementById('distNum');
  if (prodBar) prodBar.style.width = `${prod}%`;
  if (distBar) distBar.style.width = `${dist}%`;
  if (prodNum) prodNum.textContent = `${prod}%`;
  if (distNum) distNum.textContent = `${dist}%`;

  const reasonEl = document.getElementById('siteReason');
  if (reasonEl) {
    reasonEl.textContent = CAT_EXPLANATION[category] || 'Live behavioral analyzer evaluating focus relevance.';
  }

  const banner = document.getElementById('sensitive-warning');
  const card = document.getElementById('site-card');
  if (banner && card) {
    if (category === 'sensitive') { banner.classList.remove('hidden'); card.style.opacity = '.4'; }
    else { banner.classList.add('hidden'); card.style.opacity = '1'; }
  }
}

function showMission(mission) {
  const none = document.getElementById('mission-none');
  const card = document.getElementById('mission-card');
  if (!none || !card) return;
  if (!mission) { none.classList.remove('hidden'); card.classList.add('hidden'); return; }
  none.classList.add('hidden'); card.classList.remove('hidden');
  const titleEl = document.getElementById('missionTitle');
  const catEl = document.getElementById('missionCat');
  const timeEl = document.getElementById('missionTime');
  const fillEl = document.getElementById('missionFill');
  if (titleEl) titleEl.textContent = mission.title;
  if (catEl) catEl.textContent = mission.category || 'task';
  if (timeEl) timeEl.textContent = `⏱ ${mission.timeEstimate || mission.estimatedMinutes + 'm'}`;
  if (fillEl) fillEl.style.width = `${mission.progressPercent || 0}%`;
  
  if (mission.startedAt) {
    const start = new Date(mission.startedAt).getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const el = document.getElementById('missionTimer');
      if (el) el.textContent = fmtTime(elapsed);
    };
    tick();
    setInterval(tick, 1000);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const setupSection = document.getElementById('setup-section');
  const connectedSection = document.getElementById('connected-section');
  const userIdInput = document.getElementById('userIdInput');
  const connectBtn = document.getElementById('connectBtn');
  const loadingState = document.getElementById('loading-state');
  const userMetrics = document.getElementById('user-metrics');
  const siteNameEl = document.getElementById('siteNameEl');
  const sessionTimerEl = document.getElementById('sessionTimer');

  const userId = await getUserId();
  if (userId) { showConnected(); fetchUserData(userId); fetchActiveMission(userId); }
  else showSetup();

  // Get current tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.startsWith('http')) {
      if (siteNameEl) siteNameEl.textContent = new URL(tab.url).hostname.replace(/^www\./, '');
      chrome.tabs.sendMessage(tab.id, { action: 'getPageAnalysis' }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          chrome.runtime.sendMessage({ action: 'getCurrentActivity' }, (r) => {
            if (r) { applyCategory(r.category || 'neutral', null); updateTimer(r.elapsed || 0); }
          });
          return;
        }
        const { analysis, activeSeconds } = resp;
        if (analysis) applyCategory(analysis.category, { productive: analysis.productiveScore, distract: analysis.distractScore });
        updateTimer(activeSeconds || 0);
      });
    } else { 
      if (siteNameEl) siteNameEl.textContent = 'Non-web page'; 
      applyCategory('neutral', null); 
    }
  } catch (err) {
    console.error('Error fetching tab:', err);
  }

  let timerBase = 0, timerInterval = null;
  function updateTimer(s) {
    timerBase = s; clearInterval(timerInterval);
    timerInterval = setInterval(() => { 
      timerBase++; 
      if (sessionTimerEl) sessionTimerEl.textContent = fmtTime(timerBase); 
    }, 1000);
    if (sessionTimerEl) sessionTimerEl.textContent = fmtTime(timerBase);
  }

  async function fetchUserData(id) {
    if (loadingState) loadingState.classList.remove('hidden'); 
    if (userMetrics) userMetrics.classList.add('hidden');
    try {
      const res = await fetch(`${API}/get-user/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error();
      const user = data.user;
      const score = user.productivityScore ?? 0;
      
      const scoreEl = document.getElementById('scoreEl');
      if (scoreEl) {
        scoreEl.textContent = `${score}/100`;
        scoreEl.style.color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
      }

      const goalsEl = document.getElementById('goalsEl');
      if (goalsEl) goalsEl.textContent = user.goals?.length ?? 0;
      
      const streakEl = document.getElementById('streakEl');
      if (streakEl) streakEl.textContent = `${user.history?.length || 0}`;

      const twinNameEl = document.getElementById('twinUserName');
      if (twinNameEl) twinNameEl.textContent = `${user.name || 'User'}'s Twin`;

      const archetypeEl = document.getElementById('twinArchetype');
      if (archetypeEl) {
        const archetype = user.archetype || 'Neural Explorer';
        archetypeEl.textContent = `⚡ Archetype: ${archetype}`;
      }

      if (loadingState) loadingState.classList.add('hidden'); 
      if (userMetrics) userMetrics.classList.remove('hidden');
    } catch (e) { 
      if (loadingState) loadingState.innerHTML = '<span style="color:#f87171">⚠️ Server offline</span>'; 
    }
  }

  async function fetchActiveMission(id) {
    try {
      const res = await fetch(`${API}/tasks/active/${id}`);
      const data = await res.json();
      showMission(data.active || null);
    } catch { showMission(null); }
  }

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      const id = userIdInput ? userIdInput.value.trim() : '';
      if (!id) { if (userIdInput) userIdInput.focus(); return; }
      connectBtn.innerHTML = '<span class="spinner"></span>Connecting…';
      connectBtn.disabled = true;
      try {
        const res = await fetch(`${API}/get-user/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error();
        await chrome.runtime.sendMessage({ action: 'setUserId', userId: id });
        showConnected(); fetchUserData(id); fetchActiveMission(id);
      } catch {
        connectBtn.innerHTML = 'Connect Account'; connectBtn.disabled = false;
        if (userIdInput) {
          userIdInput.style.borderColor = '#ef4444';
          setTimeout(() => { userIdInput.style.borderColor = ''; }, 2000);
        }
      }
    });
  }

  if (userIdInput) {
    userIdInput.addEventListener('keydown', e => { if (e.key === 'Enter') connectBtn.click(); });
  }

  const openMissionsBtn = document.getElementById('openMissionsBtn');
  if (openMissionsBtn) openMissionsBtn.addEventListener('click', () => chrome.tabs.create({ url: `${APP}/missions` }));

  const openChatBtn = document.getElementById('openChatBtn');
  if (openChatBtn) openChatBtn.addEventListener('click', () => chrome.tabs.create({ url: `${APP}/chat` }));

  const openDashboardBtn = document.getElementById('openDashboardBtn');
  if (openDashboardBtn) openDashboardBtn.addEventListener('click', () => chrome.tabs.create({ url: `${APP}/dashboard` }));

  const disconnectBtn = document.getElementById('disconnectBtn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
      await chrome.storage.local.remove('userId');
      clearInterval(timerInterval);
      showSetup();
    });
  }

  function showSetup() { 
    if (setupSection) setupSection.classList.remove('hidden'); 
    if (connectedSection) connectedSection.classList.add('hidden'); 
  }
  function showConnected() { 
    if (setupSection) setupSection.classList.add('hidden'); 
    if (connectedSection) connectedSection.classList.remove('hidden'); 
  }
});

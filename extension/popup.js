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

function applyCategory(category, scores) {
  const badge = document.getElementById('categoryBadge');
  const cfg = CAT_CONFIG[category] || { label:'— Unknown', cls:'cat-unknown' };
  badge.textContent = cfg.label;
  badge.className = `cat-badge ${cfg.cls}`;
  const prod = scores?.productive ?? 0, dist = scores?.distract ?? 0;
  document.getElementById('prodBar').style.width = `${prod}%`;
  document.getElementById('distBar').style.width = `${dist}%`;
  document.getElementById('prodNum').textContent = `${prod}%`;
  document.getElementById('distNum').textContent = `${dist}%`;
  const banner = document.getElementById('sensitive-warning');
  const card = document.getElementById('site-card');
  if (category === 'sensitive') { banner.classList.remove('hidden'); card.style.opacity = '.4'; }
  else { banner.classList.add('hidden'); card.style.opacity = '1'; }
}

function showMission(mission) {
  const none = document.getElementById('mission-none');
  const card = document.getElementById('mission-card');
  if (!mission) { none.classList.remove('hidden'); card.classList.add('hidden'); return; }
  none.classList.add('hidden'); card.classList.remove('hidden');
  document.getElementById('missionTitle').textContent = mission.title;
  document.getElementById('missionCat').textContent = mission.category || 'task';
  document.getElementById('missionTime').textContent = `⏱ ${mission.timeEstimate || mission.estimatedMinutes + 'm'}`;
  document.getElementById('missionFill').style.width = `${mission.progressPercent || 0}%`;
  // Live timer
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
      siteNameEl.textContent = new URL(tab.url).hostname.replace(/^www\./, '');
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
    } else { siteNameEl.textContent = 'Non-web page'; applyCategory('neutral', null); }
  } catch {}

  let timerBase = 0, timerInterval = null;
  function updateTimer(s) {
    timerBase = s; clearInterval(timerInterval);
    timerInterval = setInterval(() => { timerBase++; sessionTimerEl.textContent = fmtTime(timerBase); }, 1000);
    sessionTimerEl.textContent = fmtTime(timerBase);
  }

  async function fetchUserData(id) {
    loadingState.classList.remove('hidden'); userMetrics.classList.add('hidden');
    try {
      const res = await fetch(`${API}/get-user/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error();
      const score = data.user.productivityScore ?? 0;
      document.getElementById('scoreEl').textContent = `${score}/100`;
      document.getElementById('scoreEl').style.color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
      document.getElementById('goalsEl').textContent = data.user.goals?.length ?? 0;
      loadingState.classList.add('hidden'); userMetrics.classList.remove('hidden');
    } catch { loadingState.innerHTML = '<span style="color:#f87171">⚠️ Server offline</span>'; }
  }

  async function fetchActiveMission(id) {
    try {
      const res = await fetch(`${API}/tasks/active/${id}`);
      const data = await res.json();
      showMission(data.active || null);
    } catch { showMission(null); }
  }

  connectBtn.addEventListener('click', async () => {
    const id = userIdInput.value.trim();
    if (!id) { userIdInput.focus(); return; }
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
      userIdInput.style.borderColor = '#ef4444';
      setTimeout(() => { userIdInput.style.borderColor = ''; }, 2000);
    }
  });

  userIdInput.addEventListener('keydown', e => { if (e.key === 'Enter') connectBtn.click(); });
  document.getElementById('openMissionsBtn').addEventListener('click', () => chrome.tabs.create({ url: `${APP}/missions` }));
  document.getElementById('openChatBtn').addEventListener('click', () => chrome.tabs.create({ url: `${APP}/chat` }));
  document.getElementById('openDashboardBtn').addEventListener('click', () => chrome.tabs.create({ url: `${APP}/dashboard` }));
  document.getElementById('disconnectBtn').addEventListener('click', async () => {
    await chrome.storage.local.remove('userId');
    clearInterval(timerInterval);
    showSetup();
  });

  function showSetup() { setupSection.classList.remove('hidden'); connectedSection.classList.add('hidden'); }
  function showConnected() { setupSection.classList.add('hidden'); connectedSection.classList.remove('hidden'); }
});

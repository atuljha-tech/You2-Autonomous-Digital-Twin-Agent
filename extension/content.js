/**
 * You² Content Script — Smart Focus Agent v3
 * Universal distraction detection + escalating intervention system
 */
'use strict';

const YOU2 = 'you2';
const SCAN_DELAY = 1500;
const NUDGE_COOLDOWN = 5 * 60 * 1000;

// Escalation thresholds (ms of active distraction time)
const LEVEL1_MS = 15 * 60 * 1000; // 15 min — soft reminder
const LEVEL2_MS = 30 * 60 * 1000; // 30 min — stronger alert
const LEVEL3_MS = 45 * 60 * 1000; // 45 min — countdown popup
const LEVEL4_MS = 60 * 60 * 1000; // 60 min — auto action

const SIGNALS = {
  sensitive: {
    domain: ['bank','banking','chase','wellsfargo','citibank','barclays','hsbc','paypal','stripe','venmo','cashapp','zelle','wise','revolut','irs','gov','hospital','clinic','health','insurance','medicare','tax','wallet','crypto','coinbase','binance','kraken','login','signin','auth','sso','passport','visa'],
    title:   ['sign in','log in','login','secure','account','password','payment','checkout','billing','invoice','bank','tax return','medical','health record','insurance claim'],
    path:    ['/login','/signin','/auth','/checkout','/payment','/billing','/account','/secure','/portal'],
  },
  distracting: {
    domain: ['youtube','youtu.be','instagram','facebook','twitter','x.com','tiktok','snapchat','reddit','netflix','twitch','hulu','disneyplus','primevideo','spotify','soundcloud','pinterest','tumblr','discord','9gag','buzzfeed','dailymotion','vimeo','rumble','roblox','miniclip','poki','friv','kick.com'],
    title:  ['trending','viral','meme','funny','lol','watch now','stream','episode','season','shorts','reels','for you','explore','feed','timeline','stories','live now','gaming','gameplay','walkthrough'],
    meta:   ['entertainment','social network','video sharing','streaming','short video','memes','funny videos','gaming community'],
    body:   ['subscribe','follow us','like and share','trending now','recommended for you','watch next','autoplay','for you page','scroll for more','swipe up','going live'],
  },
  productive: {
    domain: ['github','gitlab','bitbucket','stackoverflow','stackexchange','leetcode','hackerrank','codeforces','codechef','atcoder','coursera','udemy','edx','khanacademy','pluralsight','freecodecamp','theodinproject','codecademy','notion','figma','miro','docs.google','linear','jira','trello','asana','vercel','netlify','developer.mozilla','devdocs','w3schools','medium','dev.to','hashnode','arxiv','scholar.google','replit','codesandbox','codepen','takeuforward','neetcode','interviewbit','pramp'],
    title:  ['documentation','tutorial','learn','course','lecture','how to','guide','reference','api','algorithm','data structure','system design','interview','problem','solution','exercise','practice','challenge','research','paper','study','notes','project','build','deploy','debug','review','pull request','commit'],
    meta:   ['programming','software development','coding','developer tools','education','online learning','productivity','project management'],
    body:   ['function','const ','import ','export ','class ','interface','repository','commit','branch','merge','pull request','algorithm','complexity','runtime','compile','debug','deadline','sprint','milestone'],
  },
  neutral: {
    domain: ['wikipedia','wikimedia','britannica','amazon','ebay','nytimes','bbc','cnn','reuters','theguardian','techcrunch','ycombinator','producthunt','maps.google','translate.google'],
    title:  ['news','article','blog','review','opinion','analysis','shopping','product','weather','forecast','map','directions','translate'],
  },
};

// ─── State ────────────────────────────────────────────────────────────────────
let pageAnalysis = null;
let escalationTimer = null;
let countdownTimer = null;
let lastNudgeTime = 0;
let isPageVisible = !document.hidden;
let accumulatedMs = 0;
let lastActiveTs = Date.now();
let currentLevel = 0;
let countdownInterval = null;

// ─── Utilities ────────────────────────────────────────────────────────────────
const getDomain = () => window.location.hostname.replace(/^www\./, '').toLowerCase();
const getPath   = () => window.location.pathname.toLowerCase();
const getTitle  = () => (document.title || '').toLowerCase();
const getMeta   = (n) => { const el = document.querySelector(`meta[name="${n}"],meta[property="${n}"],meta[property="og:${n}"]`); return (el?.getAttribute('content') || '').toLowerCase(); };
const getBody   = () => { try { const c = document.body.cloneNode(true); c.querySelectorAll('script,style,noscript,svg').forEach(e => e.remove()); return (c.innerText || c.textContent || '').slice(0, 3000).toLowerCase(); } catch { return ''; } };
const scoreKw   = (text, kws) => { if (!text) return 0; let h = 0; for (const k of kws) if (text.includes(k)) h++; return Math.min(100, Math.round((h / Math.max(kws.length, 1)) * 300)); };

function getActiveSeconds() {
  const extra = lastActiveTs ? Date.now() - lastActiveTs : 0;
  return Math.floor((accumulatedMs + extra) / 1000);
}

// ─── Page Analysis ────────────────────────────────────────────────────────────
function analyzePage() {
  try {
    const domain = getDomain(), path = getPath(), title = getTitle();
    const metaDesc = getMeta('description'), metaKw = getMeta('keywords'), ogType = getMeta('type');
    const body = getBody();

    // Sensitive check
    const sDom = SIGNALS.sensitive.domain.some(k => domain.includes(k));
    const sTit = SIGNALS.sensitive.title.some(k => title.includes(k));
    const sPth = SIGNALS.sensitive.path.some(k => path.startsWith(k));
    const sensitiveScore = (sDom ? 60 : 0) + (sTit ? 25 : 0) + (sPth ? 15 : 0);
    if (sensitiveScore >= 60) return { category: 'sensitive', sensitiveScore, productiveScore: 0, distractScore: 0, domain, title: document.title.slice(0, 60) };

    const prodScore = Math.min(100, Math.round(
      (SIGNALS.productive.domain.some(k => domain.includes(k)) ? 50 : 0) * 0.5 +
      scoreKw(title, SIGNALS.productive.title) * 0.25 +
      scoreKw(metaDesc + metaKw, SIGNALS.productive.meta) * 0.15 +
      scoreKw(body, SIGNALS.productive.body) * 0.10
    ));
    const distScore = Math.min(100, Math.round(
      (SIGNALS.distracting.domain.some(k => domain.includes(k)) ? 50 : 0) * 0.5 +
      scoreKw(title, SIGNALS.distracting.title) * 0.25 +
      scoreKw(metaDesc + metaKw, SIGNALS.distracting.meta) * 0.15 +
      scoreKw(body, SIGNALS.distracting.body) * 0.10
    ));
    const neutScore = Math.min(100, Math.round(
      (SIGNALS.neutral.domain.some(k => domain.includes(k)) ? 40 : 0) * 0.6 +
      scoreKw(title, SIGNALS.neutral.title) * 0.4
    ));

    let category = 'neutral';
    const max = Math.max(prodScore, distScore, neutScore);
    if (distScore >= 30 && distScore === max) category = 'distracting';
    else if (prodScore >= 25 && prodScore === max) category = 'productive';
    else if (neutScore >= 20 && neutScore === max) category = 'neutral';
    else if (distScore >= 20) category = 'distracting';
    else if (prodScore >= 15) category = 'productive';

    return { category, productiveScore: prodScore, distractScore: distScore, neutralScore: neutScore, sensitiveScore, domain, title: document.title.slice(0, 60) };
  } catch {
    return { category: 'neutral', productiveScore: 0, distractScore: 0, neutralScore: 0, sensitiveScore: 0, domain: getDomain(), title: '' };
  }
}

// ─── Inject Styles ────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById(`${YOU2}-styles`)) return;
  const s = document.createElement('style');
  s.id = `${YOU2}-styles`;
  s.textContent = `
    @keyframes you2-in  { from { transform:translateX(calc(100% + 24px));opacity:0; } to { transform:translateX(0);opacity:1; } }
    @keyframes you2-out { from { transform:translateX(0);opacity:1; } to { transform:translateX(calc(100% + 24px));opacity:0; } }
    @keyframes you2-toast-in  { from { transform:translateY(20px);opacity:0; } to { transform:translateY(0);opacity:1; } }
    @keyframes you2-toast-out { from { transform:translateY(0);opacity:1; } to { transform:translateY(20px);opacity:0; } }
    @keyframes you2-pulse { 0%,100%{transform:scale(1);opacity:.6;} 50%{transform:scale(1.6);opacity:0;} }
    @keyframes you2-countdown { from{stroke-dashoffset:0;} to{stroke-dashoffset:283;} }
    #${YOU2}-nudge *, #${YOU2}-toast * { box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important; }
    #${YOU2}-nudge button:hover { opacity:.85; transform:translateY(-1px); }
  `;
  document.head.appendChild(s);
}

// ─── Level 1: Soft Reminder (15 min) ─────────────────────────────────────────
function showLevel1(domain) {
  if (document.getElementById(`${YOU2}-nudge`)) return;
  injectStyles();
  const el = document.createElement('div');
  el.id = `${YOU2}-nudge`;
  Object.assign(el.style, {
    position:'fixed', bottom:'24px', right:'24px', width:'300px',
    background:'linear-gradient(145deg,rgba(15,18,28,.96),rgba(22,28,45,.96))',
    backdropFilter:'blur(20px)', border:'1px solid rgba(245,158,11,.3)',
    borderRadius:'18px', boxShadow:'0 16px 40px rgba(0,0,0,.5)',
    zIndex:'2147483647', overflow:'hidden',
    animation:`you2-in .4s cubic-bezier(.34,1.56,.64,1) forwards`, color:'#f8fafc',
  });
  el.innerHTML = `
    <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#ef4444)"></div>
    <div style="padding:16px 18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:22px">⏰</span>
        <div>
          <div style="font-size:13px;font-weight:800">You planned to focus today.</div>
          <div style="font-size:11px;opacity:.5;margin-top:1px">15 min on ${domain}</div>
        </div>
        <button id="${YOU2}-close" style="margin-left:auto;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);width:24px;height:24px;border-radius:7px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button id="${YOU2}-stay" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);padding:9px;border-radius:10px;cursor:pointer;font-size:11px;font-weight:600">Stay Here</button>
        <button id="${YOU2}-focus" style="background:linear-gradient(135deg,#8b5cf6,#6366f1);border:none;color:white;padding:9px;border-radius:10px;cursor:pointer;font-size:11px;font-weight:700">⚡ Focus Mode</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const dismiss = () => { el.style.animation = `you2-out .3s ease forwards`; setTimeout(() => el.remove(), 300); };
  document.getElementById(`${YOU2}-close`).onclick = dismiss;
  document.getElementById(`${YOU2}-stay`).onclick = dismiss;
  document.getElementById(`${YOU2}-focus`).onclick = () => { dismiss(); window.open('http://localhost:3000/tasks', '_blank'); };
  setTimeout(dismiss, 15000);
}


// ─── Level 2: Stronger Alert (30 min) ────────────────────────────────────────
function showLevel2(domain) {
  document.getElementById(`${YOU2}-nudge`)?.remove();
  injectStyles();
  const el = document.createElement('div');
  el.id = `${YOU2}-nudge`;
  Object.assign(el.style, {
    position:'fixed', bottom:'24px', right:'24px', width:'320px',
    background:'linear-gradient(145deg,rgba(15,18,28,.97),rgba(22,28,45,.97))',
    backdropFilter:'blur(20px)', border:'1px solid rgba(239,68,68,.4)',
    borderRadius:'20px', boxShadow:'0 20px 50px rgba(0,0,0,.6)',
    zIndex:'2147483647', overflow:'hidden',
    animation:`you2-in .4s cubic-bezier(.34,1.56,.64,1) forwards`, color:'#f8fafc',
  });
  el.innerHTML = `
    <div style="height:3px;background:linear-gradient(90deg,#ef4444,#f97316)"></div>
    <div style="padding:18px 20px">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
        <div style="position:relative;width:36px;height:36px;flex-shrink:0">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,.2);animation:you2-pulse 1.4s ease-out infinite"></div>
          <div style="position:relative;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center;font-size:16px">🧠</div>
        </div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:800">30 minutes consumed.</div>
          <div style="font-size:12px;opacity:.7;margin-top:2px">Return to your mission?</div>
        </div>
        <button id="${YOU2}-close" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);width:24px;height:24px;border-radius:7px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px;opacity:.85">
        You've been on <strong style="color:#f87171">${domain}</strong> for 30 minutes. Your goals are waiting.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <button id="${YOU2}-stay" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);padding:10px;border-radius:12px;cursor:pointer;font-size:11px;font-weight:600">Stay Here</button>
        <button id="${YOU2}-focus" style="background:linear-gradient(135deg,#8b5cf6,#6366f1);border:none;color:white;padding:10px;border-radius:12px;cursor:pointer;font-size:11px;font-weight:700;box-shadow:0 4px 14px rgba(139,92,246,.4)">⚡ Focus Mode</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button id="${YOU2}-leetcode" style="background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.25);color:#fbbf24;padding:9px;border-radius:12px;cursor:pointer;font-size:11px;font-weight:600">Open LeetCode</button>
        <button id="${YOU2}-dashboard" style="background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.25);color:#22d3ee;padding:9px;border-radius:12px;cursor:pointer;font-size:11px;font-weight:600">Dashboard</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const dismiss = () => { el.style.animation = `you2-out .3s ease forwards`; setTimeout(() => el.remove(), 300); };
  document.getElementById(`${YOU2}-close`).onclick = dismiss;
  document.getElementById(`${YOU2}-stay`).onclick = dismiss;
  document.getElementById(`${YOU2}-focus`).onclick = () => { dismiss(); window.open('http://localhost:3000/tasks', '_blank'); };
  document.getElementById(`${YOU2}-leetcode`).onclick = () => { dismiss(); window.open('https://leetcode.com/problemset/', '_blank'); };
  document.getElementById(`${YOU2}-dashboard`).onclick = () => { dismiss(); window.open('http://localhost:3000/dashboard', '_blank'); };
  setTimeout(dismiss, 25000);
}

// ─── Level 3: Countdown Popup (45 min) ───────────────────────────────────────
function showLevel3(domain) {
  document.getElementById(`${YOU2}-nudge`)?.remove();
  injectStyles();
  let secondsLeft = 5 * 60; // 5 min countdown
  const el = document.createElement('div');
  el.id = `${YOU2}-nudge`;
  Object.assign(el.style, {
    position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
    width:'360px',
    background:'linear-gradient(145deg,rgba(11,14,20,.98),rgba(15,18,28,.98))',
    backdropFilter:'blur(24px)', border:'1px solid rgba(239,68,68,.5)',
    borderRadius:'24px', boxShadow:'0 32px 80px rgba(0,0,0,.8)',
    zIndex:'2147483647', overflow:'hidden', color:'#f8fafc',
  });

  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  el.innerHTML = `
    <div style="height:3px;background:linear-gradient(90deg,#ef4444,#f97316,#f59e0b)"></div>
    <div style="padding:24px;text-align:center">
      <div style="font-size:13px;font-weight:700;color:rgba(239,68,68,.9);margin-bottom:16px;letter-spacing:.05em;text-transform:uppercase">⚠️ Focus Agent Intervention</div>
      <div style="position:relative;width:100px;height:100px;margin:0 auto 16px">
        <svg width="100" height="100" style="transform:rotate(-90deg)">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/>
          <circle id="${YOU2}-ring" cx="50" cy="50" r="45" fill="none" stroke="#ef4444" stroke-width="6"
            stroke-dasharray="283" stroke-dashoffset="0" stroke-linecap="round"
            style="transition:stroke-dashoffset 1s linear"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div id="${YOU2}-countdown-num" style="font-size:22px;font-weight:900;color:#ef4444">${fmt(secondsLeft)}</div>
          <div style="font-size:9px;opacity:.5;margin-top:2px">until action</div>
        </div>
      </div>
      <div style="font-size:15px;font-weight:800;margin-bottom:6px">45 Minutes on ${domain}</div>
      <div style="font-size:12px;opacity:.6;margin-bottom:20px">Auto-close in 5 minutes unless overridden.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <button id="${YOU2}-override" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.8);padding:12px;border-radius:14px;cursor:pointer;font-size:12px;font-weight:700">Override</button>
        <button id="${YOU2}-focus" style="background:linear-gradient(135deg,#8b5cf6,#6366f1);border:none;color:white;padding:12px;border-radius:14px;cursor:pointer;font-size:12px;font-weight:800;box-shadow:0 4px 20px rgba(139,92,246,.5)">⚡ Focus Now</button>
      </div>
      <button id="${YOU2}-close-tab" style="width:100%;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;padding:10px;border-radius:14px;cursor:pointer;font-size:12px;font-weight:700">Close This Tab</button>
    </div>`;
  document.body.appendChild(el);

  // Countdown tick
  const tick = () => {
    secondsLeft--;
    const numEl = document.getElementById(`${YOU2}-countdown-num`);
    const ringEl = document.getElementById(`${YOU2}-ring`);
    if (numEl) numEl.textContent = fmt(secondsLeft);
    if (ringEl) ringEl.style.strokeDashoffset = String(283 * (1 - secondsLeft / 300));
    if (secondsLeft <= 0) {
      clearInterval(countdownInterval);
      el.remove();
      showLevel4();
    }
  };
  countdownInterval = setInterval(tick, 1000);

  const dismiss = () => { clearInterval(countdownInterval); el.style.animation = `you2-out .3s ease forwards`; setTimeout(() => el.remove(), 300); };
  document.getElementById(`${YOU2}-override`).onclick = dismiss;
  document.getElementById(`${YOU2}-focus`).onclick = () => { dismiss(); window.open('http://localhost:3000/tasks', '_blank'); };
  document.getElementById(`${YOU2}-close-tab`).onclick = () => { dismiss(); chrome.runtime.sendMessage({ action: 'closeTab' }).catch(() => {}); };
}

// ─── Level 4: Auto Action (60 min) ───────────────────────────────────────────
function showLevel4() {
  clearInterval(countdownInterval);
  document.getElementById(`${YOU2}-nudge`)?.remove();
  // Redirect to LeetCode or dashboard
  const redirectUrl = 'https://leetcode.com/problemset/';
  window.location.href = redirectUrl;
}

// ─── Positive Toast ───────────────────────────────────────────────────────────
function showPositiveToast() {
  if (document.getElementById(`${YOU2}-toast`)) return;
  injectStyles();
  const t = document.createElement('div');
  t.id = `${YOU2}-toast`;
  Object.assign(t.style, {
    position:'fixed', bottom:'24px', right:'24px',
    background:'linear-gradient(135deg,rgba(16,185,129,.95),rgba(6,182,212,.95))',
    backdropFilter:'blur(12px)', color:'white',
    padding:'12px 18px', borderRadius:'14px',
    boxShadow:'0 8px 32px rgba(16,185,129,.35)',
    zIndex:'2147483647', fontSize:'13px', fontWeight:'600',
    fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    display:'flex', alignItems:'center', gap:'8px',
    animation:'you2-toast-in .35s cubic-bezier(.34,1.56,.64,1) forwards',
    maxWidth:'280px',
  });
  t.innerHTML = `<span style="font-size:18px;flex-shrink:0">✅</span><span>Great choice. This aligns with your goals.</span>`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.animation = 'you2-toast-out .3s ease forwards'; setTimeout(() => t.remove(), 300); }, 4000);
}

// ─── Timer management ─────────────────────────────────────────────────────────
function startActiveTimer() { lastActiveTs = Date.now(); }
function pauseActiveTimer() { if (lastActiveTs) { accumulatedMs += Date.now() - lastActiveTs; lastActiveTs = null; } }

document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden;
  if (isPageVisible) startActiveTimer();
  else { pauseActiveTimer(); clearTimeout(escalationTimer); }
});

// ─── Intent Check (20s Auto-close) ─────────────────────────────────────────────
function showIntentCheck(domain) {
  if (document.getElementById(`${YOU2}-nudge`)) return;
  injectStyles();
  let secondsLeft = 20;
  const el = document.createElement('div');
  el.id = `${YOU2}-nudge`;
  Object.assign(el.style, {
    position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
    width:'390px',
    background:'linear-gradient(145deg,rgba(11,14,20,.98),rgba(15,18,28,.98))',
    backdropFilter:'blur(24px)', border:'1px solid rgba(239,68,68,.5)',
    borderRadius:'24px', boxShadow:'0 32px 80px rgba(0,0,0,.8)',
    zIndex:'2147483647', overflow:'hidden', color:'#f8fafc',
  });

  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  el.innerHTML = `
    <div style="height:4px;background:linear-gradient(90deg,#ef4444,#f97316,#f59e0b)"></div>
    <div style="padding:24px;text-align:center">
      <div style="font-size:14px;font-weight:700;color:rgba(239,68,68,.9);margin-bottom:12px;letter-spacing:.05em;text-transform:uppercase">⚠️ Agent Intervention</div>
      
      <div style="font-size:18px;font-weight:800;margin-bottom:6px">Should you be here on ${domain}?</div>
      <div style="font-size:13px;opacity:.7;margin-bottom:18px">Why are you visiting right now? Provide a valid reason or close the site.</div>
      
      <div style="position:relative;width:80px;height:80px;margin:0 auto 16px">
        <svg width="80" height="80" style="transform:rotate(-90deg)">
          <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>
          <circle id="${YOU2}-ring" cx="40" cy="40" r="35" fill="none" stroke="#ef4444" stroke-width="5"
            stroke-dasharray="220" stroke-dashoffset="0" stroke-linecap="round"
            style="transition:stroke-dashoffset 1s linear"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div id="${YOU2}-countdown-num" style="font-size:20px;font-weight:900;color:#ef4444">${secondsLeft}s</div>
        </div>
      </div>
      
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px">
        <input type="text" id="${YOU2}-reason" placeholder="I am here because..." style="width:100%;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:white;font-size:13px;outline:none;" />
        <div id="${YOU2}-reason-error" style="display:none;color:#f87171;font-size:11px;font-weight:600">Please type a reason (at least 4 characters).</div>
        <button id="${YOU2}-override" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.9);padding:11px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">Stay (Submit Reason)</button>
        <button id="${YOU2}-close-tab" style="background:linear-gradient(135deg,#ef4444,#dc2626);border:none;color:white;padding:11px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 4px 16px rgba(239,68,68,.4)">Close Site Now</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  // Countdown tick
  const tick = () => {
    secondsLeft--;
    const numEl = document.getElementById(`${YOU2}-countdown-num`);
    const ringEl = document.getElementById(`${YOU2}-ring`);
    if (numEl) numEl.textContent = `${secondsLeft}s`;
    if (ringEl) ringEl.style.strokeDashoffset = String(220 * (1 - secondsLeft / 20));
    if (secondsLeft <= 0) {
      clearInterval(countdownInterval);
      el.remove();
      chrome.runtime.sendMessage({ action: 'closeTab' }).catch(() => {});
    }
  };
  countdownInterval = setInterval(tick, 1000);

  const dismiss = () => { clearInterval(countdownInterval); el.style.animation = 'you2-out .3s ease forwards'; setTimeout(() => el.remove(), 300); };
  
  document.getElementById(`${YOU2}-override`).onclick = () => {
    const reason = document.getElementById(`${YOU2}-reason`).value;
    if(reason.trim().length > 3) {
      dismiss();
    } else {
      alert("Please provide a valid reason.");
    }
  };
  document.getElementById(`${YOU2}-close-tab`).onclick = () => { dismiss(); chrome.runtime.sendMessage({ action: 'closeTab' }).catch(()=>{}); };
}

// ─── Escalation Scheduler ─────────────────────────────────────────────────────
function scheduleEscalation(analysis) {
  clearTimeout(escalationTimer);
  if (analysis.category !== 'distracting') return;

  const domain = analysis.domain;

  // Immediate intent check with 15s countdown
  escalationTimer = setTimeout(() => {
    if (!document.hidden) { showIntentCheck(domain); currentLevel = 1; }
  }, 3000); // Wait 3 seconds before showing the prompt
}

// ─── Permanent Widget ─────────────────────────────────────────────────────────
function injectPermanentWidget(analysis) {
  // Remove existing widget if present (e.g. SPA navigation)
  const existing = document.getElementById(`${YOU2}-widget-host`);
  if (existing) existing.remove();

  const isProd = analysis.category === 'productive';
  const isDist = analysis.category === 'distracting';
  const color  = isProd ? '#10b981' : isDist ? '#ef4444' : '#64748b';
  const glow   = isProd ? 'rgba(16,185,129,0.5)' : isDist ? 'rgba(239,68,68,0.5)' : 'rgba(100,116,139,0.3)';
  const label  = isProd ? '✅ Productive Session' : isDist ? '⚠️ Distracting Session' : 'ℹ️ Neutral Session';
  const safeTime = isDist ? 'After 7 PM or weekends only' : 'Anytime during deep work';
  const adv    = isProd
    ? '<b>Advantage:</b> High focus zone — builds skills & boosts your productivity score.'
    : isDist ? '<b>Advantage:</b> None detected. This site derails your workflow.'
    : '<b>Advantage:</b> Informational content — keep sessions short.';
  const disadv = isDist
    ? '<b>Disadvantage:</b> High distraction risk — dopamine loop detected. Agent is watching.'
    : '<b>Disadvantage:</b> Risk of burnout if used without scheduled breaks.';

  // Create host element — fixed host outside body to survive SPA re-renders
  const host = document.createElement('div');
  host.id = `${YOU2}-widget-host`;
  host.setAttribute('style', [
    'position:fixed', 'bottom:24px', 'left:24px', 'z-index:2147483647',
    'display:flex', 'flex-direction:column-reverse', 'align-items:flex-start', 'gap:10px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif',
    'pointer-events:none',
  ].join(';'));

  host.innerHTML = `
    <style>
      #${YOU2}-widget-btn {
        position:relative;
        width:54px; height:54px; border-radius:50%;
        background: linear-gradient(145deg,#1e293b,#0b0e14);
        border: 2px solid ${color};
        box-shadow: 0 4px 24px ${glow}, 0 0 0 4px ${glow.replace('0.5','0.15')};
        cursor:pointer; display:flex; align-items:center; justify-content:center;
        font-size:24px; transition:all 0.25s ease; pointer-events:auto;
        animation: you2-widget-pulse 3s ease-in-out infinite;
      }
      #${YOU2}-widget-btn:hover { transform:scale(1.1); box-shadow: 0 6px 32px ${glow}; }
      @keyframes you2-widget-pulse {
        0%,100% { box-shadow: 0 4px 24px ${glow}, 0 0 0 4px ${glow.replace('0.5','0.12')}; }
        50% { box-shadow: 0 4px 28px ${glow}, 0 0 0 8px ${glow.replace('0.5','0.0')}; }
      }
      #${YOU2}-widget-dot {
        position:absolute; top:2px; right:2px; width:14px; height:14px; border-radius:50%;
        background:${color}; border:2.5px solid #0b0e14; box-shadow: 0 0 8px ${color};
      }
      #${YOU2}-widget-panel {
        width:310px;
        background: linear-gradient(145deg,rgba(11,14,20,0.98),rgba(15,18,28,0.97));
        border:1px solid ${color}; border-radius:18px; padding:16px;
        color:#f8fafc; box-shadow:0 16px 48px rgba(0,0,0,0.8);
        display:none; opacity:0;
        transition:opacity 0.25s ease, transform 0.25s ease;
        transform:translateY(8px);
        pointer-events:auto;
      }
      #${YOU2}-widget-panel.open { display:block; opacity:1; transform:translateY(0); }
      .${YOU2}-tag {
        display:inline-block; font-size:11px; font-weight:700; padding:3px 10px;
        border-radius:20px; background:${color}22; color:${color}; border:1px solid ${color}44; margin-bottom:10px;
      }
      #${YOU2}-agent-bar { height:3px; background:${color}; border-radius:2px; margin-bottom:12px; animation:${isDist?`you2-agent-shrink 20s linear forwards`:'none'}; }
      @keyframes you2-agent-shrink { from{width:100%;} to{width:0%;} }
    </style>

    <div id="${YOU2}-widget-panel">
      <div id="${YOU2}-agent-bar"></div>
      <span class="${YOU2}-tag">${label}</span>
      <div style="font-size:13px;line-height:1.5;margin-bottom:6px;opacity:0.9">${adv}</div>
      <div style="font-size:13px;line-height:1.5;margin-bottom:8px;opacity:0.9">${disadv}</div>
      <div style="font-size:11px;opacity:0.6;margin-bottom:${isDist ? '10px' : '0'}"><b>Safe time:</b> ${safeTime}</div>
      ${isDist ? `<div style="font-size:11px;color:#ef4444;background:rgba(239,68,68,0.1);padding:6px 10px;border-radius:8px;font-weight:600;border:1px solid rgba(239,68,68,0.25)">🤖 Agent is actively monitoring — interventions incoming.</div>` : ''}
    </div>

    <button id="${YOU2}-widget-btn" title="You² Digital Twin Agent Status">
      🧠
      <span id="${YOU2}-widget-dot"></span>
    </button>
  `;

  (document.documentElement || document.body).appendChild(host);

  // Toggle panel on click
  const btn   = host.querySelector(`#${YOU2}-widget-btn`);
  const panel = host.querySelector(`#${YOU2}-widget-panel`);
  let open = false;
  btn.addEventListener('click', () => {
    open = !open;
    if (open) {
      panel.style.display = 'block';
      requestAnimationFrame(() => panel.classList.add('open'));
    } else {
      panel.classList.remove('open');
      setTimeout(() => { panel.style.display = 'none'; }, 280);
    }
  });
}

// ─── Widget Guardian — keeps widget alive across SPA navigation ───────────────
function ensureWidget() {
  if (window.self !== window.top) return;
  if (document.getElementById(`${YOU2}-widget-host`)) return; // already present
  const analysis = pageAnalysis || analyzePage();
  if (analysis.category !== 'sensitive') injectPermanentWidget(analysis);
}

// MutationObserver: re-inject if host gets removed by SPA (YouTube, Instagram, etc.)
const _guardObserver = new MutationObserver(() => {
  if (!document.getElementById(`${YOU2}-widget-host`)) ensureWidget();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  if (window.self !== window.top) return;
  const proto = window.location.protocol;
  if (proto === 'chrome-extension:' || proto === 'chrome:' || proto === 'about:') return;

  // Auto-sync userId from web app
  if (window.location.hostname === 'localhost' && window.location.port === '3000') {
    const userId = localStorage.getItem('you2_user_id');
    if (userId) {
      chrome.runtime.sendMessage({ action: 'setUserId', userId }).catch(() => {});
    }
  }

  startActiveTimer();

  // Inject IMMEDIATELY on load with instant analysis
  pageAnalysis = analyzePage();
  if (pageAnalysis.category !== 'sensitive') {
    injectPermanentWidget(pageAnalysis);
  }

  const doAnalysis = () => {
    pageAnalysis = analyzePage();
    if (pageAnalysis.category === 'sensitive') return;

    injectPermanentWidget(pageAnalysis);

    chrome.runtime.sendMessage({
      action: 'pageClassified',
      category: pageAnalysis.category,
      scores: { productive: pageAnalysis.productiveScore, distract: pageAnalysis.distractScore, neutral: pageAnalysis.neutralScore },
      domain: pageAnalysis.domain,
      title: pageAnalysis.title,
    }).catch(() => {});

    scheduleEscalation(pageAnalysis);

    if (pageAnalysis.category === 'productive') {
      setTimeout(() => { if (!document.hidden) showPositiveToast(); }, 5000);
    }
  };

  setTimeout(doAnalysis, SCAN_DELAY);

  // Start guardian observer on <html> so it catches SPA root swaps
  _guardObserver.observe(document.documentElement, { childList: true, subtree: false });

  // YouTube SPA: fires on every in-app navigation
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(() => {
      pageAnalysis = analyzePage();
      injectPermanentWidget(pageAnalysis);
    }, 500);
  });

  // Generic SPA: popstate / hashchange
  window.addEventListener('popstate', () => setTimeout(ensureWidget, 400));
  window.addEventListener('hashchange', () => setTimeout(ensureWidget, 400));
}

// ─── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'showNudge') { showLevel2(getDomain()); sendResponse({ success: true }); return true; }
  if (request.action === 'getPageAnalysis') { sendResponse({ analysis: pageAnalysis, activeSeconds: getActiveSeconds() }); return true; }
  if (request.action === 'ping') { sendResponse({ alive: true }); return true; }
  if (request.action === 'getActiveMission') {
    chrome.storage.local.get(['activeMission'], r => sendResponse({ mission: r.activeMission || null }));
    return true;
  }
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/**
 * You² Background Service Worker — Manifest V3
 * Handles tab tracking, activity batching, and smart routing.
 */

'use strict';

const API_URL = 'http://localhost:5000/api';

// ─── State ────────────────────────────────────────────────────────────────────

let activeTabId     = null;
let sessionStart    = null;
let currentSite     = null;
let currentCategory = 'neutral';
let activityQueue   = [];
let isFlushingQueue = false;

// ─── Tab Lifecycle ────────────────────────────────────────────────────────────

function enqueueCurrentSession() {
  if (!currentSite || !sessionStart) return;
  const duration = Math.floor((Date.now() - sessionStart) / 1000);
  if (duration >= 5) enqueueActivity(currentSite, duration);
  sessionStart = null;
}

async function startSession(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab?.url?.startsWith('http')) { currentSite = null; return; }
    currentSite  = new URL(tab.url).hostname.replace(/^www\./, '');
    sessionStart = Date.now();
  } catch {
    currentSite = null;
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  enqueueCurrentSession();
  activeTabId = activeInfo.tabId;
  await startSession(activeTabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId !== activeTabId || changeInfo.status !== 'complete') return;
  if (!tab?.url?.startsWith('http')) return;
  const newSite = new URL(tab.url).hostname.replace(/^www\./, '');
  if (newSite === currentSite) return;
  enqueueCurrentSession();
  currentSite  = newSite;
  sessionStart = Date.now();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId !== activeTabId) return;
  enqueueCurrentSession();
  activeTabId = null;
  currentSite = null;
  flushQueue();
});

chrome.windows.onRemoved.addListener(() => {
  enqueueCurrentSession();
  flushQueue();
});

// ─── Activity Queue ───────────────────────────────────────────────────────────

const SENSITIVE_KEYWORDS = ['bank', 'pay', 'wallet', 'login', 'auth', 'tax', 'health', 'insurance', 'secure', 'account'];

function enqueueActivity(site, duration) {
  if (SENSITIVE_KEYWORDS.some(k => site.toLowerCase().includes(k))) return;
  activityQueue.push({ site, duration, timestamp: new Date().toISOString() });
  // Persist queue to survive service worker restarts
  chrome.storage.local.set({ activityQueue });
}

async function flushQueue() {
  if (isFlushingQueue) return;

  // Restore queue from storage in case worker was restarted
  if (activityQueue.length === 0) {
    const stored = await new Promise(r => chrome.storage.local.get(['activityQueue'], d => r(d.activityQueue || [])));
    activityQueue = stored;
  }

  if (activityQueue.length === 0) return;
  isFlushingQueue = true;

  const userId = await getUserId();
  if (!userId) { isFlushingQueue = false; return; }

  const batch = [...activityQueue];
  activityQueue = [];
  chrome.storage.local.set({ activityQueue: [] });

  try {
    const res = await fetch(`${API_URL}/activity/batch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, activities: batch }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`You²: flushed ${batch.length} activities`);
  } catch (err) {
    console.warn('You²: flush failed, re-queuing', err.message);
    activityQueue = [...batch, ...activityQueue];
    chrome.storage.local.set({ activityQueue });
  } finally {
    isFlushingQueue = false;
  }
}

// Flush every 15 seconds via setInterval (works in non-module service workers)
setInterval(flushQueue, 15000);

// Also use alarms as a backup (survives service worker sleep)
chrome.alarms.create('you2-flush', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'you2-flush') {
    enqueueCurrentSession();
    flushQueue();
  }
});

// ─── Storage Helpers ──────────────────────────────────────────────────────────

function getUserId() {
  return new Promise(resolve =>
    chrome.storage.local.get(['userId'], r => resolve(r.userId || null))
  );
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageClassified') {
    currentCategory = request.category || 'neutral';
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'setUserId') {
    chrome.storage.local.set({ userId: request.userId }, () => sendResponse({ success: true }));
    return true;
  }
  if (request.action === 'getUserId') {
    getUserId().then(userId => sendResponse({ userId }));
    return true;
  }
  if (request.action === 'getCurrentActivity') {
    sendResponse({
      site:     currentSite,
      category: currentCategory,
      elapsed:  sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0,
    });
    return true;
  }
  if (request.action === 'flushNow') {
    enqueueCurrentSession();
    flushQueue().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (request.action === 'switchContext') {
    handleContextSwitch(request.contextType || 'dsa').then(res => sendResponse(res));
    return true;
  }
  if (request.action === 'stashIdleTabs') {
    handleStashIdleTabs().then(res => sendResponse(res));
    return true;
  }
  if (request.action === 'createSessionSnapshot') {
    handleSessionSnapshot(request.tag || 'Focus Session').then(res => sendResponse(res));
    return true;
  }
  if (request.action === 'closeTab') {
    const tabId = sender?.tab?.id;
    if (tabId) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }
});

// ─── AGENTIC EXTENSION FEATURES ──────────────────────────────────────────────

// Feature 1: One-Click Context Switcher & Auto-Prep
async function handleContextSwitch(contextType) {
  const PRESET_MAP = {
    dsa: {
      title: '🎯 DSA Prep Session',
      urls: ['https://leetcode.com/problemset/', 'https://notion.so'],
      snippet: '// Solution Template\nfunction solve(input) {\n  // 1. Edge cases\n  if (!input) return null;\n  // 2. Main Logic\n}\n'
    },
    webdev: {
      title: '💻 Web Dev Sprint',
      urls: ['http://localhost:3000', 'https://github.com'],
      snippet: 'git checkout -b feature/sprint && npm run dev'
    },
    research: {
      title: '📚 Research & Reading',
      urls: ['https://arxiv.org', 'https://scholar.google.com'],
      snippet: 'Key Takeaways:\n- Core thesis:\n- Methodology:\n- Limitations:'
    }
  };

  const preset = PRESET_MAP[contextType] || PRESET_MAP.dsa;

  // 1. Mute noisy notification tabs (e.g., mail/discord/youtube)
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    if (t.url && (t.url.includes('mail.google') || t.url.includes('discord.com') || t.url.includes('youtube.com'))) {
      try { await chrome.tabs.update(t.id, { muted: true }); } catch {}
    }
  }

  // 2. Open context URLs and Create Tab Group if supported
  const tabIds = [];
  for (const url of preset.urls) {
    const newTab = await chrome.tabs.create({ url, active: false });
    if (newTab.id) tabIds.push(newTab.id);
  }

  if (chrome.tabGroups && tabIds.length > 0) {
    try {
      const groupId = await chrome.tabGroups.group({ tabIds });
      await chrome.tabGroups.update(groupId, { title: preset.title, color: 'purple', collapsed: false });
    } catch (e) {
      console.log('Tab grouping fallback:', e);
    }
  }

  return { success: true, preset: preset.title, snippet: preset.snippet };
}

// Feature 3: Auto-Save & Clean Up Agent (Stash tabs & Session Snapshot)
async function handleStashIdleTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const stashed = [];

  for (const t of tabs) {
    if (!t.active && !t.pinned && t.url?.startsWith('http')) {
      const hostname = new URL(t.url).hostname;
      const isDistraction = SENSITIVE_KEYWORDS.some(k => t.url.includes(k)) === false;
      if (isDistraction) {
        stashed.push({ title: t.title || hostname, url: t.url, timestamp: new Date().toLocaleTimeString() });
        try { await chrome.tabs.remove(t.id); } catch {}
      }
    }
  }

  const existing = await new Promise(r => chrome.storage.local.get(['stashedTabs'], d => r(d.stashedTabs || [])));
  const updated = [...stashed, ...existing];
  await chrome.storage.local.set({ stashedTabs: updated });

  return { success: true, count: stashed.length };
}

async function handleSessionSnapshot(tag) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const snapshot = tabs
    .filter(t => t.url?.startsWith('http'))
    .map(t => ({ title: t.title, url: t.url }));

  const existing = await new Promise(r => chrome.storage.local.get(['sessionSnapshots'], d => r(d.sessionSnapshots || [])));
  const newEntry = { id: Date.now().toString(), tag, date: new Date().toLocaleString(), tabs: snapshot };
  await chrome.storage.local.set({ sessionSnapshots: [newEntry, ...existing] });

  return { success: true, snapshotCount: snapshot.length };
}

console.log('🧠 You² background worker started');

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
  if (request.action === 'closeTab') {
    const tabId = sender?.tab?.id;
    if (tabId) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }
});

console.log('🧠 You² background worker started');

# You² — Autonomous Digital Twin Agent 🧠⚡

> **Stop guessing. Start operating with your second self.**

You² is an **AI-powered Autonomous Digital Twin Agent** that learns how you think, work, focus, prioritize, procrastinate, and make decisions — then actively helps you execute goals in real time.

Built as an advanced, autonomous AI agent that deeply understands your behavioral patterns to maximize productivity.

---

## 🌍 The Vision

Most productivity tools require manual input. You² is different. 
By running silently as a browser extension, it observes your daily digital habits, builds a sophisticated "Digital Twin" profile using LLMs, and intervenes *autonomously* when you stray from your goals.

It doesn't just track time; it understands context, intent, and your personal psychology to deliver the right nudge at the right moment.

---

## ✨ Key Features & Comprehensive Updates

- **🧠 Deep Behavioral Profiling**: Learns your work style, procrastination triggers, strengths, and weaknesses through initial onboarding and continuous observation.
- **🙋 Personalized Twin Experience**: Extension & Web App greeting *"Hey, Atul 👋"* with live Archetype status (*"Neural Strategist • Deep Focus Mode"*).
- **📱 Expanded & Informative Popup**: Roomy 460px × 600px popup UI displaying live Focus Scores, domain impact explanations, and agentic quick controls.
- **👁️ Real-Time Distraction Detection**: Categorizes sites locally and calculates real-time productivity percentages.
- **⚡ 15-Second Intent Check Intervention**: Halts distraction visits with a 15-second countdown prompt requiring justification or auto-closing the tab.
- **🎯 One-Click Context Switcher (WebCMD)**: Instantly opens LeetCode + Notion in a styled Chrome Tab Group, mutes noisy tabs (Gmail, Discord, YouTube), and pre-loads solution templates into the clipboard.
- **🧹 Auto-Save & Tab Stash Agent**: Archives idle, unpinned tabs into local memory with AI summaries and captures session snapshots under tagged sprints.
- **⚡ Compound AI & Multi-Key Fallback**: Fallback rotation across 4 Groq API keys and multi-model priority list (`groq/compound-mini`, `groq/compound`, `qwen/qwen3.6-27b`) so AI tasks never crash or stall.
- **📊 Activity Intelligence & Fixed Layouts**: Full analytics page (`/insights`) with daily breakdown bar charts, focus time split pie charts, top-visited domain stats, and overlapping-free layout structure.
- **🎨 Modern Dark Aesthetic**: Custom liquid-glass interface, vibrant neon accents, and a enlarged bold neural-network custom cursor.

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center"><b>🏠 Landing Page</b></td>
    <td align="center"><b>📊 Live Dashboard</b></td>
  </tr>
  <tr>
    <td><img src="public/ss1.png" alt="Landing Page" width="480"/></td>
    <td><img src="public/ss2.png" alt="Dashboard" width="480"/></td>
  </tr>
  <tr>
    <td align="center"><b>📈 Activity Intelligence</b></td>
    <td align="center"><b>🧬 Create Your Twin</b></td>
  </tr>
  <tr>
    <td><img src="public/ss3.png" alt="Activity Intelligence" width="480"/></td>
    <td><img src="public/ss4.png" alt="Create Twin" width="480"/></td>
  </tr>
</table>

---

# 🤖 WebCMD & Compound AI Agentic Integration

You² has **properly integrated WebCMD and Compound AI Agentic workflows** into the core ecosystem:

- **WebCMD Protocol**: Built directly into the extension background worker (`background.js`) to execute system & browser commands (tab grouping, context switching, mute noise tabs, and tab stashing).
- **Compound AI System**: Fully working with fallback key-rotation (`generateWithFallback` in `server/src/config/groq.ts`) using multi-model prioritization (`groq/compound-mini`, `groq/compound`, `qwen/qwen3.6-27b`) so AI reasoning never stalls or crashes due to rate limits.
- **Real-time Status Monitor**: Live tracking active across Web App & Extension with real-time status indication (`Active monitoring` / `Connected`).

---

# 🧬 Core Intelligence Modules

# 1️⃣ Digital Twin Engine
The heart of You². Creates a behavioral model of the user and continuously improves it.

### Learns:
- How you think & perform best
- What triggers procrastination
- How long tasks realistically take
- Where time gets wasted

---

# 2️⃣ AI Twin Chat
Talk to your second self. Ask real questions and receive strategic responses based on your behavior.

### Features:
- Personalized responses using your goals, habits, and performance data
- Schedule generation and task re-prioritization
- Honest motivation tailored to your psychology

---

# 3️⃣ Smart Focus Agent
A proactive AI that protects your attention.

| Time / Trigger | AI Agent Action |
|----------------|-----------------|
| Distracting Visit | 15s Intent Check prompt |
| 15 minutes | Gentle reminder nudge |
| 30 minutes | Strong alert with LeetCode/Dashboard quick buttons |
| 45 minutes | Countdown popup |
| 60 minutes | Auto-close / redirect to LeetCode |

---

# 4️⃣ Task Execution Engine
Generates customized action plans, prioritizes missions, starts timers, and tracks completion rates.

---

# 5️⃣ Chrome Extension Companion (Manifest V3)
Real-time execution layer running silently inside the browser:
- **Smart Site Classification**: Productive, Distracting, Neutral, and Sensitive/Private tabs.
- **Privacy First**: Banking, auth, and healthcare sites automatically pause tracking.
- **Quick Agent Actions**: One-click DSA mode, Tab Stash, and Session Snapshots.

---

# 🛠️ Tech Stack

| Layer | Stack |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Vanilla CSS, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| AI Engine | Groq SDK (Compound AI + Multi-Key Fallback) |
| Browser Agent | Chrome Extension Manifest V3 (WebCMD) |
| Visualization | Recharts |

---

# 🚀 Future Roadmap

- AI twin negotiates meetings automatically  
- Twin manages email workflows  
- Twin predicts burnout early  
- Twin builds custom study schedules  
- Twin becomes cross-device memory system  

---

# 🏆 Built For

**MLH Bot-to-Agent Hackathon 2026**

---

# 📄 License

MIT License

---

# ✨ Final Statement

> You² is not another chatbot.  
> It is the beginning of personal autonomous intelligence.

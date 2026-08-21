import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Add response interceptor to surface errors cleanly
api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || err.message || 'Network error';
    console.error(`[You²API] ${err.config?.url} → ${message}`);
    return Promise.reject(err);
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateUserData {
  name: string;
  goals: string[];
  habits: string[];
  preferences?: {
    workStyle?: string;
    productivityPeaks?: string[];
    distractions?: string[];
  };
}

export interface User {
  id: string;
  name: string;
  goals: string[];
  habits: string[];
  preferences?: {
    workStyle?: string;
    productivityPeaks?: string[];
    distractions?: string[];
  };
  personality?: {
    traits: string[];
    strengths: string[];
    weaknesses: string[];
  };
  behaviorPatterns?: { pattern: string; frequency: number; lastOccurrence: string }[];
  productivityScore: number;
  historyCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  timestamp: string;
  type: string;
  input: string;
  output: string;
  mode?: string;
}

export interface Task {
  _id: string;
  userId: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'dsa' | 'development' | 'learning' | 'career' | 'revision' | 'other';
  timeEstimate: string;
  estimatedMinutes: number;
  launchUrl: string;
  completed: boolean;
  completedAt?: string;
  startedAt?: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  order: number;
  progressPercent: number;
  createdAt: string;
}

export interface SimulationResult {
  scenario: string;
  rawResponse: string;
  parsed: {
    // New structured format
    best_case?: string;
    likely_case?: string;
    worst_case?: string;
    confidence_score?: number;
    reasoning?: string;
    // Legacy fallback format
    bestCase?: string;
    likelyCase?: string;
    worstCase?: string;
    advice?: string;
  } | null;
  timestamp: string;
}

export interface ActivityStats {
  totalTime: number;
  productiveTime: number;
  distractingTime: number;
  productivityRatio: number;
  topSites: { site: string; duration: number; minutes: number }[];
  dailyBreakdown: Record<string, { productive: number; distracting: number }>;
  totalActivities: number;
}

export interface Insights {
  productivityScore: number;
  behaviorPatterns: { pattern: string; frequency: number; lastOccurrence: string }[];
  totalInteractions: number;
  chatCount: number;
  simulationCount: number;
  actionCount: number;
  activityStats: {
    totalMinutes: number;
    productiveMinutes: number;
    productivityRatio: number;
  };
}

export interface DailyForecast {
  greeting: string;
  headline: string;
  energyForecast: 'high' | 'medium' | 'low';
  focusWindows: string[];
  riskAlert: string;
  topPriority: string;
  motivationalPulse: string;
  predictedScore: number;
}

export interface TwinEvolution {
  accuracyScore: number;
  habitsLearned: number;
  predictionConfidence: number;
  evolutionLevel: 'Developing' | 'Aware' | 'Calibrated' | 'Advanced' | 'Expert';
  levelProgress: number;
  nextMilestone: string;
  strongestInsight: string;
  weeklyGrowth: number;
}

export interface TwinEvolutionMeta {
  daysSinceCreation: number;
  totalInteractions: number;
  patternCount: number;
  completedTasks: number;
  productivityScore: number;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const userAPI = {
  createUser: (data: CreateUserData) => api.post('/create-user', data).then(r => r.data),
  getUser: (userId: string) => api.get(`/get-user/${userId}`).then(r => r.data),
  getAllUsers: () => api.get('/users').then(r => r.data),
  updateUser: (userId: string, data: Partial<CreateUserData>) =>
    api.put(`/update-user/${userId}`, data).then(r => r.data),
};

export const chatAPI = {
  send: (userId: string, message: string, mode: 'reflection' | 'simulation' | 'action') =>
    api.post('/chat', { userId, message, mode }).then(r => r.data),
  getHistory: (userId: string, mode?: string) =>
    api.get(`/chat/history/${userId}`, { params: mode ? { mode } : {} }).then(r => r.data),
};

export const simulationAPI = {
  run: (userId: string, scenario: string) =>
    api.post('/simulate', { userId, scenario }).then(r => r.data),
  getHistory: (userId: string) =>
    api.get(`/simulate/history/${userId}`).then(r => r.data),
};

export const taskAPI = {
  generate: (userId: string, request: string) =>
    api.post('/generate-tasks', { userId, request }).then(r => r.data),
  addBulk: (userId: string, tasks: string[]) =>
    api.post('/tasks/bulk', { userId, tasks }).then(r => r.data),
  getAll: (userId: string) =>
    api.get(`/tasks/${userId}`).then(r => r.data),
  getActive: (userId: string) =>
    api.get(`/tasks/active/${userId}`).then(r => r.data),
  update: (taskId: string, updates: Partial<Task>) =>
    api.put(`/tasks/${taskId}`, updates).then(r => r.data),
  delete: (taskId: string) =>
    api.delete(`/tasks/${taskId}`).then(r => r.data),
  reorder: (userId: string, orderedIds: string[]) =>
    api.put('/tasks/reorder', { userId, orderedIds }).then(r => r.data),
  replan: (userId: string) =>
    api.post(`/tasks/replan/${userId}`).then(r => r.data),
};

export const activityAPI = {
  log: (userId: string, site: string, duration: number) =>
    api.post('/activity', { userId, site, duration }).then(r => r.data),
  logBatch: (userId: string, activities: { site: string; duration: number; timestamp: string }[]) =>
    api.post('/activity/batch', { userId, activities }).then(r => r.data),
  getRecent: (userId: string, limit = 5) =>
    api.get(`/activity/recent/${userId}`, { params: { limit } }).then(r => r.data),
  getStats: (userId: string, days?: number) =>
    api.get(`/activity/stats/${userId}`, { params: days ? { days } : {} }).then(r => r.data),
  getInsights: (userId: string) =>
    api.get(`/insights/${userId}`).then(r => r.data),
};

export const forecastAPI = {
  getDaily: (userId: string) =>
    api.get(`/forecast/${userId}`).then(r => r.data),
  getEvolution: (userId: string) =>
    api.get(`/evolution/${userId}`).then(r => r.data),
};

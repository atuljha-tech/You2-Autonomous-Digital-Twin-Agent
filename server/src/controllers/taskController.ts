import { Request, Response } from 'express';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { generateWithFallback, generateJSON } from '../config/groq';
import { buildTaskPrompt, buildMissionPrompt, buildReplanPrompt } from '../config/promptBuilder';

// ─── URL Resolution Engine ────────────────────────────────────────────────────

const URL_MAP: Record<string, string> = {
  // DSA / Competitive
  leetcode:       'https://leetcode.com/problemset/',
  'leetcode array': 'https://leetcode.com/tag/array/',
  'leetcode dp':  'https://leetcode.com/tag/dynamic-programming/',
  'leetcode tree': 'https://leetcode.com/tag/tree/',
  hackerrank:     'https://www.hackerrank.com/interview/interview-preparation-kit',
  codeforces:     'https://codeforces.com/problemset',
  codechef:       'https://www.codechef.com/practice',
  striver:        'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/',
  'striver sheet': 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/',
  'a2z dsa':      'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/',
  'binary search': 'https://takeuforward.org/data-structure/binary-search-notes/',
  'dsa arrays':   'https://takeuforward.org/data-structure/array-data-structure/',
  neetcode:       'https://neetcode.io/roadmap',

  // Learning Platforms
  youtube:        'https://www.youtube.com',
  'youtube dsa':  'https://www.youtube.com/results?search_query=DSA+playlist',
  'youtube arrays': 'https://www.youtube.com/results?search_query=arrays+data+structure+tutorial',
  coursera:       'https://www.coursera.org',
  udemy:          'https://www.udemy.com',
  edx:            'https://www.edx.org',
  'khan academy': 'https://www.khanacademy.org',
  freecodecamp:   'https://www.freecodecamp.org/learn',
  'the odin project': 'https://www.theodinproject.com',

  // Development
  github:         'https://github.com',
  'github profile': 'https://github.com',
  'github repo':  'https://github.com',
  vercel:         'https://vercel.com/dashboard',
  netlify:        'https://app.netlify.com',
  replit:         'https://replit.com',
  codesandbox:    'https://codesandbox.io',
  codepen:        'https://codepen.io',

  // Career
  linkedin:       'https://www.linkedin.com/jobs/',
  'linkedin jobs': 'https://www.linkedin.com/jobs/',
  'linkedin profile': 'https://www.linkedin.com/in/',
  internshala:    'https://internshala.com',
  naukri:         'https://www.naukri.com',
  glassdoor:      'https://www.glassdoor.com/Job/index.htm',
  'angel list':   'https://wellfound.com/jobs',
  wellfound:      'https://wellfound.com/jobs',

  // Docs / Study
  notion:         'https://www.notion.so',
  'system design': 'https://github.com/donnemartin/system-design-primer',
  'system design primer': 'https://github.com/donnemartin/system-design-primer',
  dbms:           'https://www.geeksforgeeks.org/dbms/',
  'os concepts':  'https://www.geeksforgeeks.org/operating-systems/',
  'cn concepts':  'https://www.geeksforgeeks.org/computer-network-tutorials/',
  geeksforgeeks:  'https://www.geeksforgeeks.org',
  'gfg':          'https://www.geeksforgeeks.org',
  stackoverflow:  'https://stackoverflow.com',
  mdn:            'https://developer.mozilla.org',

  // Aptitude / Mock
  aptitude:       'https://www.indiabix.com',
  'mock interview': 'https://www.pramp.com',
  pramp:          'https://www.pramp.com',
  'interview bit': 'https://www.interviewbit.com',
  interviewbit:   'https://www.interviewbit.com',
};

function resolveUrl(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  // Check multi-word keys first (longer = more specific)
  const sortedKeys = Object.keys(URL_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (text.includes(key)) return URL_MAP[key];
  }

  // Broad keyword heuristics — order matters (most specific first)
  if (text.match(/youtube|yt\s|watch.*video|video.*playlist/)) {
    // Detect topic for smarter YouTube search
    if (text.match(/dsa|data structure|algorithm|array|tree|graph|dp|dynamic/)) {
      return 'https://www.youtube.com/results?search_query=DSA+data+structures+algorithms+tutorial';
    }
    if (text.match(/leetcode|problem/)) {
      return 'https://www.youtube.com/results?search_query=LeetCode+problem+patterns+tutorial';
    }
    if (text.match(/system design/)) {
      return 'https://www.youtube.com/results?search_query=system+design+interview+tutorial';
    }
    return 'https://www.youtube.com';
  }
  if (text.match(/dsa|data structure|algorithm/)) {
    return 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/';
  }
  if (text.match(/portfolio|project.*build|build.*project/)) return 'https://github.com';
  if (text.match(/apply|intern|job search/)) return 'https://www.linkedin.com/jobs/';
  if (text.match(/linkedin/)) return 'https://www.linkedin.com';
  if (text.match(/read|article|blog/)) return 'https://dev.to';
  if (text.match(/revise|notes|study/)) return 'https://www.notion.so';
  if (text.match(/mock|interview/)) return 'https://www.pramp.com';
  if (text.match(/aptitude/)) return 'https://www.indiabix.com';

  return 'http://localhost:3000/dashboard';
}

function resolveCategory(title: string, description: string): 'dsa' | 'development' | 'learning' | 'career' | 'revision' | 'other' {
  const text = `${title} ${description}`.toLowerCase();
  if (text.match(/dsa|leetcode|hackerrank|algorithm|data structure|array|tree|graph|dp|binary/)) return 'dsa';
  if (text.match(/build|code|project|github|deploy|develop|react|node|api/)) return 'development';
  if (text.match(/course|learn|watch|read|tutorial|udemy|coursera|youtube/)) return 'learning';
  if (text.match(/apply|linkedin|resume|intern|job|career|portfolio|interview/)) return 'career';
  if (text.match(/revise|revision|notes|dbms|os|cn|aptitude|mock/)) return 'revision';
  return 'other';
}

// ─── Generate Tasks (AI-powered) ──────────────────────────────────────────────

export const generateTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, request } = req.body;
    if (!userId || !request) {
      res.status(400).json({ error: 'userId and request are required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const prompt = buildTaskPrompt(user, request);
    const rawResponse = await generateWithFallback(prompt);
    const tasks = parseTasksFromResponse(rawResponse, userId);

    if (tasks.length > 0) {
      // Get current max order
      const maxOrderTask = await Task.findOne({ userId }).sort({ order: -1 });
      const startOrder = (maxOrderTask?.order ?? -1) + 1;
      const tasksWithOrder = tasks.map((t: Record<string, any>, i: number) => ({ ...t, order: startOrder + i }));
      await Task.insertMany(tasksWithOrder);
    }

    user.history.push({ timestamp: new Date(), type: 'action', input: request, output: rawResponse, mode: 'action' });
    user.productivityScore = Math.min(100, user.productivityScore + 3);
    const ep = user.behaviorPatterns.find((p: any) => p.pattern === 'Actively plans and organizes');
    if (ep) { ep.frequency += 1; ep.lastOccurrence = new Date(); }
    else user.behaviorPatterns.push({ pattern: 'Actively plans and organizes', frequency: 1, lastOccurrence: new Date() });
    await user.save();

    res.status(200).json({ success: true, rawResponse, tasks, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({ error: 'Failed to generate tasks', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ─── Add Tasks Manually ───────────────────────────────────────────────────────

export const addTasksBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, tasks: rawTasks } = req.body;
    if (!userId || !Array.isArray(rawTasks) || rawTasks.length === 0) {
      res.status(400).json({ error: 'userId and tasks array required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    // AI-prioritize the tasks
    const prompt = buildMissionPrompt(user, rawTasks.map((t: any) => t.title || t));
    const raw = await generateJSON(prompt);

    let prioritized: any[] = [];
    try {
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      prioritized = JSON.parse(cleaned);
    } catch {
      // Fallback: use raw tasks as-is
      prioritized = rawTasks.map((t: any, i: number) => ({
        title: typeof t === 'string' ? t : t.title,
        priority: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
        estimatedMinutes: 45,
        category: 'other',
        description: '',
      }));
    }

    // Clear existing pending tasks for this user
    await Task.deleteMany({ userId, status: 'pending' });

    const toInsert = prioritized.map((t: any, i: number) => ({
      userId,
      title: t.title,
      description: t.description || '',
      priority: t.priority || 'medium',
      category: resolveCategory(t.title, t.description || ''),
      timeEstimate: t.estimatedMinutes ? `${t.estimatedMinutes} mins` : '30 mins',
      estimatedMinutes: t.estimatedMinutes || 30,
      launchUrl: resolveUrl(t.title, t.description || ''),
      completed: false,
      status: 'pending',
      order: i,
      progressPercent: 0,
    }));

    const inserted = await Task.insertMany(toInsert);

    res.status(201).json({ success: true, tasks: inserted, count: inserted.length });
  } catch (error) {
    console.error('Bulk add error:', error);
    res.status(500).json({ error: 'Failed to add tasks' });
  }
};

// ─── Get Tasks ────────────────────────────────────────────────────────────────

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const tasks = await Task.find({ userId }).sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, tasks, total: tasks.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// ─── Update Task ──────────────────────────────────────────────────────────────

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    // Handle status transitions — be explicit, never auto-complete on 'active'
    if (updates.status === 'active') {
      if (!updates.startedAt) updates.startedAt = new Date();
      // Ensure completed flags are NOT set when activating
      updates.completed = false;
      delete updates.completedAt;
    }
    if (updates.status === 'completed') {
      updates.completed = true;
      updates.completedAt = new Date();
      updates.progressPercent = 100;
    }
    // Legacy: if only completed:true is sent (from old tasks page)
    if (updates.completed === true && updates.status !== 'active') {
      updates.status = 'completed';
      updates.completedAt = updates.completedAt || new Date();
      updates.progressPercent = 100;
    }

    const task = await Task.findByIdAndUpdate(taskId, { $set: updates }, { new: true });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    // Boost score on completion
    if (updates.status === 'completed' || updates.completed === true) {
      const user = await User.findById(task.userId);
      if (user) {
        user.productivityScore = Math.min(100, user.productivityScore + 5);
        const ep = user.behaviorPatterns.find((p: any) => p.pattern === 'Completes planned tasks');
        if (ep) { ep.frequency += 1; ep.lastOccurrence = new Date(); }
        else user.behaviorPatterns.push({ pattern: 'Completes planned tasks', frequency: 1, lastOccurrence: new Date() });
        await user.save();
      }
    }

    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// ─── Delete Task ──────────────────────────────────────────────────────────────

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// ─── Reorder Tasks ────────────────────────────────────────────────────────────

export const reorderTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, orderedIds } = req.body;
    if (!userId || !Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'userId and orderedIds required' });
      return;
    }
    await Promise.all(orderedIds.map((id: string, i: number) =>
      Task.findByIdAndUpdate(id, { order: i })
    ));
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
};

// ─── AI Replan ────────────────────────────────────────────────────────────────

export const replanDay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const pendingTasks = await Task.find({ userId, status: { $in: ['pending', 'skipped'] } }).sort({ order: 1 });
    if (pendingTasks.length === 0) {
      res.status(200).json({ success: true, message: 'No pending tasks to replan', tasks: [] });
      return;
    }

    const prompt = buildReplanPrompt(user, pendingTasks.map(t => ({ title: t.title, priority: t.priority, estimatedMinutes: t.estimatedMinutes })));
    const raw = await generateJSON(prompt);

    let replanned: any[] = [];
    try {
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      replanned = JSON.parse(cleaned);
    } catch {
      replanned = pendingTasks.map((t, i) => ({ id: t._id.toString(), order: i, priority: t.priority }));
    }

    // Apply new ordering
    await Promise.all(replanned.map((r: any, i: number) => {
      const task = pendingTasks.find(t => t._id.toString() === r.id || t.title === r.title);
      if (task) return Task.findByIdAndUpdate(task._id, { order: i, priority: r.priority || task.priority });
    }));

    const updated = await Task.find({ userId, status: { $in: ['pending', 'skipped'] } }).sort({ order: 1 });
    res.status(200).json({ success: true, tasks: updated, message: replanned[0]?.message || 'Day replanned by your twin.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to replan' });
  }
};

// ─── Get Active Mission ───────────────────────────────────────────────────────

export const getActiveMission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const active = await Task.findOne({ userId, status: 'active' });
    const next = await Task.findOne({ userId, status: 'pending' }).sort({ order: 1 });
    res.status(200).json({ success: true, active, next });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active mission' });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTasksFromResponse(text: string, userId: string) {
  try {
    const jsonMatch = text.match(/TASKS_JSON:\s*(\[[\s\S]*?\])/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.map((t: any, i: number) => ({
      userId,
      title: t.title || 'Untitled Task',
      description: t.description || '',
      priority: t.priority || 'medium',
      category: resolveCategory(t.title, t.description || ''),
      timeEstimate: t.timeEstimate || '30 mins',
      estimatedMinutes: parseInt(t.timeEstimate) || 30,
      launchUrl: resolveUrl(t.title, t.description || ''),
      completed: false,
      status: 'pending',
      order: i,
      progressPercent: 0,
    }));
  } catch { return []; }
}

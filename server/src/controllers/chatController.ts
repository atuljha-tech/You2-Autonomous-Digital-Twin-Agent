import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateWithFallback } from '../config/groq';
import { buildChatPrompt, ChatMode } from '../config/promptBuilder';

export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, message, mode } = req.body;

    if (!userId || !message || !mode) {
      res.status(400).json({ error: 'userId, message, and mode are required' });
      return;
    }

    const validModes: ChatMode[] = ['reflection', 'simulation', 'action'];
    if (!validModes.includes(mode)) {
      res.status(400).json({ error: 'mode must be reflection, simulation, or action' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Build recent history for context
    const recentHistory = user.history
      .filter(h => h.type === 'chat')
      .slice(-10)
      .map(h => ({ input: h.input, output: h.output }));

    // Build prompt
    const prompt = buildChatPrompt(user, message, mode as ChatMode, recentHistory);

    // Call Gemini with fallback
    const response = await generateWithFallback(prompt);

    // Store interaction in history (Phase 4 - behavior tracking)
    user.history.push({
      timestamp: new Date(),
      type: 'chat',
      input: message,
      output: response,
      mode: mode as ChatMode,
    });

    // Update behavior patterns based on mode usage
    await updateBehaviorPatterns(user, message, mode);

    await user.save();

    res.status(200).json({
      success: true,
      response,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to get response from twin',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { limit = 20, mode } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let history = user.history.filter(h => h.type === 'chat');

    if (mode) {
      history = history.filter(h => h.mode === mode);
    }

    // Return most recent first
    const recentHistory = history
      .slice(-Number(limit))
      .reverse();

    res.status(200).json({
      success: true,
      history: recentHistory,
      total: history.length,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

// Phase 4 - Behavior pattern detection
async function updateBehaviorPatterns(user: any, message: string, mode: string) {
  const lowerMsg = message.toLowerCase();

  // Detect procrastination signals
  if (lowerMsg.includes('procrastinat') || lowerMsg.includes('lazy') || lowerMsg.includes('distract')) {
    addOrUpdatePattern(user, 'Shows signs of procrastination');
  }

  // Detect motivation seeking
  if (lowerMsg.includes('motivat') || lowerMsg.includes('help me') || lowerMsg.includes('stuck')) {
    addOrUpdatePattern(user, 'Seeks external motivation');
  }

  // Detect planning behavior
  if (mode === 'action' || lowerMsg.includes('plan') || lowerMsg.includes('schedule')) {
    addOrUpdatePattern(user, 'Actively plans and organizes');
  }

  // Detect self-reflection
  if (mode === 'reflection' || lowerMsg.includes('why') || lowerMsg.includes('understand')) {
    addOrUpdatePattern(user, 'Engages in self-reflection');
  }

  // Detect future thinking
  if (mode === 'simulation' || lowerMsg.includes('what if') || lowerMsg.includes('future')) {
    addOrUpdatePattern(user, 'Thinks about future consequences');
  }

  // Update productivity score based on engagement
  if (mode === 'action') {
    user.productivityScore = Math.min(100, user.productivityScore + 2);
  }
}

function addOrUpdatePattern(user: any, pattern: string) {
  const existing = user.behaviorPatterns.find((p: any) => p.pattern === pattern);
  if (existing) {
    existing.frequency += 1;
    existing.lastOccurrence = new Date();
  } else {
    user.behaviorPatterns.push({
      pattern,
      frequency: 1,
      lastOccurrence: new Date(),
    });
  }
}

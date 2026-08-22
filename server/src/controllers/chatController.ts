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

    // Fresh read for prompt building only
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

    // Call Groq with key rotation & fallback
    const response = await generateWithFallback(prompt);

    // ─── Atomic update — avoids VersionError from concurrent saves ───────────
    // Compute pattern updates without touching the stale `user` doc
    const patternUpdates = computePatternUpdates(message, mode);

    const historyEntry = {
      timestamp: new Date(),
      type: 'chat' as const,
      input: message,
      output: response,
      mode: mode as ChatMode,
    };

    // Build the update object
    const update: any = {
      $push: { history: historyEntry },
    };

    // Apply productivity score bump atomically
    if (mode === 'action') {
      update.$inc = { productivityScore: 2 };
    }

    // First do the history + score push
    await User.findByIdAndUpdate(userId, update, { new: false });

    // Handle behaviorPatterns atomically (upsert each pattern individually)
    for (const pattern of patternUpdates) {
      // Try to increment existing pattern
      const patched = await User.findOneAndUpdate(
        { _id: userId, 'behaviorPatterns.pattern': pattern },
        {
          $inc: { 'behaviorPatterns.$.frequency': 1 },
          $set: { 'behaviorPatterns.$.lastOccurrence': new Date() },
        }
      );

      if (!patched) {
        // Pattern doesn't exist yet — push it
        await User.findByIdAndUpdate(userId, {
          $push: {
            behaviorPatterns: {
              pattern,
              frequency: 1,
              lastOccurrence: new Date(),
            },
          },
        });
      }
    }

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the list of behavior pattern strings that should be incremented/added */
function computePatternUpdates(message: string, mode: string): string[] {
  const lowerMsg = message.toLowerCase();
  const patterns: string[] = [];

  if (lowerMsg.includes('procrastinat') || lowerMsg.includes('lazy') || lowerMsg.includes('distract')) {
    patterns.push('Shows signs of procrastination');
  }
  if (lowerMsg.includes('motivat') || lowerMsg.includes('help me') || lowerMsg.includes('stuck')) {
    patterns.push('Seeks external motivation');
  }
  if (mode === 'action' || lowerMsg.includes('plan') || lowerMsg.includes('schedule')) {
    patterns.push('Actively plans and organizes');
  }
  if (mode === 'reflection' || lowerMsg.includes('why') || lowerMsg.includes('understand')) {
    patterns.push('Engages in self-reflection');
  }
  if (mode === 'simulation' || lowerMsg.includes('what if') || lowerMsg.includes('future')) {
    patterns.push('Thinks about future consequences');
  }

  return patterns;
}

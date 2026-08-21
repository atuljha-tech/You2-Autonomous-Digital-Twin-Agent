import { Request, Response } from 'express';
import { User } from '../models/User';
import { Activity } from '../models/Activity';
import { Task } from '../models/Task';
import { generateJSON } from '../config/groq';
import {
  buildDailyForecastPrompt,
  buildEvolutionAnalysisPrompt,
} from '../config/promptBuilder';

// ─── Daily Forecast ───────────────────────────────────────────────────────────

export const getDailyForecast = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get last 24h activity for context
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = await Activity.find({
      userId,
      timestamp: { $gte: since },
    }).sort({ timestamp: -1 }).limit(20);

    // Build activity summary string
    const activitySummary = recentActivities.length > 0
      ? recentActivities
          .map(a => `${a.site} — ${Math.floor(a.duration / 60)}min (${a.productive ? 'productive' : 'distracting'})`)
          .join(', ')
      : '';

    const currentHour = new Date().getHours();
    const prompt = buildDailyForecastPrompt(user, activitySummary, currentHour);

    const raw = await generateJSON(prompt);

    let forecast: any;
    try {
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      forecast = JSON.parse(cleaned);
    } catch {
      // Graceful fallback
      forecast = {
        greeting: `Good ${currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening'}, ${user.name}!`,
        headline: 'Stay focused on your primary goal today.',
        energyForecast: 'medium',
        focusWindows: user.preferences?.productivityPeaks?.slice(0, 2) || ['9-11 AM', '2-4 PM'],
        riskAlert: `Watch out for ${user.preferences?.distractions?.[0] || 'distractions'} today.`,
        topPriority: user.goals[0] || 'Work on your primary goal',
        motivationalPulse: 'Every focused hour compounds. Make today count.',
        predictedScore: user.productivityScore,
      };
    }

    res.status(200).json({ success: true, forecast });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
};

// ─── Twin Evolution Score ─────────────────────────────────────────────────────

export const getTwinEvolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const completedTasks = await Task.countDocuments({ userId, completed: true });

    const createdAt = (user as any).createdAt as Date;
    const daysSinceCreation = createdAt
      ? Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    const totalInteractions = user.history.length;
    const patternCount = user.behaviorPatterns?.length || 0;

    const prompt = buildEvolutionAnalysisPrompt(
      user,
      totalInteractions,
      patternCount,
      completedTasks,
      daysSinceCreation
    );

    const raw = await generateJSON(prompt);

    let evolution: any;
    try {
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      evolution = JSON.parse(cleaned);
    } catch {
      // Deterministic fallback based on real data
      const baseAccuracy = Math.min(95, 40 + patternCount * 5 + Math.floor(totalInteractions / 3));
      const confidence = Math.min(95, 30 + patternCount * 4 + completedTasks * 3);
      evolution = {
        accuracyScore: baseAccuracy,
        habitsLearned: patternCount,
        predictionConfidence: confidence,
        evolutionLevel: totalInteractions < 5 ? 'Developing' : totalInteractions < 20 ? 'Aware' : totalInteractions < 50 ? 'Calibrated' : 'Advanced',
        levelProgress: Math.min(99, (totalInteractions % 20) * 5),
        nextMilestone: 'Have 5 more conversations to improve accuracy',
        strongestInsight: patternCount > 0 ? user.behaviorPatterns[0].pattern : 'Still learning your patterns',
        weeklyGrowth: Math.min(10, Math.floor(totalInteractions / 7)),
      };
    }

    res.status(200).json({
      success: true,
      evolution,
      meta: {
        daysSinceCreation,
        totalInteractions,
        patternCount,
        completedTasks,
        productivityScore: user.productivityScore,
      },
    });
  } catch (error) {
    console.error('Evolution error:', error);
    res.status(500).json({ error: 'Failed to compute twin evolution' });
  }
};

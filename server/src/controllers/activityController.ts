import { Request, Response } from 'express';
import { User } from '../models/User';
import { Activity } from '../models/Activity';
import { generateWithFallback } from '../config/groq';
import { buildActivityAnalysisPrompt } from '../config/promptBuilder';

export const getRecentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const activities = await Activity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

const DISTRACTING_SITES = [
  'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
  'reddit.com', 'tiktok.com', 'netflix.com', 'twitch.tv',
  'snapchat.com', 'pinterest.com'
];

const PRODUCTIVE_SITES = [
  'leetcode.com', 'github.com', 'stackoverflow.com', 'docs.google.com',
  'notion.so', 'coursera.org', 'udemy.com', 'medium.com',
  'dev.to', 'hackerrank.com', 'codeforces.com'
];

export const logActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, site, duration, timestamp } = req.body;

    if (!userId || !site || duration === undefined) {
      res.status(400).json({ error: 'userId, site, and duration are required' });
      return;
    }

    // Verify user exists (lean read — don't hold a stale doc)
    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isDistracting = DISTRACTING_SITES.some(d => site.includes(d));
    const isProductive = PRODUCTIVE_SITES.some(p => site.includes(p));
    const productive = isProductive || !isDistracting;

    // Save the activity document (separate collection — no conflict)
    const activity = new Activity({
      userId, site, duration,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      productive,
    });
    await activity.save();

    // ── Atomic push history entry ────────────────────────────────────────────
    await User.findByIdAndUpdate(userId, {
      $push: {
        history: {
          timestamp: new Date(),
          type: 'activity',
          input: `Visited ${site} for ${duration} seconds`,
          output: productive ? 'Productive activity' : 'Distracting activity',
        },
      },
    });

    // ── Atomic score & pattern updates ───────────────────────────────────────
    if (isDistracting && duration > 300) {
      await User.findByIdAndUpdate(userId, { $inc: { productivityScore: -2 } });
      const patched = await User.findOneAndUpdate(
        { _id: userId, 'behaviorPatterns.pattern': 'Gets distracted by entertainment sites' },
        { $inc: { 'behaviorPatterns.$.frequency': 1 }, $set: { 'behaviorPatterns.$.lastOccurrence': new Date() } }
      );
      if (!patched) {
        await User.findByIdAndUpdate(userId, {
          $push: { behaviorPatterns: { pattern: 'Gets distracted by entertainment sites', frequency: 1, lastOccurrence: new Date() } },
        });
      }
    }

    if (isProductive && duration > 300) {
      await User.findByIdAndUpdate(userId, { $inc: { productivityScore: 1 } });
      const patched = await User.findOneAndUpdate(
        { _id: userId, 'behaviorPatterns.pattern': 'Spends time on productive platforms' },
        { $inc: { 'behaviorPatterns.$.frequency': 1 }, $set: { 'behaviorPatterns.$.lastOccurrence': new Date() } }
      );
      if (!patched) {
        await User.findByIdAndUpdate(userId, {
          $push: { behaviorPatterns: { pattern: 'Spends time on productive platforms', frequency: 1, lastOccurrence: new Date() } },
        });
      }
    }

    // Generate AI nudge for distracting sites (uses a lean snapshot — no save needed)
    let nudge = null;
    if (isDistracting && duration > 120) {
      try {
        // Re-read fresh for prompt context
        const freshUser = await User.findById(userId).lean();
        if (freshUser) {
          const prompt = buildActivityAnalysisPrompt(freshUser as any, site, Math.floor(duration / 60));
          nudge = await generateWithFallback(prompt);
        }
      } catch (err) {
        console.error('Failed to generate nudge:', err);
      }
    }

    res.status(200).json({
      success: true,
      productive,
      nudge,
      message: productive ? 'Great, keep it up!' : 'Activity logged',
    });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
};
export const logActivityBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, activities } = req.body;
    if (!userId || !Array.isArray(activities)) {
      res.status(400).json({ error: 'userId and an activities array are required' });
      return;
    }

    const exists = await User.findById(userId).lean();
    if (!exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let totalDistractedTime = 0;
    const historyEntries: any[] = [];

    for (const act of activities) {
      const { site, duration, timestamp } = act;
      const isDistracting = DISTRACTING_SITES.some(d => site.includes(d));
      const isProductive = PRODUCTIVE_SITES.some(p => site.includes(p));
      const productive = isProductive || !isDistracting;

      // Save activity document (separate collection)
      await new Activity({
        userId, site, duration,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        productive,
      }).save();

      if (isDistracting) totalDistractedTime += duration;

      historyEntries.push({
        timestamp: new Date(),
        type: 'activity',
        input: site,
        output: JSON.stringify({ site, duration, productive }),
      });
    }

    // ── Atomic: push all history entries at once ─────────────────────────────
    await User.findByIdAndUpdate(userId, {
      $push: { history: { $each: historyEntries } },
    });

    // ── Atomic: adjust productivity score ────────────────────────────────────
    const scoreDelta = totalDistractedTime > 300
      ? -Math.floor(totalDistractedTime / 300)
      : 1;
    await User.findByIdAndUpdate(userId, { $inc: { productivityScore: scoreDelta } });

    res.status(200).json({ success: true, processed: activities.length });
  } catch (error) {
    console.error('Batch activity error:', error);
    res.status(500).json({ error: 'Failed to process batch activity' });
  }
};
export const getActivityStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const activities = await Activity.find({
      userId,
      timestamp: { $gte: since },
    }).sort({ timestamp: -1 });

    // Aggregate stats
    const totalTime = activities.reduce((sum, a) => sum + a.duration, 0);
    const productiveTime = activities.filter(a => a.productive).reduce((sum, a) => sum + a.duration, 0);
    const distractingTime = totalTime - productiveTime;

    // Group by site
    const siteBreakdown: Record<string, number> = {};
    activities.forEach(a => {
      siteBreakdown[a.site] = (siteBreakdown[a.site] || 0) + a.duration;
    });

    // Top sites
    const topSites = Object.entries(siteBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([site, duration]) => ({ site, duration, minutes: Math.floor(duration / 60) }));

    // Daily breakdown
    const dailyBreakdown: Record<string, { productive: number; distracting: number }> = {};
    activities.forEach(a => {
      const day = a.timestamp.toISOString().split('T')[0];
      if (!dailyBreakdown[day]) dailyBreakdown[day] = { productive: 0, distracting: 0 };
      if (a.productive) {
        dailyBreakdown[day].productive += a.duration;
      } else {
        dailyBreakdown[day].distracting += a.duration;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalTime,
        productiveTime,
        distractingTime,
        productivityRatio: totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0,
        topSites,
        dailyBreakdown,
        totalActivities: activities.length,
      },
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
};

export const getInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const activities = await Activity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100);

    const totalTime = activities.reduce((sum, a) => sum + a.duration, 0);
    const productiveTime = activities.filter(a => a.productive).reduce((sum, a) => sum + a.duration, 0);

    res.status(200).json({
      success: true,
      insights: {
        productivityScore: user.productivityScore,
        behaviorPatterns: user.behaviorPatterns.sort((a, b) => b.frequency - a.frequency),
        totalInteractions: user.history.length,
        chatCount: user.history.filter(h => h.type === 'chat').length,
        simulationCount: user.history.filter(h => h.type === 'simulation').length,
        actionCount: user.history.filter(h => h.type === 'action').length,
        activityStats: {
          totalMinutes: Math.floor(totalTime / 60),
          productiveMinutes: Math.floor(productiveTime / 60),
          productivityRatio: totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
};

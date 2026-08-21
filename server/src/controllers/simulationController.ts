import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateJSON, generateWithFallback } from '../config/groq';
import { buildSimulationPrompt } from '../config/promptBuilder';

export const simulate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, scenario } = req.body;

    if (!userId || !scenario) {
      res.status(400).json({ error: 'userId and scenario are required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const prompt = buildSimulationPrompt(user, scenario);

    const rawResponse = await generateJSON(prompt);

    let parsed;
    try {
      // Strip out any potential markdown wrapper returned by gemini implicitly
       const jsonString = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
       parsed = JSON.parse(jsonString);
    } catch(err) {
       console.error("JSON Parse failed for Simulation:", rawResponse);
       parsed = {
          best_case: "Parse failure. See raw response.",
          likely_case: "Parse failure.",
          worst_case: "Parse failure.",
          confidence_score: 0,
          reasoning: "System failed to compute structured JSON format."
       };
    }

    // Store in history
    user.history.push({
      timestamp: new Date(),
      type: 'simulation',
      input: scenario,
      output: JSON.stringify(parsed),
      mode: 'simulation',
    });

    // Simulating future = self-awareness behavior
    const existing = user.behaviorPatterns.find((p: any) => p.pattern === 'Thinks about future consequences');
    if (existing) {
      existing.frequency += 1;
      existing.lastOccurrence = new Date();
    } else {
      user.behaviorPatterns.push({
        pattern: 'Thinks about future consequences',
        frequency: 1,
        lastOccurrence: new Date(),
      });
    }

    user.productivityScore = Math.min(100, user.productivityScore + 1);
    await user.save();

    res.status(200).json({
      success: true,
      scenario,
      rawResponse,
      parsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      error: 'Failed to run simulation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getSimulationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const simulations = user.history
      .filter(h => h.type === 'simulation')
      .slice(-10)
      .reverse();

    res.status(200).json({
      success: true,
      simulations,
      total: simulations.length,
    });
  } catch (error) {
    console.error('Get simulation history error:', error);
    res.status(500).json({ error: 'Failed to fetch simulation history' });
  }
};

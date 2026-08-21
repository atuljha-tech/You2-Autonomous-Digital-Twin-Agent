import { Request, Response } from 'express';
import { User } from '../models/User';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, goals, habits, preferences, personality: bodyPersonality, extraContext } = req.body;

    if (!name || !goals || !habits) {
      res.status(400).json({
        error: 'Missing required fields: name, goals, and habits are required'
      });
      return;
    }

    // Use personality from body if provided, otherwise derive a minimal one
    const personality = bodyPersonality || {
      traits: [],
      strengths: [],
      weaknesses: [],
    };

    const user = new User({
      name,
      goals,
      habits,
      preferences: preferences || {},
      personality,
      extraContext: extraContext || {},
      behaviorPatterns: [],
      productivityScore: 50,
      history: [],
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Digital twin created successfully',
      user: {
        id: user._id,
        name: user.name,
        goals: user.goals,
        habits: user.habits,
        productivityScore: user.productivityScore,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        goals: user.goals,
        habits: user.habits,
        preferences: user.preferences,
        personality: user.personality,
        behaviorPatterns: user.behaviorPatterns,
        productivityScore: user.productivityScore,
        historyCount: user.history.length,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('name goals productivityScore createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

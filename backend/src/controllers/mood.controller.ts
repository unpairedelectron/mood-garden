import { Request, Response } from 'express';
import { MoodEntryModel } from '../models/MoodEntry.model';
import { GardenStateModel } from '../models/GardenState.model';
import AIService from '../services/ai.service';
import { v4 as uuidv4 } from 'uuid';

export class MoodController {
  async createMoodEntry(req: Request, res: Response) {
    try {
      const { userId, inputType, rawInput, context } = req.body;

      if (!userId || !inputType || !rawInput) {
        return res.status(400).json({ 
          error: 'Missing required fields: userId, inputType, rawInput' 
        });
      }

      // Analyze mood with AI
      const aiAnalysis = await AIService.analyzeMood(rawInput, inputType);

      // Create mood entry
      const moodEntry = new MoodEntryModel({
        userId,
        inputType,
        rawInput,
        context: context || {},
        processedMood: {
          primary: aiAnalysis.primary,
          secondary: aiAnalysis.secondary,
          intensity: aiAnalysis.intensity,
          confidence: aiAnalysis.confidence
        },
        aiAnalysis: {
          sentiment: aiAnalysis.sentiment,
          emotions: aiAnalysis.emotions,
          suggestedPlants: aiAnalysis.suggestedPlants,
          wellnessTips: aiAnalysis.wellnessTips
        }
      });

      const savedEntry = await moodEntry.save();

      // Update garden state
      await this.updateGardenState(userId, savedEntry, aiAnalysis.suggestedPlants);

      res.status(201).json({
        message: 'Mood entry created successfully',
        moodEntry: savedEntry,
        plantSuggestions: aiAnalysis.suggestedPlants,
        wellnessTips: aiAnalysis.wellnessTips
      });

    } catch (error) {
      console.error('Create mood entry error:', error);
      res.status(500).json({ error: 'Failed to create mood entry' });
    }
  }

  async getMoodHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { limit = 30, offset = 0 } = req.query;

      const moods = await MoodEntryModel
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .skip(Number(offset));

      res.json({
        moods,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: await MoodEntryModel.countDocuments({ userId })
        }
      });

    } catch (error) {
      console.error('Get mood history error:', error);
      res.status(500).json({ error: 'Failed to fetch mood history' });
    }
  }

  async getMoodAnalytics(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const moods = await MoodEntryModel.find({
        userId,
        timestamp: { $gte: startDate }
      });

      // Calculate analytics
      const moodCounts = moods.reduce((acc, mood) => {
        acc[mood.processedMood.primary] = (acc[mood.processedMood.primary] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const avgIntensity = moods.length > 0 
        ? moods.reduce((sum, mood) => sum + mood.processedMood.intensity, 0) / moods.length 
        : 0;

      const avgSentiment = moods.length > 0
        ? moods.reduce((sum, mood) => sum + mood.aiAnalysis.sentiment, 0) / moods.length
        : 0;

      res.json({
        period: `${days} days`,
        totalEntries: moods.length,
        moodDistribution: moodCounts,
        averageIntensity: Math.round(avgIntensity * 10) / 10,
        averageSentiment: Math.round(avgSentiment * 100) / 100,
        streak: await this.calculateStreak(userId)
      });

    } catch (error) {
      console.error('Get mood analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch mood analytics' });
    }
  }

  private async updateGardenState(userId: string, moodEntry: any, plantSuggestions: any[]) {
    try {
      let garden = await GardenStateModel.findOne({ userId });

      if (!garden) {
        garden = new GardenStateModel({
          userId,
          plants: [],
          environment: {
            weather: 'sunny',
            season: 'spring',
            timeOfDay: 'morning'
          }
        });
      }

      // Add suggested plants to garden
      if (plantSuggestions.length > 0) {
        const newPlant = {
          id: uuidv4(),
          type: plantSuggestions[0].plantType,
          position: this.generateRandomPosition(garden.plants),
          growthStage: plantSuggestions[0].growthStage,
          health: 100,
          moodEntryId: moodEntry.id,
          plantedAt: new Date()
        };

        garden.plants.push(newPlant);
      }

      // Update environment based on mood sentiment
      garden.environment = this.updateEnvironment(garden.environment, moodEntry.aiAnalysis.sentiment);
      garden.lastUpdated = new Date();

      await garden.save();
    } catch (error) {
      console.error('Update garden state error:', error);
    }
  }

  private generateRandomPosition(existingPlants: any[]): { x: number; y: number } {
    // Simple grid-based positioning to avoid overlap
    const gridSize = 100;
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.floor(Math.random() * 10) * gridSize;
      const y = Math.floor(Math.random() * 10) * gridSize;
      
      const isOccupied = existingPlants.some(plant => 
        Math.abs(plant.position.x - x) < gridSize && 
        Math.abs(plant.position.y - y) < gridSize
      );
      
      if (!isOccupied) {
        return { x, y };
      }
    }
    
    // Fallback to random position if grid is full
    return {
      x: Math.random() * 1000,
      y: Math.random() * 1000
    };
  }

  private updateEnvironment(currentEnv: any, sentiment: number): any {
    const newEnv = { ...currentEnv };
    
    // Update weather based on sentiment
    if (sentiment > 0.5) {
      newEnv.weather = 'sunny';
    } else if (sentiment > 0) {
      newEnv.weather = 'cloudy';
    } else if (sentiment > -0.5) {
      newEnv.weather = 'rainy';
    } else {
      newEnv.weather = 'stormy';
    }
    
    // Update time of day based on current time
    const hour = new Date().getHours();
    if (hour < 6) newEnv.timeOfDay = 'night';
    else if (hour < 10) newEnv.timeOfDay = 'morning';
    else if (hour < 17) newEnv.timeOfDay = 'afternoon';
    else if (hour < 20) newEnv.timeOfDay = 'evening';
    else newEnv.timeOfDay = 'night';
    
    return newEnv;
  }

  private async calculateStreak(userId: string): Promise<{ current: number; longest: number }> {
    const moods = await MoodEntryModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(100);

    if (moods.length === 0) {
      return { current: 0, longest: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = new Date();

    for (const mood of moods) {
      const moodDate = new Date(mood.timestamp);
      const daysDiff = Math.floor((lastDate.getTime() - moodDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 1) {
        tempStreak++;
        if (currentStreak === 0) currentStreak = tempStreak;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
        currentStreak = 0;
      }

      lastDate = moodDate;
    }

    if (tempStreak > longestStreak) longestStreak = tempStreak;

    return { current: currentStreak, longest: longestStreak };
  }
}

export default new MoodController();

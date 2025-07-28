import { Router, Request, Response } from 'express';
import AIService from '../services/ai.service';
import { MoodEntryModel } from '../models/MoodEntry.model';
import { GardenStateModel } from '../models/GardenState.model';

const router = Router();

// POST /api/ai/analyze-mood - Analyze mood input
router.post('/analyze-mood', async (req: Request, res: Response) => {
  try {
    const { input, inputType } = req.body;

    if (!input || !inputType) {
      return res.status(400).json({ error: 'Missing input or inputType' });
    }

    const analysis = await AIService.analyzeMood(input, inputType);
    res.json(analysis);

  } catch (error) {
    console.error('AI mood analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
});

// GET /api/ai/coaching/:userId - Get personalized coaching tip
router.get('/coaching/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get recent mood history
    const recentMoods = await MoodEntryModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(7)
      .select('processedMood.primary');

    const moodHistory = recentMoods.map(m => m.processedMood.primary);

    // Get garden state
    const gardenState = await GardenStateModel.findOne({ userId });

    const coachingTip = await AIService.generateCoachingTip(moodHistory, gardenState);
    res.json(coachingTip);

  } catch (error) {
    console.error('AI coaching error:', error);
    res.status(500).json({ error: 'Failed to generate coaching tip' });
  }
});

// POST /api/ai/voice-transcribe - Transcribe voice note (placeholder)
router.post('/voice-transcribe', async (req: Request, res: Response) => {
  try {
    // TODO: Implement voice transcription with OpenAI Whisper or similar
    // For now, return a placeholder
    res.json({ 
      transcription: "Voice transcription not yet implemented",
      confidence: 0.9 
    });

  } catch (error) {
    console.error('Voice transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe voice' });
  }
});

export default router;

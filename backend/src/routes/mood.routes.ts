import { Router } from 'express';
import moodController from '../controllers/mood.controller';

const router = Router();

// POST /api/moods - Create new mood entry
router.post('/', moodController.createMoodEntry.bind(moodController));

// GET /api/moods/:userId - Get mood history for user
router.get('/:userId', moodController.getMoodHistory.bind(moodController));

// GET /api/moods/:userId/analytics - Get mood analytics
router.get('/:userId/analytics', moodController.getMoodAnalytics.bind(moodController));

export default router;

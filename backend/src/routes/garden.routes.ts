import { Router } from 'express';
import gardenController from '../controllers/garden.controller';

const router = Router();

// GET /api/garden/:userId - Get garden state
router.get('/:userId', gardenController.getGardenState.bind(gardenController));

// POST /api/garden/:userId/plants/:plantId/water - Water a plant
router.post('/:userId/plants/:plantId/water', gardenController.waterPlant.bind(gardenController));

// DELETE /api/garden/:userId/plants/:plantId - Remove a plant
router.delete('/:userId/plants/:plantId', gardenController.removePlant.bind(gardenController));

// GET /api/garden/:userId/stats - Get garden statistics
router.get('/:userId/stats', gardenController.getGardenStats.bind(gardenController));

export default router;

import { Request, Response } from 'express';
import { GardenStateModel } from '../models/GardenState.model';
import AIService from '../services/ai.service';

export class GardenController {
  async getGardenState(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      let garden = await GardenStateModel.findOne({ userId });

      if (!garden) {
        // Create initial garden state
        garden = new GardenStateModel({
          userId,
          plants: [],
          environment: {
            weather: 'sunny',
            season: 'spring',
            timeOfDay: 'morning'
          }
        });
        await garden.save();
      }

      res.json(garden);

    } catch (error) {
      console.error('Get garden state error:', error);
      res.status(500).json({ error: 'Failed to fetch garden state' });
    }
  }

  async waterPlant(req: Request, res: Response) {
    try {
      const { userId, plantId } = req.params;

      const garden = await GardenStateModel.findOne({ userId });
      if (!garden) {
        return res.status(404).json({ error: 'Garden not found' });
      }

      const plant = garden.plants.find(p => p.id === plantId);
      if (!plant) {
        return res.status(404).json({ error: 'Plant not found' });
      }

      // Update plant health and growth
      plant.lastWatered = new Date();
      plant.health = Math.min(100, plant.health + 10);

      // Maybe grow the plant
      if (this.shouldGrow(plant)) {
        const nextStage = this.getNextGrowthStage(plant.growthStage);
        plant.growthStage = nextStage as 'seed' | 'sprout' | 'bloom' | 'flourish';
      }

      garden.lastUpdated = new Date();
      await garden.save();

      res.json({
        message: 'Plant watered successfully',
        plant,
        garden
      });

    } catch (error) {
      console.error('Water plant error:', error);
      res.status(500).json({ error: 'Failed to water plant' });
    }
  }

  async removePlant(req: Request, res: Response) {
    try {
      const { userId, plantId } = req.params;

      const garden = await GardenStateModel.findOne({ userId });
      if (!garden) {
        return res.status(404).json({ error: 'Garden not found' });
      }

      garden.plants = garden.plants.filter(p => p.id !== plantId);
      garden.lastUpdated = new Date();
      await garden.save();

      res.json({
        message: 'Plant removed successfully',
        garden
      });

    } catch (error) {
      console.error('Remove plant error:', error);
      res.status(500).json({ error: 'Failed to remove plant' });
    }
  }

  async getGardenStats(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const garden = await GardenStateModel.findOne({ userId });
      if (!garden) {
        return res.status(404).json({ error: 'Garden not found' });
      }

      const stats = {
        totalPlants: garden.plants.length,
        plantsByType: garden.plants.reduce((acc, plant) => {
          acc[plant.type] = (acc[plant.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        plantsByStage: garden.plants.reduce((acc, plant) => {
          acc[plant.growthStage] = (acc[plant.growthStage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageHealth: garden.plants.length > 0 
          ? garden.plants.reduce((sum, plant) => sum + plant.health, 0) / garden.plants.length 
          : 0,
        environment: garden.environment,
        gardenAge: Math.floor((Date.now() - (garden as any).createdAt?.getTime() || Date.now()) / (1000 * 60 * 60 * 24))
      };

      res.json(stats);

    } catch (error) {
      console.error('Get garden stats error:', error);
      res.status(500).json({ error: 'Failed to fetch garden stats' });
    }
  }

  private shouldGrow(plant: any): boolean {
    const daysSinceWatered = plant.lastWatered 
      ? Math.floor((Date.now() - plant.lastWatered.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const daysSincePlanted = Math.floor((Date.now() - plant.plantedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Growth conditions: healthy plant, been watered recently, enough time has passed
    return plant.health > 70 && daysSinceWatered < 2 && daysSincePlanted >= 1;
  }

  private getNextGrowthStage(currentStage: string): string {
    const stages = ['seed', 'sprout', 'bloom', 'flourish'];
    const currentIndex = stages.indexOf(currentStage);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : currentStage;
  }
}

export default new GardenController();

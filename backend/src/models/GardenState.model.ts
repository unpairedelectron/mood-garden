import mongoose, { Schema, Document } from 'mongoose';
import { GardenState, PlantType } from '../types';

interface IGardenState extends Document, Omit<GardenState, 'id'> {}

const gardenStateSchema = new Schema<IGardenState>({
  userId: { type: String, required: true, unique: true, index: true },
  plants: [{
    id: { type: String, required: true },
    type: { 
      type: String, 
      enum: [
        'sunflower', 'daisy', 'rose', 'fern', 'aloe', 
        'bamboo', 'lavender', 'oak', 'willow', 'cactus',
        'lily', 'moss', 'vine', 'cherry-blossom'
      ], 
      required: true 
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    growthStage: { 
      type: String, 
      enum: ['seed', 'sprout', 'bloom', 'flourish'], 
      default: 'seed' 
    },
    health: { type: Number, min: 0, max: 100, default: 100 },
    moodEntryId: { type: String, required: true },
    plantedAt: { type: Date, default: Date.now },
    lastWatered: Date
  }],
  environment: {
    weather: { 
      type: String, 
      enum: ['sunny', 'cloudy', 'rainy', 'foggy', 'stormy'], 
      default: 'sunny' 
    },
    season: { 
      type: String, 
      enum: ['spring', 'summer', 'autumn', 'winter'], 
      default: 'spring' 
    },
    timeOfDay: { 
      type: String, 
      enum: ['dawn', 'morning', 'afternoon', 'evening', 'night'], 
      default: 'morning' 
    }
  },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      ret.id = ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...cleanRet } = ret;
      return { id: ret.id, ...cleanRet };
    }
  }
});

export const GardenStateModel = mongoose.model<IGardenState>('GardenState', gardenStateSchema);

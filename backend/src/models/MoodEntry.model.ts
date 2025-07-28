import mongoose, { Schema, Document } from 'mongoose';
import { MoodEntry, MoodType, PlantType } from '../types';

interface IMoodEntry extends Document, Omit<MoodEntry, 'id'> {}

const moodEntrySchema = new Schema<IMoodEntry>({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  inputType: { 
    type: String, 
    enum: ['text', 'emoji', 'voice'], 
    required: true 
  },
  rawInput: { type: String, required: true },
  processedMood: {
    primary: { 
      type: String, 
      enum: [
        'happy', 'sad', 'anxious', 'calm', 'angry', 
        'excited', 'tired', 'stressed', 'content', 'lonely',
        'grateful', 'frustrated', 'peaceful', 'overwhelmed'
      ], 
      required: true 
    },
    secondary: { 
      type: String, 
      enum: [
        'happy', 'sad', 'anxious', 'calm', 'angry', 
        'excited', 'tired', 'stressed', 'content', 'lonely',
        'grateful', 'frustrated', 'peaceful', 'overwhelmed'
      ]
    },
    intensity: { type: Number, min: 1, max: 10, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true }
  },
  context: {
    triggers: [String],
    location: String,
    weather: String,
    activities: [String]
  },
  aiAnalysis: {
    sentiment: { type: Number, min: -1, max: 1, required: true },
    emotions: [{
      emotion: String,
      score: { type: Number, min: 0, max: 1 }
    }],
    suggestedPlants: [{
      plantType: { 
        type: String, 
        enum: [
          'sunflower', 'daisy', 'rose', 'fern', 'aloe', 
          'bamboo', 'lavender', 'oak', 'willow', 'cactus',
          'lily', 'moss', 'vine', 'cherry-blossom'
        ]
      },
      reason: String,
      growthStage: { 
        type: String, 
        enum: ['seed', 'sprout', 'bloom'], 
        default: 'seed' 
      }
    }],
    wellnessTips: [String]
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { __v, ...cleanRet } = ret;
      return { id: ret.id, ...cleanRet };
    }
  }
});

// Indexes for performance
moodEntrySchema.index({ userId: 1, timestamp: -1 });
moodEntrySchema.index({ 'processedMood.primary': 1 });

export const MoodEntryModel = mongoose.model<IMoodEntry>('MoodEntry', moodEntrySchema);

import mongoose, { Schema, Document } from 'mongoose';
import { User } from '../types';

interface IUser extends Document, Omit<User, 'id'> {
  password: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  preferences: {
    gardenTheme: { 
      type: String, 
      enum: ['default', 'zen', 'tropical', 'desert', 'forest'], 
      default: 'default' 
    },
    notifications: { type: Boolean, default: true },
    privacy: { 
      type: String, 
      enum: ['private', 'anonymous', 'public'], 
      default: 'private' 
    }
  },
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastEntry: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret: any) => {
      const id = ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, password, ...cleanRet } = ret;
      return { id, ...cleanRet };
    }
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

export const UserModel = mongoose.model<IUser>('User', userSchema);

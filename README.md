# MoodGarden

MoodGarden is a cross-platform mental wellness app that transforms your daily moods into a dynamic virtual garden, using AI to personalize growth and self-care insights.

## Core Features (MVP)
- **Mood Input System:** Multi-modal input (text, emoji slider, voice note with transcription), AI sentiment/context analysis.
- **Dynamic Garden Engine:** Mood-to-plant algorithm, growth stages, and evolving garden visuals.
- **AI Wellness Coach:** Metaphorical self-care tips and micro-habit suggestions.
- **Progress Tracking:** Calendar/timeline of moods and garden biome changes.

## Tech Stack
- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Mobile:** React Native + Expo + TypeScript
- **Shared:** Common types and API client
- **AI:** OpenAI API for sentiment/context analysis and coaching
- **Database:** MongoDB

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud)
- Optional: OpenAI API key for AI features
- For mobile: Expo CLI (`npm install -g @expo/cli`)

### Frontend Setup (Web)
```bash
npm install
npm run dev
```
Runs on http://localhost:5173

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and OpenAI API key
npm run build
npm run dev
```
Runs on http://localhost:3001

### Mobile Setup (React Native + Expo)
```bash
cd mobile
npm install
npx expo start
```

**Mobile Features:**
- 📱 Cross-platform (iOS & Android)
- 🎤 Voice mood recording with transcription
- 📷 Camera integration for mood photos
- 🔄 Offline support with data sync
- 📍 Location-aware mood tracking
- 🌟 Native UI components optimized for mobile

### Shared Package
The `shared/` directory contains common TypeScript types and API client used by both web and mobile:
```bash
cd shared
npm install
npm run build
```

### VS Code Tasks
Use VS Code's built-in task runner:
- **Vite: Dev Server** - Start web frontend
- **Backend: Dev Server** - Start API server
- **Mobile: Expo Start** - Start mobile development server
- **Mobile: iOS Simulator** - Launch in iOS simulator
- **Mobile: Android Emulator** - Launch in Android emulator
- **Build All** - Build all projects

### API Endpoints
- **Moods:** `POST /api/moods`, `GET /api/moods/:userId`, `GET /api/moods/:userId/analytics`
- **Garden:** `GET /api/garden/:userId`, `POST /api/garden/:userId/plants/:plantId/water`
- **AI:** `POST /api/ai/analyze-mood`, `GET /api/ai/coaching/:userId`
- **Users:** `POST /api/users/register`, `POST /api/users/login`

## Project Structure
```
mood-garden/
├── src/                 # Web frontend (React + Vite)
├── backend/             # API server (Node.js + Express)
├── mobile/              # Mobile app (React Native + Expo)
├── shared/              # Common types and API client
└── .vscode/            # VS Code tasks and configuration
```

## Mobile Development
The mobile app uses Expo for cross-platform development with native features:

**Key Mobile Components:**
- `useAuth` - Authentication with AsyncStorage persistence
- `useVoiceRecording` - Voice note recording and playback
- `useCamera` - Camera and photo gallery integration
- `MobileAPIService` - API client with offline support

**Testing Mobile:**
- Web browser: `npx expo start` → press `w`
- iOS simulator: `npx expo start --ios` (macOS only)
- Android emulator: `npx expo start --android`
- Physical device: Install Expo Go app and scan QR code

## Future Features
- AR garden mode, community/shared gardens, biometric sync, generative AI plants.

---

_This project was bootstrapped with Vite's React + TypeScript template and Expo's TypeScript template._

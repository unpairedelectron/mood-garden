# Mood Garden

Two 3D games about a garden that grows from how you feel, plus the earlier mood-tracker app.

| Folder | What it is |
| --- | --- |
| [`AAA-pc-game/`](AAA-pc-game/README.md) | **Mood Garden** for PC: a third-person exploration game. Restore a colourless island by gathering motes of feeling and waking six groves. Keyboard and mouse or gamepad; wants a dedicated GPU. |
| [`mobile-game/`](mobile-game/README.md) | **Mood Garden** for phones: plant a forest from how you feel and walk through it in first person. Photo-scanned trees, plants and skies (Poly Haven, CC0); ferns, flowers and wildlife arrive on their own as the forest grows. Touch-first, installable to the home screen. |
| [`mobile-game-expo/`](mobile-game-expo/README.md) | Expo Go shell that shows the mobile game full-screen in a web view, for testing on a phone. |
| `backend/`, `mobile/`, `shared/` | The original mood-tracker (Express API, Expo app, shared types). Unchanged; neither game depends on them. |

The PC game generates everything at runtime. The mobile game ships about 15 MB of scanned assets; its music and sound are synthesised.

```bash
cd AAA-pc-game && npm install && npm run dev
```

```bash
cd mobile-game && npm install && npm run dev
```

## Earlier app: backend and mobile

These packages belong to the original mood-tracker and are unchanged.

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
├── AAA-pc-game/         # The 3D PC game (three.js + React HUD)
├── mobile-game/         # Mood Garden Pocket, the 3D phone game
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

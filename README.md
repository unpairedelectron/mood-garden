# Mood Garden

**Mood Garden** is a 3D exploration game that runs in the browser. You play the Keeper, washed up on an
island that has gone quiet: its colour drained, its groves asleep. Gather motes of feeling, plant them,
and watch the island come back to life — one great tree, one biome, one instrument in the score at a time.

Everything in the game is generated at runtime — terrain, trees, sky, water, music and sound. There are
no model, texture or audio files to download.

## The game

- **Six groves, six feelings** — Joy, Calm, Love, Hope, Courage and Sorrow each own a region of the island.
  Collect five motes near a grove, carry them to its seedbed and plant them to grow its great tree.
- **A world that answers** — a wave of colour rolls out from every awakened grove. Grass grows tall, flowers
  open, trees leaf out, butterflies and birds return, and the sky clears.
- **Adaptive score** — the soundtrack starts as a bare drone and gains one instrument per grove.
- **Name what you feel** — press `F` at any time to pick a feeling (and optionally write a line about it).
  A bloom of that feeling is planted where you stand and logged in your journal. This is the original
  Mood Garden idea, kept as a game mechanic: your real mood shapes the garden.
- **Day and night** — a full cycle with sun shafts, stars, fireflies, glowing canopies and a lantern wisp.
- **Photo mode** — pause, free the camera, set the time of day, capture a PNG.

### Controls

| Action | Keyboard & mouse | Gamepad |
| --- | --- | --- |
| Move / look | `WASD` / mouse (click to capture) | Left / right stick |
| Run | `Shift` | Right trigger |
| Jump, hold to glide | `Space` | A |
| Interact | `E` | X |
| Name a feeling | `F` | Y |
| Sense nearby motes | `Q` | B |
| Journal | `J` | Back |
| Pause | `Esc` | Start |

Touch devices get an on-screen stick and buttons. Progress saves automatically in the browser.

## Tech

- **Web game:** TypeScript, [three.js](https://threejs.org) (WebGL 2), React for the HUD, Vite.
- **Rendering:** HDR pipeline with ACES tone mapping, bloom, screen-space light shafts and a film grade;
  shadow-mapped sun/moon; GPU-instanced wind-animated grass that wraps around the camera; leaf-card
  canopies; procedural sky with clouds, stars and aurora; depth-tinted water with shoreline foam.
- **Audio:** Web Audio synthesis only (sequenced score, ambience and effects).
- **Also in this repo:** `backend/` (Express API), `mobile/` (Expo app) and `shared/` from the earlier
  mood-tracker app. The web game does not depend on them.

### Run the game

```bash
npm install
npm run dev
```

Open http://localhost:5173. A dedicated GPU is recommended; graphics quality can be changed in Settings
and the game lowers its resolution automatically if the frame rate drops.

```bash
npm run build     # production build in dist/
npm run preview   # serve the build locally
```

### Source layout

```
src/
├── game/
│   ├── Game.ts          # frame loop, camera, cinematics, quests, saving
│   ├── core/            # input, audio engine, math, HUD store
│   ├── data/            # the six moods and world constants
│   ├── world/           # terrain, sky, water, grass, flora, particles
│   ├── entities/        # player, groves and motes, wildlife
│   └── render/          # shared shader code and post-processing
└── ui/                  # React HUD: title, compass, feeling wheel, journal, pause, photo mode
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
- **Vite: Dev Server** - Start the web game
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
├── src/                 # The 3D web game (three.js + React HUD)
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

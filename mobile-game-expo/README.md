# Mood Garden — Expo Go shell

A small Expo app that shows the mobile game (`../mobile-game`) full-screen in a web view, so you can test it
in Expo Go. The game is a WebGL web app; this shell adds no game code of its own.

## Test on your phone

You need the Expo Go app (SDK 58) and your phone on the same Wi‑Fi as your computer.

Terminal 1, start the game:

```bash
cd mobile-game
npm install
npm run dev
```

Terminal 2, start Expo:

```bash
cd mobile-game-expo
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). The shell finds your computer's address from
Expo and loads the game from port 5173 automatically. If it can't reach it, it shows a screen where you can
type the "Network" address that `npm run dev` printed.

If your network blocks phone-to-computer traffic, `npx expo start --tunnel` gets Expo through, but the game
itself still needs to be reachable; in that case host a build and point the shell at it:

```bash
EXPO_PUBLIC_GAME_URL=https://your-host.example/mood-garden/ npx expo start
```

## Notes

- Saves live in the web view's storage on the phone, per game address.
- The screen is kept awake while the app is open.
- For store builds use the Capacitor project in `../mobile-game` (`ios/` and `android/`), which bundles the
  game and adds haptics, notifications and sharing. This shell is for quick testing in Expo Go.

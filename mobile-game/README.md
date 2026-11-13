# Mood Garden Pocket — mobile game

A small 3D garden floating in the sky, built for phones: portrait, one thumb, short sessions.

## How it plays

1. **Tap a tile** and say how you feel (Joy, Calm, Love, Hope, Courage or Sorrow), with a few words if you like.
   A seed of that feeling is planted. Each feeling grows into its own plant.
2. **Tap a seedling to water it** and it grows faster.
3. **Grown plants gather light.** Tap the glowing motes above them to collect it.
   Different feelings planted side by side gather light faster.
4. **Spend light to raise new land** by tapping a glowing outline at the island's edge (up to 37 tiles).
5. **Grow all six feelings at once** to earn a rainbow over the garden.

Hold a plant to read its note, water it or let it go. Drag to turn the island, pinch to zoom.

The sky follows your phone's clock (dawn, day, dusk, night with fireflies), a garden heavy with sorrow gets
soft rain, and the music adds an instrument for each kind of feeling that is fully grown. The garden keeps
growing while the app is closed (up to 12 hours) and saves on the device.

## Run it

```bash
npm install
npm run dev
```

The dev server prints a network address; open that on a phone on the same Wi-Fi.

```bash
npm run build
```

`dist/` is a static site. Host it anywhere over HTTPS and use the browser's "Add to Home Screen" to install
it full-screen with offline support (web app manifest + service worker included). The same folder can be
dropped into a native wrapper such as Capacitor if you want store builds.

## Tech

TypeScript, three.js (WebGL), Vite. No UI framework, no asset files: plants and tiles are procedural
low-poly geometry and all audio is synthesised with Web Audio. Rendering is a single forward pass with one
shadow map, sized for mobile GPUs. Add `?hour=21.5` to the URL to preview a time of day.

```
src/
├── main.ts      # HUD, bottom sheets, boot
├── garden.ts    # scene, touch gestures, growth simulation, effects
├── plants.ts    # procedural plant and tile models
├── state.ts     # save data, economy, away-time progress
├── audio.ts     # synthesised score and sound effects
└── moods.ts     # the six feelings
```

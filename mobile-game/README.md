# Mood Garden — mobile game

Plant a forest from how you feel, one tree a day, then walk through it as the days, weather and seasons turn.
Built for phones: first-person, one thumb to walk, drag to look. Ships as an iOS and Android app (Capacitor)
and runs as a web app.

## How it plays

1. **Each day, one feeling, one tree.** Tap **Plant**, say how you are (Joy, Calm, Love, Hope, Courage or
   Sorrow) and, if you like, a few words for your future self. A tree of that feeling grows where you stand.
   After that the button shows today's tree until tomorrow.
2. **Time moves while you watch.** The sky starts at your phone's clock and runs six times faster, so light and
   shadows visibly travel. Weather comes in spells — clear, overcast, mist, rain, wind, snow — and is the same
   if you close the app and come back. **Seasons follow the real calendar** (and your hemisphere): leaves turn
   and fall, jacarandas blossom, meadows bleach and frost, snow lies and melts.
3. **The forest fills itself in.** Ferns, shrubs and flowers move in around each tree; leaf litter replaces
   grass beneath it; where you walk most, a path wears into the ground and fades if you stop using it.
4. **Life arrives when the grove suits it.** Butterflies, bees, crickets, fireflies, songbirds, a passing flock,
   and birds that perch and sing in your own trees. Deer and a dusk fox have full behaviour and appear once an
   animal model pack is installed (see below).
5. **Something to come back to.** A month or a year after a planting, the grove offers to walk you back to it.
   **Memory walk** guides you past trees from a chosen time and stops at each to show what you felt and wrote.
   **Year in feelings** shows every day you planted as a coloured square, a tally, a few words about your year
   and a map of the grove where any tree can be tapped and visited. **Photo mode** hides the HUD and gives you
   film looks and a time-of-day slider.
6. **A shaped world.** A stream runs down into a pond that reflects the sky; a hill to the south-east gives a
   view over the whole grove.

## How it looks and sounds the way it does

- **Trees** are Poly Haven photo-scans of up to 3.9 million triangles. `tools/bake.ts` renders each into an
  eight-view impostor atlas; far away a tree is a two-triangle card re-lit by the current sky. **Up close it
  cross-fades into a real 3D tree**: a bark-textured trunk, limbs and twigs under ragged leaf-card clusters cut
  from the same scan, so it holds up when you stand under it and look up. Trunk position, lean, canopy height
  and canopy shape are *measured from the atlas*, so near and far versions line up.
- **Sky and light** are four photographed HDR skies (misty dawn, day, sunset, moonlit night) blended through the
  day. Each photo is turned so its own sun sits where the moving sun is; sun direction, colour, ambient and fog
  are measured from the photos and interpolated. A drifting cloud layer, overcast and mist sit on top.
- **Camera**: the scene renders to an HDR multisampled buffer; one pass adds low mist, moving cloud shadows and
  light shafts through the leaves (marched through the depth buffer), then ACES tone mapping and a gentle film
  grade (split tone by time of day, vignette, grain).
- **Water** reflects the same blended sky, shows the pebble bed through the shallows, flows downstream, and
  rings with rain.
- **Sound** is built around recordings — time-of-day beds, wind in the canopy, rain on leaves, the stream,
  birdsong by species and hour, footsteps by surface, and a composed score in stems per feeling. Until those are
  installed every slot is synthesised: positional songbirds shaped after real species, a dawn chorus, a night
  owl, rain ticking on leaves under trees, a babbling stream, and footsteps that know what you are on. See
  `public/assets/audio/README.md`.

All visual assets are CC0 from [Poly Haven](https://polyhaven.com) (credits below).

## Still needed from outside this repo

| What | Why | Where it goes |
| --- | --- | --- |
| Field recordings and a composed score | Real ambience and music carry this kind of game. None could be sourced with a clean commercial licence while building. | `public/assets/audio/` + `manifest.json` (guide in the README there) |
| Rigged, animated deer and fox (licensed pack or commission) | Photoreal animals can't be generated procedurally. | `public/assets/animals/` + `manifest.json` (guide in the README there) |
| Profiling on real phones | Tiers and budgets are set from first principles; they need checking on a low, mid and high device each for iOS and Android. | Run with `?stats` (see below) |

## Run it

```bash
npm install
npm run dev
```

The dev server prints a network address; open it on a phone on the same Wi-Fi.

Useful URL parameters (dev and testing):

| Parameter | Effect |
| --- | --- |
| `?hour=17.5` | Start at a time of day (and hold it; add `&lapse` to let it run) |
| `?season=autumn` | Force a season (`spring`, `summer`, `autumn`, `winter`, or a 0–1 phase) |
| `?date=2026-05-01` | Pretend it is another date |
| `?weather=rain` | Force weather (`clear`, `cloudy`, `mist`, `rain`, `wind`, `snow`) |
| `?quality=low` | Force a quality tier (`low`, `medium`, `high`) |
| `?stats` | Frame-time, draw-call and triangle overlay for tuning on devices |
| `?unlimited` | Lift the one-tree-a-day limit |
| `?proxyanimals` | Stand-in deer and fox bodies to test their behaviour without the model pack |

## Ship it natively

The app is a Capacitor 8 project: `ios/` and `android/` are committed, and the game is bundled from `dist/`.

```bash
npm run build
npx cap sync
```

Then open the native project and build/run on a device:

```bash
npx cap open ios
```

```bash
npx cap open android
```

Native features (all in `src/native.ts`, with web fallbacks):

- **Haptics** on choosing a feeling, planting, the shutter and arriving at a memory.
- **Local notifications**, re-planned each time the app goes to the background: a tree you planted has reached
  full height, your jacaranda is in bloom, the leaves are turning, a month and a year since a planting, and an
  optional daily reminder (Menu → Settings). Nothing is sent from a server.
- **Share sheet** for photos.
- Status bar overlay, splash screen held until the grove has drawn, audio suspended in the background.

The app ID is `com.unpairedelectron.moodgarden` (it cannot change once published). Before submitting: signing in Xcode / Android Studio, and the
notification permission wording. App icons and splashes are generated from `public/icon.svg` into `assets/`
with `npx @capacitor/assets generate`.

### Performance

Three quality tiers (Menu → Settings → Battery / Balanced / Beautiful) pick MSAA, light shafts, shadow-map size,
pixel-ratio cap, grass density and how many trees are drawn in full; the first guess comes from the GPU name and
device memory, and resolution adapts to hold frame rate. Big costs to watch with `?stats`: grass clumps
(scanned meshes, the largest triangle count), shadow passes, and the full-screen post pass on high-DPI screens.

The `../mobile-game-expo` shell still works for quick testing in Expo Go; the Capacitor project is the one to
ship.

### Re-baking trees

Download a Poly Haven model's glTF into `tools/raw/<asset>/`, start the dev server on port 5197, then:

```bash
node tools/bake.mjs <asset>
```

This writes `<asset>_albedo.webp`, `<asset>_normal.webp` and `<asset>.json` into `public/assets/trees/`.

## Source

```
src/
├── main.ts        # HUD, ritual, sheets, memory walks, photo mode, boot
├── world.ts       # renderer, ground, walking, guided walks, frame loop
├── clock.ts       # grove time, seasons by hemisphere, deterministic weather
├── sky.ts         # blended photographed skies and the light measured from them
├── post.ts        # HDR target, light shafts, mist, cloud shadows, grade; quality tiers
├── precip.ts      # rain, snow, falling leaves
├── forest.ts      # impostor trees, seasons on leaves, instanced understory and grass
├── neartrees.ts   # 3D trunks, limbs and leaf-card canopies for nearby trees
├── terrain.ts     # height field: hill, pond basin, stream channel
├── water.ts       # pond and stream surfaces
├── paths.ts       # desire paths (wear grid, saved) and the water mask
├── life.ts        # insects, songbirds, the flock, and what brings each
├── fauna.ts       # perching birds; deer and fox behaviour and model loading
├── audio.ts       # score, ambience, spatial birds, footsteps (synthesis)
├── samples.ts     # recordings manifest and playback
├── native.ts      # haptics, notifications, sharing, app lifecycle
├── year.ts        # year in feelings and the grove map
├── state.ts       # save data
└── moods.ts       # the six feelings, their trees and seasonal looks
```

## Asset credits

All from Poly Haven, licensed CC0: island_tree_02, tree_small_02, jacaranda_tree, fir_sapling,
quiver_tree_02, searsia_lucida, fern_02, shrub_02/03/04, flower_gazania, dandelion_01,
periwinkle_plant, rock_07, rock_moss_set_01, tree_stump_01, grass_medium_01; textures forrest_ground_01,
leaves_forest_ground, dirt_floor, dry_river_pebbles, bark_willow_02, bark_brown_02, eucalyptus_bark; HDRIs
kloofendal_misty_morning_puresky, qwantani_mid_morning_puresky, belfast_sunset_puresky and
qwantani_moon_noon_puresky.

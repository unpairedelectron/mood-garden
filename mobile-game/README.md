# Mood Garden — mobile game

Plant a forest from how you feel, then walk through it. Built for phones: first-person, one thumb to walk,
drag to look.

## How it plays

1. **Walk** the clearing with the left stick; drag anywhere to look around.
2. **Tap Plant** and say how you feel (Joy, Calm, Love, Hope, Courage or Sorrow), with a few words if you like.
   A tree of that feeling is planted a few paces ahead. Each feeling grows a different species.
3. **It grows on its own** — about five minutes to full size, and it keeps growing while the app is closed.
4. **The forest fills itself in.** Ferns, shrubs and flowers appear around each tree as it matures, and leaf
   litter replaces grass beneath it. You never place these.
5. **Wildlife arrives when the forest suits it**:

   | Creature | Arrives when |
   | --- | --- |
   | Butterflies | two trees are grown, or one flowering tree |
   | Bees | a flowering tree (Love or Sorrow) is grown |
   | Crickets | two trees are grown (heard after dark) |
   | Fireflies | three trees are grown (seen at night) |
   | Songbirds | four trees are grown |
   | A passing flock | six grown trees of at least three kinds |

Stand in front of a tree to see what you felt and wrote when you planted it. The menu lists who lives in your
grove and what would attract the next arrival. The sky overhead is chosen by your phone's clock (misty
morning, day, sunset, moonlit night) and the music adds an instrument for each kind of feeling that has grown.

## How it looks the way it does

The visuals come from photo-scanned, CC0 assets from [Poly Haven](https://polyhaven.com):

- **Trees** are scans of 80 thousand to 3.9 million triangles each, far too heavy for a phone. `tools/bake.ts`
  renders each one from eight directions into an *impostor atlas* (colour, surface normals and a sky-exposure
  map). In game a tree is one quad that picks and blends the two nearest views and is re-lit by the current
  sun and sky, so it costs two triangles and still casts a correct shadow.
- **Ferns, shrubs, flowers, rocks, stumps and grass** are the real scanned meshes, simplified and
  meshopt-compressed, drawn with GPU instancing.
- **Sky and lighting** are HDRI photographs: the sky you see is the photo, the same image lights the scene, and
  the sun direction, fog colour and ambient colour are measured from it.
- **Ground** is scanned PBR texture, sampled at two scales to hide tiling.

All of it is about 15 MB. The limits are real: trees are flat cards, so they look best from a few metres away
and less convincing when you stand directly under one, and there are no mammals because no free, animated,
photoreal animal models were available to me (insects and birds are procedural).

## Run it

```bash
npm install
npm run dev
```

The dev server prints a network address; open it on a phone on the same Wi-Fi. Add `?hour=17.5` to preview a
time of day.

```bash
npm run build
```

`dist/` is a static site. Host it over HTTPS and use "Add to Home Screen" for a full-screen, offline-capable
install, or wrap the folder with Capacitor for store builds.

### Re-baking trees

Download a Poly Haven model's glTF into `tools/raw/<asset>/`, start the dev server on port 5197, then:

```bash
node tools/bake.mjs <asset>
```

This writes `<asset>_albedo.webp`, `<asset>_normal.webp` and `<asset>.json` into `public/assets/trees/`.
It needs Playwright with Chromium available.

## Source

```
src/
├── main.ts      # HUD, sheets, joystick, boot
├── world.ts     # renderer, HDRI lighting, ground, walking, frame loop
├── forest.ts    # impostor trees, instanced understory and grass
├── life.ts      # wildlife and the conditions that bring it
├── terrain.ts   # height field
├── state.ts     # save data and away-time growth
├── audio.ts     # synthesised score and sound
└── moods.ts     # the six feelings and their trees
tools/           # offline impostor baker (not shipped)
public/assets/   # baked trees, optimised models, skies, ground textures
```

## Asset credits

All from Poly Haven, licensed CC0: island_tree_02, tree_small_02, jacaranda_tree, fir_sapling,
quiver_tree_02, searsia_lucida, fern_02, shrub_02/03/04, flower_gazania, dandelion_01,
periwinkle_plant, rock_07, rock_moss_set_01, tree_stump_01, grass_medium_01; textures forrest_ground_01
and leaves_forest_ground; HDRIs kloofendal_misty_morning_puresky, qwantani_mid_morning_puresky,
belfast_sunset_puresky and qwantani_moon_noon_puresky.

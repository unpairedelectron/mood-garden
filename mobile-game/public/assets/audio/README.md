# Recordings and score

Mood Garden is built to be carried by real field recordings and a composed score. Drop files in this folder
and list them in `manifest.json` (copy `manifest.example.json`). Nothing else changes: each slot that has a
recording plays it, and every slot without one keeps its synthesised stand-in, so you can add sound a piece at
a time. Recordings were not bundled because none could be sourced with a licence that is clean for a paid app
from the environment this was built in.

## Formats

- `.m4a` (AAC, 128–160 kbps) plays everywhere including iOS; `.ogg` (Opus/Vorbis) is smaller but not on older
  iOS. Use `.m4a` unless you ship per-platform builds.
- Beds: stereo, 60–180 s, **seamless loops** (crossfade the ends), peaks around −12 dBFS, no obvious one-off
  events (a dog bark every 90 s becomes the thing people hear).
- One-shots (birds, footsteps): mono, trimmed tight, 2–5 variations each so repeats are not noticed. The game
  varies pitch ±5% and level ±15%.
- Keep the whole folder under ~25 MB for a reasonable install.

## Slots

| Slot | What it wants |
| --- | --- |
| `beds.dawn` | Dawn chorus in open woodland, many birds at a distance, very little wind. |
| `beds.day` | Midday meadow and woodland edge: insects, distant birds, light air. |
| `beds.dusk` | Evening: fewer birds, a blackbird or robin, settling quiet. |
| `beds.night` | Night: crickets (summer), a soft breeze, nothing sudden. The game adds an occasional owl. |
| `beds.wind_canopy` | Wind moving through leafy trees, recorded under a canopy. Level follows gusts and weather. |
| `beds.rain_light` | Light steady rain on open grass. |
| `beds.rain_leaves` | Rain falling on leaves overhead, recorded under trees. Faded in when you stand under canopy. |
| `beds.stream` | A small shallow brook, close-miked, babbling over stones. Faded by distance to the stream. |
| `beds.pond` | Still water: faint lapping, perhaps frogs. Faded by distance to the pond. |
| `beds.snow` | Muffled winter quiet, very low wind. |
| `birds.<species>` | Songs and calls per species with the hours they sing (see below). Perched birds in the game are robin, bluetit, goldfinch and blackbird, and sing from where they sit, so give those four at least. |
| `steps.grass/leaves/path/water/snow/stone` | Single footsteps on each surface, walking pace. |
| `score.stems` | A composed score in stems: `pad` (always plays) and one layer per feeling (`joy`, `calm`, `love`, `hope`, `courage`, `sorrow`) that fades in once a tree of that feeling has grown. All stems the same length and tempo so they loop in sync; 2–4 minutes; calm, sparse, no strong downbeat. |

Birds also play in the background by hour: give each species `hours` like `[[4.5, 10], [16, 21]]` (wraps past
midnight, e.g. `[[20, 5]]` for an owl) and optionally `seasons`.

## Where to get it (licences matter)

- **Commission** a field recordist and a composer. This is the best route for a calm game whose sound is half
  the experience: you get exactly the beds above, recorded together, with a clear buy-out licence.
- **Sonniss GDC bundles** (royalty-free, commercial use allowed) have good ambiences and footsteps.
- **Freesound** filtered to **CC0** only. Many Freesound files are CC-BY (credit required) or CC-BY-NC
  (not allowed in a paid app). Check every file.
- **xeno-canto** has excellent birdsong by species, but most recordings are **CC BY-NC-SA**: not usable in a
  commercial app without the recordist's written permission. Ask them; many say yes.
- Commercial libraries (Pro Sound Effects, BOOM, Soundly) are clean if your licence covers app distribution.

Keep a `CREDITS.md` here listing each file, its source and licence.

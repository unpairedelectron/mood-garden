# Animal model pack

Deer and the dusk fox have full behaviour in `src/fauna.ts`, but they are only shown when rigged, animated
models are installed here. Photoreal animals cannot be generated procedurally, and no free, licence-clean,
photoreal animated deer or fox was available, so this folder ships empty. Without it the game runs normally
and the deer and fox are simply left out (they do not appear in the menu either).

## What to add

1. A licensed, rigged and animated glTF/GLB per animal (for example from a commercial wildlife pack, or a
   commission). Keep each under ~3 MB: decimate to roughly 8–15k triangles, 1k textures, and compress with
   `gltf-transform optimize --compress meshopt`.
2. A `manifest.json` in this folder:

```json
{
  "deer": {
    "file": "deer.glb",
    "scale": 1.0,
    "yaw": 0,
    "clips": {
      "idle": "Idle",
      "graze": "Eating",
      "walk": "Walk",
      "trot": "Trot",
      "run": "Gallop",
      "alert": "Idle_LookAround"
    },
    "speeds": { "walk": 1.1, "trot": 2.6, "run": 9 }
  },
  "fox": {
    "file": "fox.glb",
    "scale": 1.0,
    "clips": { "idle": "Idle", "walk": "Walk", "trot": "Trot", "run": "Run", "sit": "Sit", "sniff": "Sniff" },
    "speeds": { "walk": 1.2, "trot": 2.8, "run": 7.5 }
  }
}
```

- `scale` brings the model to real size in metres (a red deer stands ~1.1 m at the shoulder, a fox ~0.4 m).
- `yaw` turns the model so its nose points along +Z.
- `clips` maps each behaviour to the animation name inside the file. Missing clips fall back
  (sniff → graze → idle, trot → walk, run → trot, alert/sit → idle).
- `speeds` is the ground speed each moving clip was authored for; playback rate follows the animal's real
  speed so feet do not slide.

## When they appear

- **Deer**: eight grown trees, two of them broadleaf (Joy, Calm or Love). A herd of one to three walks in from
  the edge at dawn or dusk (sometimes by day), grazes near the broadleaf trees, lifts its heads and watches if
  you move nearby, bolts if you come within ~9 m or run, and wanders off after a few minutes.
- **Fox**: ten grown trees and at least one thicket (Sorrow or Hope) for cover, around dusk. It trots between
  spots, sniffs, sits and watches, and slips away if you come within ~7 m.

Test the behaviour without models by adding `?proxyanimals` to the URL (simple stand-in bodies).

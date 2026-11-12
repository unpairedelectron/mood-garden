# MoodGarden: Should we build it, and how could it make money?

*Written November 2026.*

## TL;DR

**Yes, build it, but not as "another mood tracker".** The "your mood grows plants" idea is already
common, and one competitor (Finch) earns a lot of money in the space next door. MoodGarden only
has a chance if it is **a cozy collecting game first and a mood journal second**. The new `app/`
is built that way.

## 1. The market

| App | What it is | Why it matters to us |
|---|---|---|
| **Finch: Self-Care Pet** | You raise a bird by doing self-care | The proof this works. Trackers estimate about **$1M a month** in revenue, 40M+ installs and a 4.9★ rating. It charges $39.99–$69.99 a year. |
| **Daylio** | Quick mood and activity journal | The standard for low-effort check-ins. It is useful but not exciting. |
| **How We Feel** | A free mood journal backed by research | Free and polished, so we can't win by just tracking moods. |
| **VibyGarden, Blooml, "Mood Garden" (several), MindGarden, MoodSprout** | Mood → plant apps | **The exact idea is crowded**, mostly with small iOS-only apps. Few of them are on Android, and few have real game depth. |

**What this means:**
- The demand is real. People pay for self-care that is cute and kind (Finch shows this).
- "Mood tracker where plants grow" on its own is **not a differentiator** any more. Several apps
  already use the name "Mood Garden". **Pick a more distinctive store name** (ideas: *Feelbloom*,
  *Bloomkeeper*, *Weather Inside*, *Petal Diary*) and keep "mood garden" as a keyword.
- Android has fewer of these apps than iOS. That is the opening.

## 2. What makes this version different (built in `app/`)

1. **"Every feeling grows something, even the hard ones."** Sad days grow Rain Lilies and angry days
   grow Ember Cacti. No feeling is a "bad" plant. That emotional hook is the pitch for marketing and the store listing.
2. **Hybrids (a collecting game).** Log two feelings in a day to grow rare plants:
   Anxious + Calm → *Eye-of-Storm Clover*, Sad + Grateful → *Bittersweet Bouquet*, and 8 more.
   This rewards honest, mixed check-ins and gives people a reason to explore.
3. **The Seed Almanac** has 26 species (12 common, 10 rare, 4 legendary). Undiscovered ones show only a hint.
   Filling the collection is the main reason to keep coming back.
4. **Nothing ever dies.** A check-in waters every sprout, and plants bloom after 3 check-in days.
   Missed days cost nothing. This avoids the guilt that makes people uninstall wellness apps.
5. **A memory garden.** Tap any plant to see the day and the note it grew from.
6. **Critters that visit** (bee, butterfly, ladybug, bird, turtle, fireflies), unlocked by milestones.
7. **Dew economy + decorations + biomes**, which give natural spots for cosmetic paid upgrades.
8. **Calm corner.** A one-minute breathing exercise where a flower opens as you breathe in.
9. **Private by design.** Fully offline, no account. This is a strong trust signal and keeps
   Play Store data-safety answers simple. It also means **no server costs**.

## 3. How it makes money

The core loop is free forever. Paid features only add beauty, never pressure.

| Stream | Price (to test) | Notes |
|---|---|---|
| **Garden+ subscription** | $2.99/mo or $19.99/yr with a 7-day trial | Biomes, cozy decoration set, monthly seasonal seed pack, postcards/export. The paywall UI exists; billing is a stub. |
| **Seasonal seed packs (one-time)** | $0.99–$2.99 | For people who don't subscribe. Limited-time species (Halloween, Diwali, Spring). |
| **No ads** | – | Ads in a wellness app damage trust and ratings. Skip them. |

**Realistic expectations.** Most indie apps make close to $0. A reasonable *good* outcome is 50k
installs in year one, 2–4% of active users paying, and roughly **$500–$3,000 a month**. Finch-level
revenue needed years and a team. Treat the first 3 months as a test of retention:
**if fewer than 25% of users come back on day 7, change the core loop before spending on marketing.**

## 4. Launch checklist (Google Play)

1. **Developer account** ($25 one-time). New personal accounts must run a **closed test with
   at least 12 testers for 14 days** before production. Line up the testers early (friends, a Reddit or Discord community).
2. **Billing:** add `react-native-purchases` (RevenueCat, free under $2.5k/month) or `expo-iap`,
   then replace the preview toggle in `app/src/screens/PlusScreen.tsx`. This needs a dev build
   (`eas build`), not Expo Go.
3. **Daily reminder notification** (`expo-notifications`). This is the biggest single retention lever, so make it the next feature.
4. **Health app policy:** fill in the Health apps declaration and say clearly that this is not a
   medical device. A disclaimer and crisis-line link are already in the Journey tab.
5. **Data safety form:** "No data collected" stays true while the app is offline-only.
6. **Store listing:** 6–8 screenshots showing the *planting celebration*, a *rare hybrid*, and the
   *almanac*. Make a 15-second video of a sad check-in turning into a beautiful Rain Lily.
7. Build: `cd app && npx eas build -p android --profile production`, then
   `npx eas submit -p android`.

## 5. Growth ideas (after launch)

- **Shareable "garden postcards"** for TikTok and Instagram. Cozy-game audiences share a lot.
- **Seasonal events** (a limited species each month). This drives return visits and seed-pack sales.
- **Home-screen widget** showing today's garden (it reminds people without a notification).
- **Friend gardens:** send a seed to a friend. Add this later; it needs a backend.
- Optional on-device AI reflection on notes. Keep it private and opt-in.

## 6. Cleanup in the old code

- `backend/.env` is **committed to git**. If it held real keys (MongoDB or OpenAI), **rotate them**,
  then remove the file from git and add it to `.gitignore`.
- `src/`, `mobile/`, `backend/` and the many `*_PROGRESS.md` files are the old prototypes. They
  include simulated smartwatch data and a backend the app doesn't need. `app/` is meant to be the
  single app you ship. Archive the rest once you're happy with it.

### Sources
- Finch estimates: [Adapty](https://adapty.io/paywall-library/finch/), [AppGoblin](https://appgoblin.info/apps/1528595748), [FoxData](https://foxdata.com/en/blogs/finch-as-app-store-editors-choice-a-self-care-companion/)
- Similar apps: [VibyGarden](https://appadvice.com/app/vibygarden/6740879137), [Blooml](https://apps.apple.com/app/id6757379143), [MoodGarden (Stress Watch)](https://apps.apple.com/app/id6747953494), [MindGarden](https://spark.mwm.ai/en/apps/mindgarden-mindful-meditation/1588582890)

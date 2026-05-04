# How streaks work 🔥

The streak counter is the single most-asked thing on the support chat, so here's
the full set of rules in one place.

## What counts as a "day"

A streak day = at least one **completed** quest between 00:00 and 23:59 in your
local timezone. We use your wallet's first connection timezone as the anchor —
travel doesn't break it.

## How streaks grow

```
day 1  ✅       streak = 1
day 2  ✅       streak = 2
day 3  ✅       streak = 3   (level up: Bronze → Silver)
…
day 7  ✅       streak = 7   (badge unlock 🥉)
```

A quest is "completed" when the on-chain action you accepted is detected by the
crank — usually within 30 seconds of you signing.

## How streaks break

- **One missed day** → streak resets to 0 the next morning (00:00 your tz)
- **Skipping** a quest = does not break the streak by itself, only missing the
  day entirely

## The shield 🛡

You get **one shield per ISO week** that auto-saves a missed day. It's free —
no opt-in needed.

```
   mon  tue  wed  thu  fri  sat  sun
   ✅   ✅   ✅   ❌   ✅   ✅   ✅      (shield used on thu)
   streak stays alive at 6
```

If you miss two days in the same week, the second one breaks the streak.

## Frozen streaks

Travelling without internet for ≥ 3 days? Open the app, tap *Settings → Freeze
Streak* and pause for up to 7 days. Resumes where you left off.

## Edge cases

- **Multiple completions in one day** → still one streak day, but the level path
  earns extra XP per quest
- **Wrong network** → quests on mainnet don't count (we're devnet during the
  hackathon); you'll see a warm warning before signing
- **Wallet rotated** → import the old streak via *Settings → Restore* if you
  still have the seed

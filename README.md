# SolCoach Autopilot

Your AI-powered DeFi coach on Solana. Daily tasks. Streaks. Level up your on-chain game.

---

## How It Works

1. **Connect your wallet** 🪪 — SolCoach takes a friendly peek at your on-chain history (read-only, never custodial)
2. **Pick your role** 🌱 — quick onboarding quiz puts you on a learning path that matches your style (degen, builder, saver, etc.)
3. **Get your daily quest** 🎯 — personalized DeFi action that fits your level, with a real on-chain verification step
4. **Complete it & extend the streak** 🔥 — Streak Shield grows, calendar marks the day, the coach drops a tiny celebration
5. **Level up** 🪜 — DeFi Newbie → Curious Explorer → Yield Hunter → Protocol Pro → Solana Sensei
6. **Ask the coach anything** 💬 — built-in chat (Claude Haiku) explains concepts in plain language whenever you're stuck

> Miss a day? The shield cracks but doesn't shatter — first miss = warning, second miss = streak resets. Be kind to yourself, just show up tomorrow.

## What kind of tasks?

- "Swap 0.1 SOL to USDC on Jupiter"
- "Stake 1 SOL with Marinade"
- "Provide liquidity to a Raydium pool"
- "Mint a compressed NFT"
- Tasks get harder as you level up!

## Tech Stack

- **Smart Contracts**: Anchor (streak tracking, achievements on-chain)
- **Frontend**: Vite + React + Chakra UI
- **AI Engine**: Python/FastAPI + Claude API
- **Font**: Nunito
- **Design**: Warm gradients, mobile-first, gamified

## Getting Started

```bash
# Smart contracts
anchor build && anchor deploy

# AI backend
cd ai && pip install -r requirements.txt && uvicorn main:app --reload

# Frontend
cd app && npm install && npm run dev
```

## GIF Demos

> Coming soon! Drop yours into `docs/gifs/` and link them below 📸

| flow | preview |
|---|---|
| onboarding quiz → first quest | _docs/gifs/onboarding.gif_ |
| accept quest → verify on-chain → streak +1 | _docs/gifs/streak.gif_ |
| weekly calendar fill animation | _docs/gifs/calendar.gif_ |

## License

MIT

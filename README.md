# SolCoach Autopilot

Your AI-powered DeFi coach on Solana. Daily tasks. Streaks. Level up your on-chain game.

---

## How It Works

1. **Connect your wallet** - SolCoach analyzes your on-chain history
2. **Get your daily task** - Personalized DeFi actions based on your level
3. **Complete & earn streaks** - Duolingo-style streak counter keeps you coming back
4. **Level up** - From DeFi Newbie to Solana Sensei

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

> Coming soon - stay tuned!

## License

MIT

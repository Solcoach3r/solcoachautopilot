// Friendly micro-copy used by the coach when nudging the user. Pulled at random
// — no two days in a row should feel exactly the same.

export const QUEST_ACCEPT_PHRASES = [
  "let's do this 💪",
  "you got this!",
  "first move of the day 🌱",
  "queueing it up — go for it",
  "small win incoming 🎯",
  "here we go 🚀",
] as const

export const STREAK_PROTECTED_PHRASES = [
  "shield used — your streak is safe 🛡",
  "saved you this time! shield refreshes monday",
  "streak alive thanks to today's shield",
  "phew — shield caught it",
] as const

export const QUEST_COMPLETE_PHRASES = [
  "nice work 🔥",
  "another one down 💪",
  "streak fed!",
  "+1 on-chain ✨",
  "you're stacking days like a pro",
  "boom 🎉",
] as const

export const STREAK_BROKEN_PHRASES = [
  "stuff happens — a fresh streak starts tomorrow 🌱",
  "no worries, the journey is the win",
  "back to day 1 — you've done it before",
  "reset, refocus, restart 💪",
] as const

export const LEVEL_UP_PHRASES = [
  "level up! ⬆️",
  "new badge unlocked 🥉",
  "you grew — keep going",
  "tier up 🌟",
  "promoted on-chain 🎓",
] as const

export function pick<T>(list: readonly T[], seed?: number): T {
  if (seed !== undefined) {
    return list[seed % list.length]
  }
  return list[Math.floor(Math.random() * list.length)]
}

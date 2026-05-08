import { useEffect, useState, useCallback } from 'react'
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import {
  Box, VStack, Heading, Text, Button, HStack, Badge,
  Flex, Spinner, useToast, SimpleGrid, Circle,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { motion, AnimatePresence } from 'framer-motion'

import idl from '../lib/idl.json'
import OnboardingQuiz from '../components/OnboardingQuiz'

/* Auto-link URLs and domains in text — CRITICAL FIX: no /g flag on test regex */
function LinkedText({ children }: { children: string }) {
  const splitRe = /\b((?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s)]*)?)/g
  const testRe = /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/  // no /g — stateless
  const parts = children.split(splitRe)
  return (
    <>
      {parts.map((part, i) => {
        if (testRe.test(part)) {
          const href = part.startsWith('http') ? part : `https://${part}`
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer"
              style={{ color: '#ea580c', fontWeight: 600, textDecoration: 'underline', textDecorationColor: '#fed7aa', textUnderlineOffset: '2px' }}>
              {part}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

const MotionBox = motion(Box as any)
const MotionFlex = motion(Flex as any)

const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID || 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU'
const PROGRAM_KEY = new PublicKey(PROGRAM_ID)
const PROFILE_SEED = new TextEncoder().encode('coach_profile')
const CONFIG_SEED = new TextEncoder().encode('coach_config')
const TASK_SEED = new TextEncoder().encode('task')

interface ProfileData { currentStreak: number; bestStreak: number; tasksAccepted: number; tasksRejected: number; totalTips: number; level: number }
interface TaskData { taskType: string; protocol: string; description: string; reasoning: string; suggestedAmount: number; status: 'Pending' | 'Accepted' | 'Rejected' | 'Expired' | 'Resolved'; isDemo?: boolean; verifyProgramId?: string; guide?: string[] }

const TASK_TYPES = ['Stake', 'Unstake', 'Swap', 'Rebalance', 'Claim Rewards', 'Add Liquidity']
const TASK_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Expired', 'Resolved']

const QUEST_COLORS: Record<string, string> = {
  Stake: '#8B5CF6', Unstake: '#8B5CF6', Swap: '#3B82F6',
  'Add Liquidity': '#EC4899', 'Claim Rewards': '#14B8A6', Rebalance: '#F59E0B',
}

/* ─── Animated flame SVG ─── */
const dotPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.4); }
`

const flameFloat = keyframes`
  0%, 100% { transform: scaleY(1) translateY(0); }
  50% { transform: scaleY(1.08) translateY(-2px); }
`
const flameGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 6px rgba(249,115,22,0.5)); }
  50% { filter: drop-shadow(0 0 16px rgba(249,115,22,0.8)) drop-shadow(0 0 30px rgba(249,115,22,0.3)); }
`

function FlameIcon({ size = 40 }: { size?: number }) {
  return (
    <Box animation={`${flameFloat} 2s ease-in-out infinite, ${flameGlow} 2s ease-in-out infinite`} lineHeight={0}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8 7 4 10 4 14.5C4 18.64 7.58 22 12 22C16.42 22 20 18.64 20 14.5C20 10 16 7 12 2Z"
          fill="url(#fg)" />
        <path d="M12 9C10 12 8.5 13.5 8.5 15.5C8.5 17.43 10.07 19 12 19C13.93 19 15.5 17.43 15.5 15.5C15.5 13.5 14 12 12 9Z"
          fill="url(#fi)" />
        <defs>
          <linearGradient id="fg" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" /><stop offset="1" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="fi" x1="12" y1="9" x2="12" y2="19" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF08A" /><stop offset="1" stopColor="#FB923C" />
          </linearGradient>
        </defs>
      </svg>
    </Box>
  )
}

/* ─── Streak Shield ─── */
function StreakShield({ streak }: { streak: number }) {
  const tier = streak >= 14 ? 'gold' : streak >= 7 ? 'silver' : streak >= 3 ? 'bronze' : 'none'
  const borderColor = tier === 'gold' ? '#FFD700' : tier === 'silver' ? '#C0C0C0' : tier === 'bronze' ? '#CD7F32' : 'transparent'
  const glowColor = tier === 'gold' ? 'rgba(255,215,0,0.3)' : tier === 'silver' ? 'rgba(192,192,192,0.2)' : tier === 'bronze' ? 'rgba(205,127,50,0.2)' : 'none'

  return (
    <MotionFlex
      direction="column" align="center" justify="center"
      bg="white" borderRadius="24px" p={6} minW="180px"
      border="3px solid" borderColor={borderColor}
      boxShadow={tier !== 'none' ? `0 0 30px ${glowColor}, 0 4px 20px rgba(0,0,0,0.04)` : '0 4px 20px rgba(0,0,0,0.04)'}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
    >
      {streak > 0 ? <FlameIcon size={48} /> : <Text fontSize="3xl">❄️</Text>}
      <Text fontSize="4xl" fontWeight={800} color="brand.600" mt={1} lineHeight={1}>
        {streak}
      </Text>
      <Text fontSize="xs" fontWeight={700} color="gray.400" textTransform="uppercase" letterSpacing="1px" mt={1}>
        day streak
      </Text>
      {tier !== 'none' && (
        <Badge mt={2} bg={`${borderColor}22`} color={borderColor} fontSize="2xs" px={2} borderRadius="full"
          border="1px solid" borderColor={borderColor} textTransform="uppercase" fontWeight={800}>
          {tier} shield
        </Badge>
      )}
    </MotionFlex>
  )
}

/* ─── Weekly Calendar ─── */
function WeeklyCalendar({ streak }: { streak: number }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay() // 0=Sun
  const todayIdx = today === 0 ? 6 : today - 1 // 0=Mon

  return (
    <HStack spacing={2} justify="center">
      {days.map((d, i) => {
        const isToday = i === todayIdx
        const isCompleted = i < todayIdx && i >= Math.max(0, todayIdx - streak)
        const isFuture = i > todayIdx
        return (
          <VStack key={i} spacing={1}>
            <Text fontSize="2xs" fontWeight={600} color="gray.400">{d}</Text>
            <Circle
              size="28px"
              bg={isCompleted ? 'green.400' : isToday ? 'brand.500' : 'gray.100'}
              color={isCompleted || isToday ? 'white' : 'gray.300'}
              fontSize="xs" fontWeight={700}
              border={isToday ? '2px solid' : 'none'}
              borderColor={isToday ? 'brand.300' : 'transparent'}
              boxShadow={isToday ? '0 0 12px rgba(249,115,22,0.3)' : isCompleted ? '0 0 8px rgba(34,197,94,0.2)' : 'none'}
            >
              {isCompleted ? '✓' : isFuture ? '' : isToday ? '●' : ''}
            </Circle>
          </VStack>
        )
      })}
    </HStack>
  )
}

/* ─── Countdown Ring ─── */
function CountdownRing() {
  const [pct, setPct] = useState(100)
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const diff = (endOfDay.getTime() - now.getTime()) / 1000
      const total = 86400
      setPct((diff / total) * 100)
      setUrgent(diff < 4 * 3600)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      setLabel(`${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  const color = urgent ? '#EF4444' : '#f97316'
  const r = 32; const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)

  return (
    <VStack spacing={0}>
      <Box position="relative" w="76px" h="76px">
        <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="38" cy="38" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <Flex position="absolute" inset={0} align="center" justify="center">
          <Text fontSize="xs" fontWeight={800} color={urgent ? 'red.500' : 'brand.600'}>{label}</Text>
        </Flex>
      </Box>
      <Text fontSize="2xs" color="gray.400" fontWeight={600}>time left</Text>
    </VStack>
  )
}

/* ─── Level Path ─── */
function LevelPath({ completed, total = 5, level }: { completed: number; total?: number; level: number }) {
  const done = completed % total
  return (
    <VStack spacing={2}>
      <HStack spacing={0} justify="center">
        <Text fontSize="xs" fontWeight={800} color="brand.600">Lv.{level}</Text>
      </HStack>
      <HStack spacing={2}>
        {Array.from({ length: total }).map((_, i) => (
          <Box key={i} position="relative">
            <Circle
              size="24px"
              bg={i < done ? 'brand.500' : i === done ? 'brand.100' : 'gray.100'}
              border="2px solid"
              borderColor={i < done ? 'brand.500' : i === done ? 'brand.400' : 'gray.200'}
              boxShadow={i === done ? '0 0 10px rgba(249,115,22,0.3)' : 'none'}
            >
              {i < done && <Text fontSize="2xs" color="white" fontWeight={800}>✓</Text>}
              {i === done && (
                <Box w="6px" h="6px" borderRadius="50%" bg="brand.400"
                  animation={`${dotPulse} 1.5s ease-in-out infinite`} />
              )}
            </Circle>
            {i < total - 1 && (
              <Box position="absolute" right="-10px" top="50%" transform="translateY(-50%)"
                w="8px" h="2px" bg={i < done ? 'brand.300' : 'gray.200'} />
            )}
          </Box>
        ))}
      </HStack>
      <Text fontSize="2xs" color="gray.400" fontWeight={600}>{total - done} tasks to Lv.{level + 1}</Text>
    </VStack>
  )
}

/* ─── Stat Chip ─── */
function StatChip({ icon, value, label, bg }: { icon: string; value: string; label: string; bg: string }) {
  return (
    <MotionBox
      bg="white" borderRadius="16px" p={3} textAlign="center"
      boxShadow="0 2px 12px rgba(0,0,0,0.03)"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      <Circle size="32px" bg={bg} mx="auto" mb={1}>
        <Text fontSize="sm">{icon}</Text>
      </Circle>
      <Text fontSize="lg" fontWeight={800} color="gray.700">{value}</Text>
      <Text fontSize="2xs" color="gray.400" fontWeight={600} textTransform="uppercase" letterSpacing="0.5px">{label}</Text>
    </MotionBox>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  HOME PAGE                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function HomePage() {
  const { publicKey } = useWallet()
  const anchorWallet = useAnchorWallet()
  const { connection } = useConnection()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [hasProfile, setHasProfile] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)
  const [task, setTask] = useState<TaskData | null>(null)
  const [taskDayTs, setTaskDayTs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [verified, setVerified] = useState(false)
  const toast = useToast()

  const [program, setProgram] = useState<Program | null>(null)
  useEffect(() => {
    if (!anchorWallet) { setProgram(null); return }
    const prov = new AnchorProvider(connection, anchorWallet, { preflightCommitment: 'confirmed' })
    setProgram(new Program(idl as any, prov))
  }, [connection, anchorWallet])

  const handleRegister = useCallback(async () => {
    if (!program || !publicKey) return
    setRegistering(true)
    try {
      const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_KEY)
      const [profilePda] = PublicKey.findProgramAddressSync([PROFILE_SEED, publicKey.toBuffer()], PROGRAM_KEY)
      await program.methods.registerUser({ moderate: {} }, 3)
        .accountsPartial({ config: configPda, profile: profilePda, user: publicKey, systemProgram: SystemProgram.programId })
        .rpc()
      toast({ title: 'Profile created! Welcome aboard ☀️', status: 'success', duration: 3000 })
      setHasProfile(true)
      loadData()
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      if (msg.includes('User rejected')) toast({ title: 'Transaction rejected', status: 'warning', duration: 2000 })
      else toast({ title: 'Registration failed', description: msg.slice(0, 80), status: 'error', duration: 3000 })
    } finally { setRegistering(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, publicKey, toast])

  const loadData = useCallback(async () => {
    if (!publicKey) { setProfile(null); setBalance(null); setTask(null); return }
    setLoading(true)
    try {
      const bal = await connection.getBalance(publicKey)
      setBalance(bal)

      try {
        const [profilePda] = PublicKey.findProgramAddressSync([PROFILE_SEED, publicKey.toBuffer()], PROGRAM_KEY)
        const info = await connection.getAccountInfo(profilePda)
        if (info) {
          const d = info.data
          let off = 8 + 32; off += 8; off += 8
          const tasksAccepted = Number(d.readBigUInt64LE(off)); off += 8
          const tasksRejected = Number(d.readBigUInt64LE(off)); off += 8
          const currentStreak = d.readUInt16LE(off); off += 2
          const bestStreak = d.readUInt16LE(off); off += 2
          const totalTips = Number(d.readBigUInt64LE(off)); off += 8
          const level = Math.floor(tasksAccepted / 5) + 1
          setProfile({ currentStreak, bestStreak, tasksAccepted, tasksRejected, totalTips, level })
          setHasProfile(true)
        } else { setHasProfile(false) }
      } catch { setHasProfile(false) }

      try {
        const baseDayTs = Math.floor(Date.now() / 1000 / 86400) * 86400
        let taskInfo = null; let usedDayTs = baseDayTs
        for (const offset of [0, -1, 1]) {
          const tryTs = baseDayTs + offset * 86400
          const buf = new Uint8Array(8)
          new DataView(buf.buffer).setBigInt64(0, BigInt(tryTs), true)
          const [pda] = PublicKey.findProgramAddressSync([TASK_SEED, publicKey.toBuffer(), buf], PROGRAM_KEY)
          const info = await connection.getAccountInfo(pda)
          if (info) { taskInfo = info; usedDayTs = tryTs; break }
        }
        if (taskInfo) {
          const d = taskInfo.data; let off = 8 + 32 + 8
          const taskTypeByte = d[off]; off += 1
          const protoLen = d.readUInt32LE(off); off += 4
          const protocol = d.subarray(off, off + protoLen).toString('utf8'); off += protoLen
          const descLen = d.readUInt32LE(off); off += 4
          const description = d.subarray(off, off + descLen).toString('utf8'); off += descLen
          const reasonLen = d.readUInt32LE(off); off += 4
          const reasoning = d.subarray(off, off + reasonLen).toString('utf8'); off += reasonLen
          const suggestedAmount = Number(d.readBigUInt64LE(off)); off += 8
          const mintTag = d[off]; off += 1; if (mintTag === 1) off += 32
          const statusByte = d[off]
          setTaskDayTs(usedDayTs)
          setTask({ taskType: TASK_TYPES[taskTypeByte] || 'Unknown', protocol, description, reasoning, suggestedAmount, status: TASK_STATUSES[statusByte] as TaskData['status'] || 'Pending' })
        } else {
          // Demo tasks — real Solana devnet programs
          const demos = [
            // ── Native Solana Programs ──
            {
              taskType: 'Stake', protocol: 'Solana Staking',
              description: 'Stake SOL using native Solana staking on devnet',
              reasoning: 'Native staking secures the Solana network and earns ~7% APY. Learning to delegate directly is a fundamental skill every DeFi user needs.',
              suggestedAmount: 1_000_000_000,
              verifyProgramId: 'Stake11111111111111111111111111111111111111',
              guide: [
                'Open your terminal and make sure Solana CLI is installed: solana --version',
                'Set network to devnet: solana config set --url devnet',
                'Create a stake account: solana create-stake-account stake-account.json 1 --from <KEYPAIR>',
                'Find a validator: solana validators --url devnet',
                'Delegate your stake: solana delegate-stake stake-account.json <VALIDATOR_VOTE_PUBKEY>',
                'Come back here and click "Verify Completion"',
              ],
            },
            {
              taskType: 'Swap', protocol: 'SPL Token',
              description: 'Create or transfer an SPL token on devnet',
              reasoning: 'SPL tokens power all of Solana DeFi — from USDC to governance tokens. Understanding token operations is step one.',
              suggestedAmount: 0,
              verifyProgramId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
              guide: [
                'Install SPL Token CLI: cargo install spl-token-cli (or use @solana/spl-token in JS)',
                'Create a new token mint: spl-token create-token --url devnet',
                'Create a token account: spl-token create-account <MINT_ADDRESS> --url devnet',
                'Mint some tokens: spl-token mint <MINT_ADDRESS> 100 --url devnet',
                'Optionally transfer to another wallet: spl-token transfer <MINT> 10 <RECIPIENT> --url devnet',
                'Come back and verify — any SPL Token interaction counts!',
              ],
            },
            {
              taskType: 'Claim Rewards', protocol: 'Solana Memo',
              description: 'Write an on-chain memo — leave your mark on Solana forever',
              reasoning: 'The Memo program attaches permanent messages to transactions. DeFi protocols use memos for order IDs, payment references, and audit trails.',
              suggestedAmount: 0,
              verifyProgramId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
              guide: [
                'You can send a memo via CLI or any Solana dApp that supports it',
                'CLI method: install spl-memo, then run: spl-memo "Hello from SolCoach!" --url devnet',
                'JS method: add a TransactionInstruction with programId = MemoSq4g... and data = your message as UTF-8 bytes',
                'The memo will be permanently recorded on-chain in the transaction logs',
                'After sending, come back and click "Verify Completion"',
              ],
            },
            {
              taskType: 'Add Liquidity', protocol: 'Token-2022',
              description: 'Interact with a Token-2022 (Token Extensions) asset',
              reasoning: 'Token-2022 brings transfer fees, interest-bearing tokens, and confidential transfers. This is the future standard for Solana tokens.',
              suggestedAmount: 0,
              verifyProgramId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
              guide: [
                'Token-2022 is the next-gen SPL Token program with built-in extensions',
                'Create a Token-2022 mint: spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --url devnet',
                'Add extensions like transfer fee: --enable-transfer-fee flag during creation',
                'Create account + mint tokens the same way as regular SPL tokens',
                'Any interaction with the Token-2022 program ID will count for verification',
              ],
            },
            {
              taskType: 'Swap', protocol: 'Associated Token',
              description: 'Create an Associated Token Account for a new mint',
              reasoning: 'Every token you hold needs an ATA. Understanding how token accounts work prevents failed transactions and lost funds.',
              suggestedAmount: 0,
              verifyProgramId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
              guide: [
                'An ATA is the default token account for your wallet + a specific mint',
                'First, find any SPL token mint on devnet (or create one with spl-token create-token)',
                'Create the ATA: spl-token create-account <MINT_ADDRESS> --url devnet',
                'This automatically derives and creates the associated account for your wallet',
                'Alternatively, any token receive or swap creates ATAs automatically',
                'Verify after the ATA creation transaction confirms',
              ],
            },
            {
              taskType: 'Claim Rewards', protocol: 'Metaplex',
              description: 'Create or update an NFT using Metaplex Token Metadata',
              reasoning: 'Metaplex powers 90% of Solana NFTs. Understanding metadata, collections, and creators opens up the NFT ecosystem.',
              suggestedAmount: 0,
              verifyProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
              guide: [
                'Install Metaplex Sugar CLI: bash <(curl -sSf https://sugar.metaplex.com/install.sh)',
                'Or use the JS SDK: npm install @metaplex-foundation/mpl-token-metadata',
                'Create a simple NFT: mint an SPL token with 0 decimals and supply of 1',
                'Attach metadata using createMetadataAccountV3 instruction with name, symbol, and URI',
                'The URI can point to any JSON file (Arweave, IPFS, or even a raw GitHub link)',
                'Once the metadata tx confirms, come back to verify',
              ],
            },
            // ── DeFi Protocols (devnet deployments) ──
            {
              taskType: 'Swap', protocol: 'Jupiter',
              description: 'Execute a token swap through Jupiter aggregator on devnet',
              reasoning: 'Jupiter routes your swap across every Solana DEX to find the best price. It handles 80%+ of all Solana swap volume.',
              suggestedAmount: 200_000_000,
              verifyProgramId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
              guide: [
                'Go to jup.ag and switch your wallet to devnet network',
                'Make sure you have devnet SOL (use solana airdrop 2 --url devnet)',
                'Select SOL as input and any available devnet token as output',
                'Enter an amount and click "Swap"',
                'Approve the transaction in your wallet',
                'After the swap confirms, come back and verify',
              ],
            },
            {
              taskType: 'Add Liquidity', protocol: 'Orca',
              description: 'Provide concentrated liquidity on an Orca Whirlpool',
              reasoning: 'Concentrated liquidity earns 2-10x more fees than standard pools. Orca Whirlpools are the go-to for LPs on Solana.',
              suggestedAmount: 500_000_000,
              verifyProgramId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
              guide: [
                'Go to orca.so and switch your wallet to devnet',
                'Navigate to the "Pools" section',
                'Find a pool with devnet liquidity (SOL/USDC is common)',
                'Click "Add Liquidity" and set your price range',
                'Deposit both tokens and confirm the transaction',
                'After confirmation, verify your quest here',
              ],
            },
            {
              taskType: 'Stake', protocol: 'Marinade',
              description: 'Stake SOL on Marinade Finance to receive mSOL',
              reasoning: 'Liquid staking with Marinade lets you earn ~7% APY while keeping your SOL usable in DeFi. mSOL is accepted everywhere.',
              suggestedAmount: 1_000_000_000,
              verifyProgramId: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
              guide: [
                'Go to marinade.finance and connect your wallet on devnet',
                'Enter the amount of SOL you want to stake (try 1 SOL)',
                'Click "Stake" — you will receive mSOL in return',
                'mSOL is a liquid staking token that earns yield automatically',
                'You can use mSOL in other DeFi protocols while earning staking rewards',
                'After the stake transaction confirms, come back and verify',
              ],
            },
            {
              taskType: 'Rebalance', protocol: 'Drift',
              description: 'Open a perpetual futures position on Drift Protocol',
              reasoning: 'Drift is the #1 perps DEX on Solana with $50B+ volume. Learning perpetuals gives you tools for hedging and leveraged exposure.',
              suggestedAmount: 500_000_000,
              verifyProgramId: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
              guide: [
                'Go to app.drift.trade and switch to devnet mode',
                'Connect your wallet and deposit devnet USDC as collateral',
                'Navigate to a perpetual market (SOL-PERP is the most liquid)',
                'Choose Long or Short and set your leverage (start with 2x)',
                'Enter your position size and click "Open Position"',
                'Approve the transaction — then come back and verify',
              ],
            },
            {
              taskType: 'Add Liquidity', protocol: 'Raydium',
              description: 'Add liquidity to a Raydium AMM pool on devnet',
              reasoning: 'Raydium is the largest AMM on Solana. Providing liquidity earns trading fees and often qualifies for reward incentives.',
              suggestedAmount: 500_000_000,
              verifyProgramId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
              guide: [
                'Go to raydium.io and switch your wallet to devnet',
                'Navigate to Liquidity → Add Liquidity',
                'Select a pool (SOL/USDC recommended for devnet)',
                'Enter the amount for both tokens (they must be balanced)',
                'Click "Supply" and approve the transaction in your wallet',
                'You will receive LP tokens representing your pool share',
                'After confirmation, verify your quest here',
              ],
            },
            {
              taskType: 'Claim Rewards', protocol: 'Pyth Network',
              description: 'Read a Pyth price feed oracle on devnet',
              reasoning: 'Pyth delivers real-time price data from 90+ publishers. Every serious DeFi protocol depends on Pyth for accurate pricing.',
              suggestedAmount: 0,
              verifyProgramId: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH',
              guide: [
                'Pyth price feeds are read-only — you query on-chain accounts for current prices',
                'Install: npm install @pythnetwork/pyth-solana-receiver',
                'Find devnet price feed IDs at pyth.network/developers/price-feed-ids',
                'SOL/USD devnet feed: use the Pyth Price Feed account on devnet',
                'Write a script that reads the price account using connection.getAccountInfo()',
                'Any transaction that includes the Pyth program will count for verification',
              ],
            },
            {
              taskType: 'Rebalance', protocol: 'Solana Name Service',
              description: 'Register or look up a .sol domain name on devnet',
              reasoning: 'SNS domains replace long wallet addresses with readable names. Your .sol domain works across wallets, explorers, and dApps.',
              suggestedAmount: 20_000_000,
              verifyProgramId: 'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX',
              guide: [
                'Go to sns.id (Solana Name Service) and switch wallet to devnet',
                'Search for an available .sol domain name',
                'Click "Register" and choose the registration period',
                'Approve the transaction — the domain will be linked to your wallet',
                'You can also use the CLI: sns register myname.sol --url devnet',
                'After registration confirms, come back and verify',
              ],
            },
            {
              taskType: 'Stake', protocol: 'Lookup Tables',
              description: 'Create an Address Lookup Table for versioned transactions',
              reasoning: 'Lookup tables compress transaction size by storing frequently used addresses. Essential for complex DeFi transactions with many accounts.',
              suggestedAmount: 0,
              verifyProgramId: 'AddressLookupTab1e1111111111111111111111111',
              guide: [
                'Lookup tables let you reference many accounts without bloating tx size',
                'CLI: solana create-address-lookup-table --url devnet',
                'Note the lookup table address that gets printed',
                'Extend it with addresses: solana extend-address-lookup-table <TABLE> <ADDR1> <ADDR2> --url devnet',
                'You can add any pubkeys — program IDs, token mints, popular accounts',
                'After the create transaction confirms, verify your quest here',
              ],
            },
          ]
          const dayIdx = Math.floor(Date.now() / 86400000) % demos.length
          const demo = demos[dayIdx]
          setTaskDayTs(baseDayTs)
          setTask({ ...demo, status: 'Pending', isDemo: true })
        }
      } catch { /* no task */ }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [publicKey, connection])

  useEffect(() => { loadData() }, [loadData])

  // Use on-chain profile data when available, fall back to localStorage for demo
  const localVerified = Number(localStorage.getItem('solcoach_verified') || '0') + (verified ? 1 : 0)
  const streak = profile ? profile.currentStreak : localVerified
  const bestStreak = profile ? profile.bestStreak : localVerified
  const tasksCompleted = profile ? profile.tasksAccepted : localVerified
  const level = profile ? profile.level : Math.floor(localVerified / 5) + 1

  const questColor = task ? (QUEST_COLORS[task.taskType] || '#f97316') : '#f97316'

  const handleAction = useCallback(async (action: 'accept' | 'reject') => {
    if (!publicKey) return
    setActionLoading(true)

    // Demo tasks — handle locally, no on-chain tx
    if (task?.isDemo) {
      await new Promise(r => setTimeout(r, 600)) // brief delay for UX
      if (action === 'accept') {
        setTask(prev => prev ? { ...prev, status: 'Accepted' } : null)
        toast({ title: 'Quest accepted! 🔥', description: 'Complete it to grow your streak', status: 'success', duration: 3000 })
      } else {
        setTask(prev => prev ? { ...prev, status: 'Rejected' } : null)
        toast({ title: 'Quest skipped', status: 'info', duration: 2000 })
      }
      setActionLoading(false)
      return
    }

    // Real on-chain tasks
    if (!program) { setActionLoading(false); return }
    try {
      const dayBuf = new Uint8Array(8); new DataView(dayBuf.buffer).setBigInt64(0, BigInt(taskDayTs), true)
      const [taskPda] = PublicKey.findProgramAddressSync([TASK_SEED, publicKey.toBuffer(), dayBuf], PROGRAM_KEY)
      const [profilePda] = PublicKey.findProgramAddressSync([PROFILE_SEED, publicKey.toBuffer()], PROGRAM_KEY)
      const method = action === 'accept' ? program.methods.acceptTask() : program.methods.rejectTask()
      await method.accountsPartial({ task: taskPda, profile: profilePda, user: publicKey }).rpc()
      toast({
        title: action === 'accept' ? 'Quest accepted! 🔥' : 'Quest skipped',
        description: action === 'accept' ? 'Complete it to grow your streak' : undefined,
        status: action === 'accept' ? 'success' : 'info',
        duration: 3000,
      })
      loadData()
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      if (msg.includes('User rejected')) toast({ title: 'Transaction rejected', status: 'warning', duration: 2000 })
      else toast({ title: 'Failed', description: msg.slice(0, 80), status: 'error', duration: 3000 })
    } finally { setActionLoading(false) }
  }, [program, publicKey, taskDayTs, toast, loadData, task])

  const handleVerify = useCallback(async () => {
    if (!publicKey || !connection) return
    setActionLoading(true)

    // Demo mode — check for interaction with the specific program
    if (task?.isDemo && task.verifyProgramId) {
      const targetProgram = task.verifyProgramId
      try {
        const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 20 })
        let found = null
        for (const s of sigs) {
          if (s.err) continue
          const age = Date.now() / 1000 - (s.blockTime || 0)
          if (age > 7 * 86400) break // within 7 days
          const tx = await connection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
          const usesProgram = tx?.transaction?.message?.instructions?.some(
            (ix: any) => ix.programId?.toBase58() === targetProgram
          )
          if (usesProgram) { found = s; break }
        }
        if (found) {
          setVerified(true)
          const prev = Number(localStorage.getItem('solcoach_verified') || '0')
          localStorage.setItem('solcoach_verified', String(prev + 1))
          toast({ title: 'Quest verified! ✅🎉', description: `Found ${task.protocol} tx: ${found.signature.slice(0, 16)}...`, status: 'success', duration: 4000 })
        } else {
          toast({
            title: `No ${task.protocol} activity found`,
            description: `Interact with ${task.protocol} on devnet first, then come back to verify`,
            status: 'warning', duration: 5000,
          })
        }
      } catch {
        toast({ title: 'Verification failed', description: 'Could not check transactions', status: 'error', duration: 3000 })
      }
      setActionLoading(false)
      return
    }

    try {
      const FLIPORDRAIN_ID = '8SXWVRBFoPCqbLZiDA9oY9EFbD9NVbU7SryoxJQt3ssG'
      const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 15 })
      let recentTx = null
      for (const s of sigs) {
        if (s.err) continue
        const age = Date.now() / 1000 - (s.blockTime || 0)
        if (age > 86400) break
        const tx = await connection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
        const usesFlip = tx?.transaction?.message?.instructions?.some((i: any) => i.programId?.toBase58() === FLIPORDRAIN_ID)
        if (usesFlip) { recentTx = s; break }
      }
      if (recentTx) {
        setVerified(true)
        const prev = Number(localStorage.getItem('solcoach_verified') || '0')
        localStorage.setItem('solcoach_verified', String(prev + 1))
        toast({ title: 'Quest verified! ✅🎉', description: `Found tx: ${recentTx.signature.slice(0, 16)}...`, status: 'success', duration: 4000 })
      } else {
        toast({ title: 'No activity found', description: 'Complete the quest first', status: 'warning', duration: 3000 })
      }
    } catch { toast({ title: 'Verification failed', status: 'error', duration: 2000 }) }
    finally { setActionLoading(false) }
  }, [publicKey, connection, toast, task])

  /* ─── RENDER ─── */

  // Show onboarding quiz when wallet not connected
  if (!publicKey) {
    return <OnboardingQuiz />
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Greeting + Streak Shield row */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <MotionBox initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
          <Heading size="lg" fontWeight={800}>
            Your Daily Quest
          </Heading>
          <Text color="gray.400" mt={1} fontSize="sm">
            Accept, complete, maintain your streak
          </Text>
        </MotionBox>
        <StreakShield streak={streak} />
      </Flex>

      {/* Weekly Calendar */}
      {publicKey && (
        <MotionBox bg="white" borderRadius="20px" p={4} boxShadow="0 2px 16px rgba(0,0,0,0.03)"
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Text fontSize="xs" fontWeight={700} color="gray.400" textTransform="uppercase" letterSpacing="1px" mb={3} textAlign="center">
            This Week
          </Text>
          <WeeklyCalendar streak={streak} />
        </MotionBox>
      )}

      {/* Stats */}
      {publicKey && balance !== null && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
          <StatChip icon="💰" value={`${(balance / LAMPORTS_PER_SOL).toFixed(2)}`} label="SOL Balance" bg="orange.50" />
          <StatChip icon="✅" value={`${tasksCompleted}`} label="Quests Done" bg="green.50" />
          <StatChip icon="⭐" value={`${level}`} label="Level" bg="amber.50" />
          <StatChip icon="🔥" value={`${bestStreak}`} label="Best Streak" bg="red.50" />
        </SimpleGrid>
      )}

      {/* Level path */}
      {publicKey && profile && (
        <MotionBox bg="white" borderRadius="20px" p={4} boxShadow="0 2px 16px rgba(0,0,0,0.03)"
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <LevelPath completed={tasksCompleted} level={level} />
        </MotionBox>
      )}

      {/* ═══ QUEST CARD ═══ */}
      <MotionBox
        bg="white" borderRadius="24px" overflow="hidden"
        boxShadow={`0 12px 40px rgba(0,0,0,0.06), 0 0 0 1px ${questColor}15`}
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 150 }}
      >
        {/* Quest type gradient strip */}
        <Box h="5px" bg={`linear-gradient(90deg, ${questColor}, ${questColor}88)`} />

        <Box p={6}>
          {loading ? (
            <Flex justify="center" py={12}><Spinner color="brand.500" size="xl" thickness="3px" /></Flex>
          ) : !hasProfile ? (
            <VStack py={10} spacing={4}>
              <Text fontSize="4xl">👋</Text>
              <Heading size="md" textAlign="center" color="gray.600">Welcome, explorer!</Heading>
              <Text color="gray.400" textAlign="center">Create your coach profile to get started</Text>
              <Button colorScheme="orange" size="lg" onClick={handleRegister}
                isLoading={registering} loadingText="Creating...">
                Create Profile
              </Button>
            </VStack>
          ) : !task ? (
            <VStack py={10} spacing={3}>
              <Text fontSize="4xl">☀️</Text>
              <Heading size="md" textAlign="center" color="gray.600">No quest today</Heading>
              <Text color="gray.400" textAlign="center">Your AI coach is preparing tomorrow's quest</Text>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={5}>
              {/* Quest header */}
              <Flex justify="space-between" align="start">
                <HStack spacing={2}>
                  <Badge bg={`${questColor}18`} color={questColor} px={3} py={1} borderRadius="full" fontSize="xs" fontWeight={700}>
                    {task.taskType}
                  </Badge>
                  <Badge bg="blue.50" color="blue.600" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight={700}>
                    {task.protocol}
                  </Badge>
                </HStack>
                <CountdownRing />
              </Flex>

              {/* Quest description */}
              <Box>
                <Text fontWeight={800} fontSize="xl" color="gray.700" lineHeight={1.3}>
                  {task.description}
                </Text>
                {task.suggestedAmount > 0 && (
                  <HStack mt={2} spacing={2}>
                    <Badge bg="brand.50" color="brand.600" px={3} py={1} borderRadius="full" fontSize="sm" fontWeight={700}>
                      {(task.suggestedAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL
                    </Badge>
                    <Badge bg="amber.50" color="amber.600" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight={700}>
                      +50 XP
                    </Badge>
                  </HStack>
                )}
              </Box>

              {/* Why this quest */}
              <Box bg="warm.cream" p={4} borderRadius="16px" borderLeft="3px solid" borderLeftColor="brand.300">
                <Text fontSize="xs" fontWeight={800} color="brand.600" mb={1} textTransform="uppercase" letterSpacing="0.5px">
                  Why this quest?
                </Text>
                <Text fontSize="sm" color="gray.500" lineHeight={1.6}>{task.reasoning}</Text>
              </Box>

              {/* Actions */}
              {task.status === 'Pending' && (
                <HStack spacing={3}>
                  <Button colorScheme="green" flex={2} size="lg" isLoading={actionLoading}
                    onClick={() => handleAction('accept')}
                    boxShadow="0 4px 16px rgba(34,197,94,0.2)"
                    _hover={{ boxShadow: '0 6px 24px rgba(34,197,94,0.3)', transform: 'translateY(-1px)' }}
                    transition="all 0.2s">
                    ✓ Accept Quest
                  </Button>
                  <Button variant="outline" colorScheme="gray" flex={1} size="lg"
                    isLoading={actionLoading} onClick={() => handleAction('reject')}
                    borderRadius="full" color="gray.400" borderColor="gray.200"
                    _hover={{ color: 'red.400', borderColor: 'red.200' }}>
                    Skip
                  </Button>
                </HStack>
              )}

              {task.status === 'Accepted' && !verified && (
                <VStack spacing={4}>
                  <Box bg="amber.50" p={4} borderRadius="16px" w="100%">
                    <Flex align="center" gap={2}>
                      <Text fontSize="lg">⏳</Text>
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight={700} color="amber.700">Quest in progress</Text>
                        <Text fontSize="xs" color="amber.600">Follow the steps below, then verify</Text>
                      </Box>
                    </Flex>
                  </Box>

                  {/* Step-by-step guide */}
                  {task.guide && task.guide.length > 0 && (
                    <Box bg="white" border="1px solid" borderColor="gray.100" borderRadius="16px" p={5} w="100%">
                      <Text fontSize="xs" fontWeight={800} color="brand.600" textTransform="uppercase" letterSpacing="1px" mb={3}>
                        📋 How to complete
                      </Text>
                      <VStack align="stretch" spacing={3}>
                        {task.guide.map((step, i) => (
                          <Flex key={i} gap={3} align="flex-start">
                            <Circle size="22px" bg="brand.50" color="brand.500" fontSize="2xs" fontWeight={800} flexShrink={0} mt="1px">
                              {i + 1}
                            </Circle>
                            <Text fontSize="sm" color="gray.600" lineHeight={1.5}><LinkedText>{step}</LinkedText></Text>
                          </Flex>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  <Button colorScheme="blue" size="lg" w="100%" isLoading={actionLoading} onClick={handleVerify}
                    boxShadow="0 4px 16px rgba(59,130,246,0.2)"
                    _hover={{ boxShadow: '0 6px 24px rgba(59,130,246,0.3)', transform: 'translateY(-1px)' }}
                    transition="all 0.2s">
                    🔍 Verify Completion
                  </Button>
                </VStack>
              )}

              {(task.status === 'Resolved' || verified) && (
                <Box bg="green.50" p={5} borderRadius="16px" textAlign="center">
                  <Text fontSize="2xl" mb={1}>🎉</Text>
                  <Text fontWeight={800} color="green.600">Quest Complete!</Text>
                  <Text fontSize="sm" color="green.500">Streak maintained. See you tomorrow!</Text>
                </Box>
              )}
            </VStack>
          )}
        </Box>
      </MotionBox>

      {/* Coach tip */}
      {publicKey && profile && (
        <MotionBox
          bg="white" borderRadius="20px" p={5}
          boxShadow="0 2px 16px rgba(0,0,0,0.03)"
          borderLeft="4px solid" borderLeftColor="brand.300"
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
        >
          <HStack spacing={3} align="start">
            <Text fontSize="2xl">💡</Text>
            <Box>
              <Text fontWeight={800} fontSize="sm" color="brand.600" mb={1}>Coach Tip</Text>
              <Text fontSize="sm" color="gray.500" lineHeight={1.6}>
                {streak >= 7
                  ? "Incredible streak! You're mastering DeFi habits. Try exploring a new protocol today."
                  : streak >= 3
                  ? 'Great momentum! Keep accepting daily quests to level up faster.'
                  : 'Start a streak by accepting your daily quest. Consistency unlocks everything!'}
              </Text>
            </Box>
          </HStack>
        </MotionBox>
      )}
    </VStack>
  )
}

export default HomePage

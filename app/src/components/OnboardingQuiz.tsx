import { useState, useCallback, useEffect, useRef } from 'react'
import { Box, VStack, Heading, Text, Button, HStack, Progress, SimpleGrid, Badge, Flex } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

const MotionBox = motion(Box as any)

/* ═══════════════════════════════════════════════════════════════════ */
/*  ROLE SYSTEM                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

type Role = 'explorer' | 'trader' | 'strategist' | 'analyst' | 'architect' | 'hunter' | 'diamond' | 'degen'

interface RoleInfo {
  name: string
  emoji: string
  title: string
  description: string
  color: string
  strengths: string[]
}

const ROLES: Record<Role, RoleInfo> = {
  explorer:   { name: 'DeFi Explorer',     emoji: '🌱', title: 'The Curious Learner',   description: "You're at the start of an exciting journey. SolCoach will guide you step by step through the DeFi landscape.", color: '#10B981', strengths: ['Openness to learn', 'Low risk tolerance', 'Methodical approach'] },
  trader:     { name: 'Active Trader',      emoji: '📊', title: 'The Market Mover',      description: "You live for the action. Quick swaps, arbitrage, and timing the market — your quests will keep up with your pace.", color: '#3B82F6', strengths: ['Fast execution', 'Market awareness', 'Risk comfort'] },
  strategist: { name: 'Yield Strategist',   emoji: '🎯', title: 'The Optimizer',         description: "Every basis point matters to you. We'll find the best yield opportunities across Solana protocols.", color: '#F59E0B', strengths: ['Yield optimization', 'Protocol knowledge', 'Long-term thinking'] },
  analyst:    { name: 'On-Chain Analyst',    emoji: '🔍', title: 'The Data Detective',    description: "You dig into the numbers before making a move. Your quests will leverage on-chain data and metrics.", color: '#8B5CF6', strengths: ['Data-driven decisions', 'Research skills', 'Pattern recognition'] },
  architect:  { name: 'DeFi Architect',     emoji: '🏗️', title: 'The Protocol Builder',  description: "You understand the infrastructure. Your quests will push boundaries across advanced DeFi primitives.", color: '#EC4899', strengths: ['Technical depth', 'Protocol design', 'Composability thinking'] },
  hunter:     { name: 'Airdrop Hunter',     emoji: '🪂', title: 'The Early Adopter',     description: "First in, first out. You chase new protocols, testnets, and airdrops before anyone else.", color: '#14B8A6', strengths: ['Speed to new protocols', 'Risk appetite', 'Community radar'] },
  diamond:    { name: 'Diamond Hands',      emoji: '💎', title: 'The Patient Staker',    description: "You believe in the long game. Staking, accumulating, and compounding — your quests reward patience.", color: '#6366F1', strengths: ['Patience', 'Conviction', 'Compound thinking'] },
  degen:      { name: 'Full Degen',         emoji: '🦍', title: 'The Risk Embracer',     description: "High risk, high reward. You're not here for 5% APY — your quests will match your appetite.", color: '#EF4444', strengths: ['Risk tolerance', 'Speed', 'FOMO resistance'] },
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  QUESTION BANK                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

interface Option { label: string; emoji: string; value: string; scores?: Partial<Record<Role, number>> }
interface Question {
  id: string
  question: string
  subtitle?: string
  options: Option[]
  next?: (value: string, answers: Record<string, string>) => string | null
}

const Q: Record<string, Question> = {
  welcome: {
    id: 'welcome',
    question: "Hey! I'm SolCoach ☀️",
    subtitle: "Your personal AI coach for DeFi on Solana. Let me get to know you — it takes about 30 seconds.",
    options: [{ label: "Let's do this!", emoji: '🚀', value: 'go' }],
    next: () => 'exp',
  },

  // ── Core Experience ──
  exp: {
    id: 'exp',
    question: 'How long have you been in crypto?',
    options: [
      { label: 'Less than a month', emoji: '🐣', value: 'newbie', scores: { explorer: 3 } },
      { label: 'A few months', emoji: '🌿', value: 'junior', scores: { explorer: 2, trader: 1 } },
      { label: '1-2 years', emoji: '🌳', value: 'mid', scores: { strategist: 1, trader: 1 } },
      { label: '3+ years', emoji: '🏔️', value: 'senior', scores: { architect: 2, analyst: 1 } },
      { label: 'Since before it was cool', emoji: '🧙', value: 'og', scores: { architect: 3, degen: 1 } },
    ],
    next: (v) => v === 'newbie' ? 'heard_about' : v === 'junior' ? 'first_action' : 'solana_exp',
  },

  // ── Beginner branch ──
  heard_about: {
    id: 'heard_about',
    question: 'How did you first hear about DeFi?',
    options: [
      { label: 'A friend told me', emoji: '🗣️', value: 'friend', scores: { explorer: 2 } },
      { label: 'Twitter / social media', emoji: '📱', value: 'social', scores: { hunter: 1, explorer: 1 } },
      { label: 'YouTube or podcasts', emoji: '🎧', value: 'content', scores: { analyst: 1, explorer: 1 } },
      { label: "I don't really know what DeFi is yet", emoji: '🤷', value: 'unsure', scores: { explorer: 3 } },
    ],
    next: () => 'wallet_used',
  },
  wallet_used: {
    id: 'wallet_used',
    question: 'Have you set up a Solana wallet?',
    subtitle: "No worries if not — we'll help you.",
    options: [
      { label: 'Yes, I use Phantom', emoji: '👻', value: 'phantom', scores: { explorer: 1 } },
      { label: 'Yes, a different wallet', emoji: '💼', value: 'other', scores: { explorer: 1 } },
      { label: 'Not yet', emoji: '🆕', value: 'no', scores: { explorer: 2 } },
    ],
    next: () => 'goal',
  },

  // ── Junior branch ──
  first_action: {
    id: 'first_action',
    question: 'What was your first on-chain action?',
    options: [
      { label: 'Bought tokens on an exchange', emoji: '🏪', value: 'cex', scores: { trader: 1, explorer: 1 } },
      { label: 'Swapped on a DEX', emoji: '🔄', value: 'dex', scores: { trader: 2 } },
      { label: 'Staked something', emoji: '🥩', value: 'stake', scores: { diamond: 2 } },
      { label: 'Minted an NFT', emoji: '🖼️', value: 'nft', scores: { hunter: 1, degen: 1 } },
    ],
    next: () => 'chain_pref',
  },

  // ── Mid/Senior branches ──
  solana_exp: {
    id: 'solana_exp',
    question: 'How familiar are you with Solana specifically?',
    options: [
      { label: 'Total Solana native', emoji: '⚡', value: 'native', scores: { architect: 2, strategist: 1 } },
      { label: 'I use it sometimes', emoji: '🔀', value: 'some', scores: { trader: 1 } },
      { label: 'Mostly ETH / other chains', emoji: '🌐', value: 'eth', scores: { analyst: 1 } },
      { label: 'Exploring Solana for the first time', emoji: '🗺️', value: 'new', scores: { explorer: 2 } },
    ],
    next: (v) => v === 'native' ? 'advanced_defi' : 'chain_pref',
  },

  chain_pref: {
    id: 'chain_pref',
    question: 'Which chain feels like home?',
    options: [
      { label: 'Solana all the way', emoji: '☀️', value: 'sol', scores: { strategist: 1 } },
      { label: 'Ethereum / L2s', emoji: '💎', value: 'eth', scores: { analyst: 1 } },
      { label: 'I go where the yield is', emoji: '🏃', value: 'multi', scores: { hunter: 2, strategist: 1 } },
      { label: "I don't have a favorite yet", emoji: '🤔', value: 'none', scores: { explorer: 1 } },
    ],
    next: () => 'defi_activity',
  },

  // ── DeFi depth ──
  defi_activity: {
    id: 'defi_activity',
    question: 'Which DeFi activity do you do most?',
    options: [
      { label: 'Swapping tokens', emoji: '🔄', value: 'swap', scores: { trader: 3 } },
      { label: 'Staking / liquid staking', emoji: '🥩', value: 'stake', scores: { diamond: 2, strategist: 1 } },
      { label: 'Providing liquidity (LP)', emoji: '💧', value: 'lp', scores: { strategist: 3 } },
      { label: 'Lending / borrowing', emoji: '🏦', value: 'lend', scores: { strategist: 2, analyst: 1 } },
      { label: "Haven't done any yet", emoji: '🌱', value: 'none', scores: { explorer: 2 } },
    ],
    next: (v) => v === 'none' ? 'goal' : 'risk_q',
  },

  advanced_defi: {
    id: 'advanced_defi',
    question: 'Which advanced strategies have you used?',
    subtitle: 'Pick the most complex one.',
    options: [
      { label: 'Leveraged yield farming', emoji: '🔧', value: 'leverage', scores: { degen: 2, strategist: 2 } },
      { label: 'Delta-neutral strategies', emoji: '⚖️', value: 'delta', scores: { strategist: 3, analyst: 1 } },
      { label: 'MEV / arbitrage', emoji: '⚡', value: 'mev', scores: { architect: 3, trader: 1 } },
      { label: 'Governance & voting', emoji: '🗳️', value: 'gov', scores: { analyst: 2 } },
      { label: 'I write smart contracts', emoji: '💻', value: 'dev', scores: { architect: 4 } },
    ],
    next: () => 'risk_q',
  },

  // ── Risk & personality ──
  risk_q: {
    id: 'risk_q',
    question: 'Your portfolio drops 40% overnight. What do you do?',
    subtitle: 'Be honest — no wrong answers.',
    options: [
      { label: 'Buy the dip, obviously', emoji: '🛒', value: 'buy', scores: { degen: 3, diamond: 1 } },
      { label: 'Hold and wait it out', emoji: '🧘', value: 'hold', scores: { diamond: 3 } },
      { label: 'Analyze what happened first', emoji: '🔍', value: 'analyze', scores: { analyst: 3 } },
      { label: 'Hedge or rebalance', emoji: '⚖️', value: 'hedge', scores: { strategist: 2, analyst: 1 } },
      { label: 'Panic a little, honestly', emoji: '😰', value: 'panic', scores: { explorer: 2 } },
    ],
    next: () => 'time_horizon',
  },

  time_horizon: {
    id: 'time_horizon',
    question: 'When you put money into DeFi, you think in...',
    options: [
      { label: 'Hours to days', emoji: '⏱️', value: 'short', scores: { trader: 3, degen: 1 } },
      { label: 'Weeks to months', emoji: '📅', value: 'mid', scores: { strategist: 2, hunter: 1 } },
      { label: 'Months to years', emoji: '🗓️', value: 'long', scores: { diamond: 3, strategist: 1 } },
      { label: 'I check my phone every 5 minutes', emoji: '📱', value: 'addicted', scores: { trader: 2, degen: 2 } },
    ],
    next: () => 'goal',
  },

  // ── Goals ──
  goal: {
    id: 'goal',
    question: 'What would make this app amazing for you?',
    options: [
      { label: 'Daily tasks that teach me DeFi', emoji: '📚', value: 'learn', scores: { explorer: 2 } },
      { label: 'Finding the best yields automatically', emoji: '💰', value: 'yield', scores: { strategist: 3 } },
      { label: 'Discovering new protocols early', emoji: '🔮', value: 'discover', scores: { hunter: 3 } },
      { label: 'Building a habit & tracking progress', emoji: '🔥', value: 'habit', scores: { diamond: 1, explorer: 1 } },
      { label: 'Having someone tell me what to ape into', emoji: '🦍', value: 'ape', scores: { degen: 3 } },
    ],
    next: () => 'frequency',
  },

  // ── Frequency ──
  frequency: {
    id: 'frequency',
    question: 'How often can you commit to quests?',
    subtitle: "I'll calibrate your schedule.",
    options: [
      { label: 'Every single day', emoji: '🔥', value: 'daily', scores: { diamond: 1 } },
      { label: 'Most days', emoji: '📆', value: 'most', scores: { strategist: 1 } },
      { label: 'A few times a week', emoji: '🗓️', value: 'few' },
      { label: 'Whenever I feel like it', emoji: '🏖️', value: 'casual', scores: { degen: 1 } },
    ],
    next: () => null, // end
  },
}

// Each path: welcome → exp → [branch 2-3 questions] → risk_q → time_horizon → goal → frequency
// Beginners: welcome → exp → heard_about → wallet_used → goal → frequency (5 questions, shorter)
// OG: welcome → exp → solana_exp → advanced_defi → risk_q → time_horizon → goal → frequency (8 questions)

/* ═══════════════════════════════════════════════════════════════════ */
/*  ROLE CALCULATOR                                                  */
/* ═══════════════════════════════════════════════════════════════════ */

function calcRole(answers: Record<string, string>): Role {
  const scores: Record<Role, number> = {
    explorer: 0, trader: 0, strategist: 0, analyst: 0,
    architect: 0, hunter: 0, diamond: 0, degen: 0,
  }

  for (const [qId, aValue] of Object.entries(answers)) {
    const question = Q[qId]
    if (!question) continue
    const option = question.options.find(o => o.value === aValue)
    if (option?.scores) {
      for (const [role, pts] of Object.entries(option.scores)) {
        scores[role as Role] += pts
      }
    }
  }

  let best: Role = 'explorer'
  let bestScore = -1
  for (const [role, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = role as Role }
  }
  return best
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  COMPONENTS                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

function OptionButton({ option, onClick, index }: { option: Option; onClick: () => void; index: number }) {
  return (
    <MotionBox
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.08 + index * 0.06, type: 'spring', stiffness: 250, damping: 22 }}
    >
      <Button
        w="100%" h="auto" py={4} px={5}
        bg="white" border="2px solid" borderColor="gray.100" borderRadius="16px"
        display="flex" justifyContent="flex-start" gap={3}
        fontWeight={600} fontSize="md" color="gray.700"
        boxShadow="0 2px 8px rgba(0,0,0,0.03)"
        _hover={{ borderColor: 'brand.300', bg: 'brand.50', transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(249,115,22,0.1)' }}
        _active={{ transform: 'scale(0.98)' }}
        transition="all 0.2s"
        onClick={onClick}
      >
        <Text fontSize="xl">{option.emoji}</Text>
        <Text textAlign="left">{option.label}</Text>
      </Button>
    </MotionBox>
  )
}

function QuizStep({ question, onAnswer }: { question: Question; onAnswer: (v: string) => void }) {
  return (
    <MotionBox
      key={question.id}
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -50, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 250, damping: 28 }}
    >
      <VStack spacing={5} align="stretch" maxW="500px" mx="auto" w="100%">
        <VStack spacing={2} mb={2}>
          <Heading size="lg" fontWeight={800} textAlign="center" color="gray.700" lineHeight={1.3}>
            {question.question}
          </Heading>
          {question.subtitle && (
            <Text color="gray.400" textAlign="center" fontSize="sm" maxW="420px">{question.subtitle}</Text>
          )}
        </VStack>
        <VStack spacing={3}>
          {question.options.map((opt, i) => (
            <OptionButton key={opt.value} option={opt} index={i} onClick={() => onAnswer(opt.value)} />
          ))}
        </VStack>
      </VStack>
    </MotionBox>
  )
}

/* ─── Smooth Analyzing Screen ─── */
function AnalyzingScreen({ onDone, role }: { onDone: () => void; role: Role }) {
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const animRef = useRef<number>(0)
  const startRef = useRef(0)

  const steps = [
    { text: 'Reading your responses...', emoji: '📋' },
    { text: 'Mapping your experience level...', emoji: '🧠' },
    { text: 'Calculating risk profile...', emoji: '📐' },
    { text: 'Matching protocols to your style...', emoji: '🔗' },
    { text: 'Building your quest roadmap...', emoji: '🗺️' },
    { text: `You're a ${ROLES[role].name}!`, emoji: ROLES[role].emoji },
  ]

  useEffect(() => {
    const totalDuration = 4000 // 4 seconds total
    startRef.current = performance.now()

    function tick(now: number) {
      const elapsed = now - startRef.current
      const t = Math.min(elapsed / totalDuration, 1)
      // Smooth easeInOutCubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const p = eased * 100

      setProgress(p)
      setStepIdx(Math.min(Math.floor(t * (steps.length - 0.01)), steps.length - 1))

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setTimeout(onDone, 800)
      }
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [onDone, steps.length])

  return (
    <MotionBox
      key="analyzing"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <VStack spacing={8} maxW="440px" mx="auto" textAlign="center" py={8}>
        <MotionBox
          key={stepIdx}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Text fontSize="5xl">{steps[stepIdx].emoji}</Text>
        </MotionBox>
        <VStack spacing={2}>
          <AnimatePresence mode="wait">
            <MotionBox
              key={stepIdx}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Heading size="md" fontWeight={700} color="gray.600">{steps[stepIdx].text}</Heading>
            </MotionBox>
          </AnimatePresence>
        </VStack>
        <Box w="100%">
          <Box position="relative" h="8px" bg="gray.100" borderRadius="full" overflow="hidden">
            <Box
              h="100%"
              bg="linear-gradient(90deg, #fb923c, #f97316, #ea580c)"
              borderRadius="full"
              w={`${progress}%`}
              transition="width 0.1s linear"
            />
          </Box>
          <Text fontSize="xs" color="gray.400" mt={2} fontWeight={600}>{Math.floor(progress)}%</Text>
        </Box>
      </VStack>
    </MotionBox>
  )
}

/* ─── Result Screen ─── */
function ResultScreen({ role }: { role: Role }) {
  const info = ROLES[role]
  return (
    <MotionBox
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 18 }}
    >
      <VStack spacing={7} maxW="500px" mx="auto" textAlign="center">
        {/* Role reveal */}
        <VStack spacing={3}>
          <MotionBox
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.15 }}
          >
            <Text fontSize="6xl">{info.emoji}</Text>
          </MotionBox>
          <Badge bg={`${info.color}18`} color={info.color} fontSize="sm" px={4} py={1}
            borderRadius="full" fontWeight={800} border="1px solid" borderColor={`${info.color}33`}>
            {info.title}
          </Badge>
          <Heading size="lg" fontWeight={800} color="gray.700">{info.name}</Heading>
          <Text color="gray.400" fontSize="sm" maxW="380px" lineHeight={1.7}>{info.description}</Text>
        </VStack>

        {/* Strengths */}
        <HStack spacing={2} flexWrap="wrap" justify="center">
          {info.strengths.map(s => (
            <Badge key={s} bg="gray.50" color="gray.500" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight={600}>
              {s}
            </Badge>
          ))}
        </HStack>

        {/* Connect CTA */}
        <VStack spacing={3} w="100%" pt={2}>
          <Box w="100%" sx={{
            '& .wallet-adapter-button': {
              width: '100% !important',
              height: '64px !important',
              borderRadius: '20px !important',
              fontSize: '18px !important',
              fontWeight: '800 !important',
              fontFamily: 'Nunito, sans-serif !important',
              background: `linear-gradient(135deg, ${info.color}, #f97316) !important`,
              boxShadow: `0 8px 32px ${info.color}40`,
              transition: 'all 0.3s !important',
              display: 'flex !important',
              alignItems: 'center !important',
              justifyContent: 'center !important',
            },
            '& .wallet-adapter-button:hover': {
              boxShadow: `0 12px 40px ${info.color}55 !important`,
              transform: 'translateY(-2px) !important',
            },
          }}>
            <WalletMultiButton />
          </Box>
          <HStack spacing={2} color="gray.300" fontSize="xs">
            <Text>🔒</Text>
            <Text>Read-only access. We never sign without your approval.</Text>
          </HStack>
        </VStack>

        {/* Feature pills */}
        <SimpleGrid columns={3} spacing={3} w="100%">
          {[
            { emoji: '🎯', label: 'Daily Quests', desc: 'Tailored to your role' },
            { emoji: '🔥', label: 'Streaks', desc: 'Build consistency' },
            { emoji: '⭐', label: 'Level Up', desc: 'Track your growth' },
          ].map(f => (
            <Box key={f.label} bg="white" borderRadius="16px" p={3} textAlign="center" boxShadow="0 2px 8px rgba(0,0,0,0.03)">
              <Text fontSize="lg" mb={1}>{f.emoji}</Text>
              <Text fontWeight={700} fontSize="xs" color="gray.600">{f.label}</Text>
              <Text fontSize="2xs" color="gray.400">{f.desc}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </MotionBox>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN QUIZ                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

export default function OnboardingQuiz() {
  const [currentQ, setCurrentQ] = useState('welcome')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<string[]>(['welcome'])
  const [phase, setPhase] = useState<'quiz' | 'analyzing' | 'result'>('quiz')
  const [role, setRole] = useState<Role>('explorer')

  // Count real questions (exclude welcome)
  const questionsDone = history.length - 1
  const totalEstimate = 6 // average path length
  const progress = phase === 'result' ? 100 : phase === 'analyzing' ? 95 : Math.min((questionsDone / totalEstimate) * 85, 85)

  const handleAnswer = useCallback((value: string) => {
    const newAnswers = { ...answers, [currentQ]: value }
    setAnswers(newAnswers)

    const question = Q[currentQ]
    const nextId = question?.next ? question.next(value, newAnswers) : null
    if (nextId && Q[nextId]) {
      setCurrentQ(nextId)
      setHistory(prev => [...prev, nextId])
    } else {
      const r = calcRole(newAnswers)
      setRole(r)
      setPhase('analyzing')
    }
  }, [currentQ, answers])

  const handleBack = useCallback(() => {
    if (history.length <= 1) return
    const newHist = history.slice(0, -1)
    setHistory(newHist)
    setCurrentQ(newHist[newHist.length - 1])
    setPhase('quiz')
  }, [history])

  const question = Q[currentQ]

  return (
    <Box minH="70vh" display="flex" flexDirection="column" justifyContent="center" py={8}>
      <Box maxW="500px" mx="auto" w="100%" mb={6} px={4}>
        <Flex justify="space-between" align="center" mb={1}>
          {phase === 'quiz' && history.length > 1 && (
            <Button variant="ghost" size="sm" color="gray.400" onClick={handleBack}
              _hover={{ color: 'brand.500' }} fontWeight={600} fontSize="xs">
              ← Back
            </Button>
          )}
          <Box flex={1} />
          {phase === 'quiz' && questionsDone > 0 && (
            <Text fontSize="2xs" color="gray.300" fontWeight={600}>{questionsDone} of ~{totalEstimate}</Text>
          )}
        </Flex>
        <Progress value={progress} borderRadius="full" size="xs" colorScheme="orange" bg="gray.100" transition="all 0.5s ease" />
      </Box>

      <AnimatePresence mode="wait">
        {phase === 'analyzing' ? (
          <AnalyzingScreen key="analyzing" onDone={() => setPhase('result')} role={role} />
        ) : phase === 'result' ? (
          <ResultScreen key="result" role={role} />
        ) : question ? (
          <QuizStep key={currentQ} question={question} onAnswer={handleAnswer} />
        ) : null}
      </AnimatePresence>
    </Box>
  )
}

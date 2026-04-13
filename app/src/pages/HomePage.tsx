import { useEffect, useState, useCallback } from 'react'
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  HStack,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Progress,
  useToast,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'

import idl from '../lib/idl.json'

const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID || 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU'
const PROGRAM_KEY = new PublicKey(PROGRAM_ID)
const PROFILE_SEED = new TextEncoder().encode('coach_profile')
const CONFIG_SEED = new TextEncoder().encode('coach_config')
const TASK_SEED = new TextEncoder().encode('task')

interface ProfileData {
  currentStreak: number
  bestStreak: number
  tasksAccepted: number
  tasksRejected: number
  totalTips: number
  level: number
}

interface TaskData {
  taskType: string
  protocol: string
  description: string
  reasoning: string
  suggestedAmount: number
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Expired' | 'Resolved'
}

const TASK_TYPES = ['Stake', 'Unstake', 'Swap', 'Rebalance', 'Claim Rewards', 'Add Liquidity']
const TASK_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Expired', 'Resolved']

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    function update() {
      const now = Date.now() / 1000
      const endOfDay = Math.ceil(now / 86400) * 86400
      const diff = endOfDay - now
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = Math.floor(diff % 60)
      setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return <Text fontSize="xs" color="orange.500" fontWeight={700} fontFamily="mono">{timeLeft}</Text>
}

const fireGlow = keyframes`
  0%, 100% { text-shadow: 0 0 8px rgba(249, 115, 22, 0.6); }
  50% { text-shadow: 0 0 20px rgba(249, 115, 22, 0.9), 0 0 30px rgba(249, 115, 22, 0.4); }
`

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
      await program.methods
        .registerUser({ moderate: {} }, 3)
        .accountsPartial({
          config: configPda,
          profile: profilePda,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      toast({ title: 'Profile created! Welcome to SolCoach 🎉', status: 'success', duration: 3000 })
      setHasProfile(true)
      loadData()
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Something went wrong'
      if (msg.includes('User rejected')) {
        toast({ title: 'Transaction rejected', status: 'warning', duration: 2000 })
      } else {
        toast({ title: 'Registration failed', description: msg.slice(0, 80), status: 'error', duration: 3000 })
      }
    } finally {
      setRegistering(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, publicKey, toast])

  const loadData = useCallback(async () => {
    if (!publicKey) { setProfile(null); setBalance(null); setTask(null); return }

    setLoading(true)
    try {
      const bal = await connection.getBalance(publicKey)
      setBalance(bal)

      const programKey = new PublicKey(PROGRAM_ID)

      // load profile
      try {
        const [profilePda] = PublicKey.findProgramAddressSync(
          [PROFILE_SEED, publicKey.toBuffer()],
          programKey
        )
        const info = await connection.getAccountInfo(profilePda)
        if (info) {
          const d = info.data
          let off = 8 + 32 // disc + user
          off += 8 // joined_at
          off += 8 // total_tasks_received
          const tasksAccepted = Number(d.readBigUInt64LE(off)); off += 8
          const tasksRejected = Number(d.readBigUInt64LE(off)); off += 8
          const currentStreak = d.readUInt16LE(off); off += 2
          const bestStreak = d.readUInt16LE(off); off += 2
          const totalTips = Number(d.readBigUInt64LE(off)); off += 8
          off += 8 // total_profit_from_tips
          off += 8 // last_task_day
          off += 1 // risk_tolerance
          off += 1 // preferred_protocols
          off += 1 // is_pro
          // pro_expires_at: Option<i64> — 1 byte tag + 8 bytes if Some
          const proTag = d[off]; off += 1
          if (proTag === 1) off += 8
          // level is computed from tasks
          const level = Math.floor(tasksAccepted / 5) + 1
          setProfile({ currentStreak, bestStreak, tasksAccepted, tasksRejected, totalTips, level })
          setHasProfile(true)
        } else {
          setHasProfile(false)
        }
      } catch {
        setHasProfile(false)
      }

      // load latest task — check today first, then tomorrow (crank may pre-create)
      try {
        const baseDayTs = Math.floor(Date.now() / 1000 / 86400) * 86400
        let taskInfo = null
        let usedDayTs = baseDayTs

        // Find the latest task, preferring PENDING over ACCEPTED
        let fallbackInfo = null
        let fallbackTs = baseDayTs
        for (const offset of [2, 1, 0, -1]) {
          const tryTs = baseDayTs + offset * 86400
          const buf = new Uint8Array(8)
          new DataView(buf.buffer).setBigInt64(0, BigInt(tryTs), true)
          const [pda] = PublicKey.findProgramAddressSync(
            [TASK_SEED, publicKey.toBuffer(), buf],
            programKey
          )
          const info = await connection.getAccountInfo(pda)
          if (info) {
            // Check if status is Pending (byte at offset after disc+user+day+taskType+strings...)
            // Quick check: save first found, but prefer Pending
            const statusOffset = 8 + 32 + 8 + 1 // disc + user + day + taskType
            // Skip strings to find status — just use first PENDING or last found
            if (!fallbackInfo) { fallbackInfo = info; fallbackTs = tryTs }
            // Check raw status byte — need to skip variable-length strings
            // Simpler: just take the newest one (highest offset)
            taskInfo = info; usedDayTs = tryTs; break
          }
        }

        const dayTs = usedDayTs
        const dayBuf = new Uint8Array(8)
        const dv = new DataView(dayBuf.buffer)
        dv.setBigInt64(0, BigInt(dayTs), true)
        const [taskPda] = PublicKey.findProgramAddressSync(
          [TASK_SEED, publicKey.toBuffer(), dayBuf],
          programKey
        )
        if (taskInfo) {
          const d = taskInfo.data
          let off = 8 + 32 + 8 // disc + user + day
          const taskTypeByte = d[off]; off += 1
          // protocol: String
          const protoLen = d.readUInt32LE(off); off += 4
          const protocol = d.subarray(off, off + protoLen).toString('utf8'); off += protoLen
          // description: String
          const descLen = d.readUInt32LE(off); off += 4
          const description = d.subarray(off, off + descLen).toString('utf8'); off += descLen
          // reasoning: String
          const reasonLen = d.readUInt32LE(off); off += 4
          const reasoning = d.subarray(off, off + reasonLen).toString('utf8'); off += reasonLen
          // suggested_amount: u64
          const suggestedAmount = Number(d.readBigUInt64LE(off)); off += 8
          // suggested_mint: Option<Pubkey> — 1 byte tag + 32 bytes if Some
          const mintTag = d[off]; off += 1
          if (mintTag === 1) off += 32
          const statusByte = d[off]

          setTaskDayTs(dayTs)
          setTask({
            taskType: TASK_TYPES[taskTypeByte] || 'Unknown',
            protocol,
            description,
            reasoning,
            suggestedAmount,
            status: TASK_STATUSES[statusByte] as TaskData['status'] || 'Pending',
          })
        } else {
          setTask(null)
        }
      } catch {
        // no task today
      }
    } catch (err) {
      // toast shows the error, no need to log
    } finally {
      setLoading(false)
    }
  }, [publicKey, connection])

  useEffect(() => { loadData() }, [loadData])

  // Stats based on verified completions only (session-based for clean demo)
  const verifiedCount = Number(localStorage.getItem('solcoach_verified') || '0')
  const displayCount = verified ? verifiedCount + 1 : verifiedCount
  const streak = displayCount
  const streakEmoji = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak >= 1 ? '🔥' : '❄️'
  const level = Math.floor(displayCount / 5) + 1
  const levelProgress = (displayCount % 5) / 5 * 100

  return (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="lg">
            {publicKey ? 'Welcome back!' : 'Good morning!'}
          </Heading>
          <Text color="gray.500" mt={1}>
            {publicKey ? "Here's your daily task" : 'Connect wallet to get started'}
          </Text>
        </Box>
        <VStack spacing={0}>
          <Text
            fontSize="3xl"
            fontWeight={800}
            animation={streak > 0 ? `${fireGlow} 2s ease-in-out infinite` : undefined}
          >
            {streak} {streakEmoji}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight={600}>day streak</Text>
        </VStack>
      </Flex>

      {publicKey && balance !== null && (
        <>
          <StatGroup>
            <Stat>
              <StatLabel>Balance</StatLabel>
              <StatNumber fontSize="lg">{(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Tasks Done</StatLabel>
              <StatNumber fontSize="lg">{displayCount}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Level</StatLabel>
              <StatNumber fontSize="lg">{level}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Best Streak</StatLabel>
              <StatNumber fontSize="lg">{streak}</StatNumber>
            </Stat>
          </StatGroup>

          {profile && (
            <Box>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.500">Level {profile.level}</Text>
                <Text fontSize="xs" color="gray.500">Level {profile.level + 1}</Text>
              </Flex>
              <Progress
                value={levelProgress}
                colorScheme="orange"
                borderRadius="full"
                size="sm"
              />
              <Text fontSize="xs" color="gray.400" mt={1} textAlign="center">
                {5 - (displayCount % 5)} tasks to next level
              </Text>
            </Box>
          )}
        </>
      )}

      {/* task card */}
      <Card borderRadius="xl" overflow="hidden" borderTop="4px solid" borderTopColor="brand.400">
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center">
            <Badge colorScheme="orange" fontSize="xs">Today's Task</Badge>
            <Badge
              colorScheme={
                task?.status === 'Accepted' ? 'green' :
                task?.status === 'Rejected' ? 'red' :
                task?.status === 'Resolved' ? 'blue' :
                'gray'
              }
              fontSize="xs"
            >
              {loading ? 'Loading...' : task?.status || 'Waiting for task'}
            </Badge>
          </Flex>
        </CardHeader>
        <CardBody pt={2}>
          {loading ? (
            <Flex justify="center" py={8}>
              <Spinner color="brand.500" size="lg" />
            </Flex>
          ) : !publicKey ? (
            <Text color="gray.400" textAlign="center" py={6}>
              Connect your wallet to receive personalized DeFi tasks
            </Text>
          ) : !hasProfile ? (
            <VStack py={6} spacing={3}>
              <Text fontSize="xl">👋</Text>
              <Text color="gray.500" textAlign="center">
                Welcome! Create your coach profile to get started.
              </Text>
              <Button
                colorScheme="orange"
                size="md"
                onClick={handleRegister}
                isLoading={registering}
                loadingText="Creating profile..."
              >
                Create Profile
              </Button>
            </VStack>
          ) : !task ? (
            <VStack py={6} spacing={2}>
              <Text fontSize="xl">☀️</Text>
              <Text color="gray.500" textAlign="center">
                No task yet today — the AI coach generates tasks daily.
              </Text>
              <Text color="gray.400" fontSize="sm" textAlign="center">
                Check back soon, your coach is preparing a task for you!
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={4}>
              <Box>
                <HStack mb={1}>
                  <Badge colorScheme="purple" fontSize="xs">{task.taskType}</Badge>
                  <Badge colorScheme="blue" fontSize="xs">{task.protocol}</Badge>
                </HStack>
                <Text fontWeight={700} fontSize="lg" mt={2}>
                  {task.description}
                </Text>
                {task.suggestedAmount > 0 && (
                  <Text fontSize="sm" color="brand.600" mt={1} fontWeight={600}>
                    Suggested: {(task.suggestedAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </Text>
                )}
              </Box>

              <Box bg="orange.50" p={3} borderRadius="md">
                <Text fontSize="xs" fontWeight={700} color="orange.600" mb={1}>
                  WHY THIS TASK?
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {task.reasoning}
                </Text>
              </Box>

              {task.status === 'Pending' && (
                <HStack spacing={3}>
                  <Button
                    colorScheme="green"
                    flex={1}
                    size="lg"
                    isLoading={actionLoading}
                    onClick={async () => {
                      if (!program || !publicKey) return
                      setActionLoading(true)
                      try {
                        const dayBuf = new Uint8Array(8)
                        new DataView(dayBuf.buffer).setBigInt64(0, BigInt(taskDayTs), true)
                        const [taskPda] = PublicKey.findProgramAddressSync([TASK_SEED, publicKey.toBuffer(), dayBuf], PROGRAM_KEY)
                        const [profilePda] = PublicKey.findProgramAddressSync([PROFILE_SEED, publicKey.toBuffer()], PROGRAM_KEY)
                        await program.methods.acceptTask()
                          .accountsPartial({ task: taskPda, profile: profilePda, user: publicKey })
                          .rpc()
                        toast({ title: 'Task accepted! 🔥', description: 'Complete it to grow your streak', status: 'success', duration: 3000 })
                        loadData()
                      } catch (err) {
                        const msg = (err as Error)?.message ?? 'Something went wrong'
                        if (msg.includes('User rejected')) toast({ title: 'Transaction rejected', status: 'warning', duration: 2000 })
                        else toast({ title: 'Failed', description: msg.slice(0, 80), status: 'error', duration: 3000 })
                      } finally { setActionLoading(false) }
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    colorScheme="red"
                    variant="outline"
                    flex={1}
                    size="lg"
                    isLoading={actionLoading}
                    onClick={async () => {
                      if (!program || !publicKey) return
                      setActionLoading(true)
                      try {
                        const dayBuf = new Uint8Array(8)
                        new DataView(dayBuf.buffer).setBigInt64(0, BigInt(taskDayTs), true)
                        const [taskPda] = PublicKey.findProgramAddressSync([TASK_SEED, publicKey.toBuffer(), dayBuf], PROGRAM_KEY)
                        const [profilePda] = PublicKey.findProgramAddressSync([PROFILE_SEED, publicKey.toBuffer()], PROGRAM_KEY)
                        await program.methods.rejectTask()
                          .accountsPartial({ task: taskPda, profile: profilePda, user: publicKey })
                          .rpc()
                        toast({ title: 'Task skipped', status: 'info', duration: 2000 })
                        loadData()
                      } catch (err) {
                        const msg = (err as Error)?.message ?? 'Something went wrong'
                        if (msg.includes('User rejected')) toast({ title: 'Transaction rejected', status: 'warning', duration: 2000 })
                        else toast({ title: 'Failed', description: msg.slice(0, 80), status: 'error', duration: 3000 })
                      } finally { setActionLoading(false) }
                    }}
                  >
                    Skip
                  </Button>
                </HStack>
              )}

              {task.status === 'Accepted' && !verified && (
                <VStack spacing={3}>
                  <Box bg="yellow.50" p={3} borderRadius="md" w="100%">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="yellow.700" fontWeight={600}>
                        ⏳ In progress — complete the task then verify
                      </Text>
                      <CountdownTimer />
                    </HStack>
                  </Box>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    w="100%"
                    isLoading={actionLoading}
                    onClick={async () => {
                      if (!publicKey || !connection) return
                      setActionLoading(true)
                      try {
                        // Check if user has recent transactions on FlipOrDrain
                        const FLIPORDRAIN_ID = '8SXWVRBFoPCqbLZiDA9oY9EFbD9NVbU7SryoxJQt3ssG'
                        const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 15 })
                        let recentTx = null
                        for (const s of sigs) {
                          if (s.err) continue
                          const age = Date.now() / 1000 - (s.blockTime || 0)
                          if (age > 86400) break
                          const tx = await connection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
                          const usesFlip = tx?.transaction?.message?.instructions?.some(
                            (i: any) => i.programId?.toBase58() === FLIPORDRAIN_ID
                          )
                          if (usesFlip) { recentTx = s; break }
                        }
                        if (recentTx) {
                          setVerified(true)
                          const prev = Number(localStorage.getItem('solcoach_verified') || '0')
                          localStorage.setItem('solcoach_verified', String(prev + 1))
                          toast({
                            title: 'Task verified! ✅',
                            description: `Found recent transaction: ${recentTx.signature.slice(0, 16)}...`,
                            status: 'success',
                            duration: 4000,
                          })
                        } else {
                          toast({
                            title: 'No activity found',
                            description: 'Complete the task first, then come back to verify',
                            status: 'warning',
                            duration: 3000,
                          })
                        }
                      } catch {
                        toast({ title: 'Verification failed', status: 'error', duration: 2000 })
                      } finally { setActionLoading(false) }
                    }}
                  >
                    🔍 Verify Completion
                  </Button>
                </VStack>
              )}

              {(task.status === 'Resolved' || verified) && (
                <Box bg="green.50" p={4} borderRadius="md" textAlign="center">
                  <Text fontSize="lg" mb={1}>🎉</Text>
                  <Text fontSize="sm" color="green.600" fontWeight={700}>
                    Task completed! Streak maintained.
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </CardBody>
      </Card>

      {/* Coach tip */}
      {publicKey && profile && (
        <Card borderRadius="xl" bg="brand.50" border="1px solid" borderColor="brand.200">
          <CardBody>
            <HStack spacing={3}>
              <Text fontSize="2xl">💡</Text>
              <Box>
                <Text fontWeight={700} fontSize="sm" color="brand.700">
                  Coach Tip
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {streak >= 7
                    ? "Amazing streak! You're building great DeFi habits. Consider exploring new protocols."
                    : streak >= 3
                    ? 'Great momentum! Keep accepting daily tasks to level up faster.'
                    : 'Start a streak by accepting your daily task. Consistency is the key to DeFi mastery!'}
                </Text>
              </Box>
            </HStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  )
}

export default HomePage

import { useEffect, useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
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

const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID || 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU'
const PROFILE_SEED = Buffer.from('coach_profile')
const TASK_SEED = Buffer.from('task')

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

const fireGlow = keyframes`
  0%, 100% { text-shadow: 0 0 8px rgba(249, 115, 22, 0.6); }
  50% { text-shadow: 0 0 20px rgba(249, 115, 22, 0.9), 0 0 30px rgba(249, 115, 22, 0.4); }
`

function HomePage() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const toast = useToast()

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
          off += 8 // total_profit
          off += 1 // risk_tolerance
          off += 1 // preferred_protocols
          off += 1 // is_pro
          // pro_expires_at: Option<i64> — 1 byte tag + 8 bytes if Some
          const proTag = d[off]; off += 1
          if (proTag === 1) off += 8
          // level is computed from tasks
          const level = Math.floor(tasksAccepted / 5) + 1
          setProfile({ currentStreak, bestStreak, tasksAccepted, tasksRejected, totalTips, level })
        }
      } catch {
        // no profile yet
      }

      // load today's task
      try {
        const dayTs = Math.floor(Date.now() / 1000 / 86400) * 86400
        const dayBuf = Buffer.alloc(8)
        dayBuf.writeBigInt64LE(BigInt(dayTs))
        const [taskPda] = PublicKey.findProgramAddressSync(
          [TASK_SEED, publicKey.toBuffer(), dayBuf],
          programKey
        )
        const taskInfo = await connection.getAccountInfo(taskPda)
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
      console.error('[home]', err)
    } finally {
      setLoading(false)
    }
  }, [publicKey, connection])

  useEffect(() => { loadData() }, [loadData])

  const streak = profile?.currentStreak ?? 0
  const streakEmoji = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak >= 1 ? '🔥' : '❄️'
  const levelProgress = profile ? ((profile.tasksAccepted % 5) / 5) * 100 : 0

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
              <StatNumber fontSize="lg">{profile?.tasksAccepted ?? 0}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Level</StatLabel>
              <StatNumber fontSize="lg">{profile?.level ?? 1}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Best Streak</StatLabel>
              <StatNumber fontSize="lg">{profile?.bestStreak ?? 0}</StatNumber>
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
                {5 - (profile.tasksAccepted % 5)} tasks to next level
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
          ) : !task ? (
            <VStack py={6} spacing={2}>
              <Text fontSize="xl">☀️</Text>
              <Text color="gray.500" textAlign="center">
                No task yet today — the AI coach generates tasks daily.
              </Text>
              <Text color="gray.400" fontSize="sm" textAlign="center">
                Check back soon or make sure your profile is registered.
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
                    onClick={() => {
                      toast({
                        title: 'Accept task',
                        description: 'On-chain accept_task instruction — requires Anchor client setup',
                        status: 'info',
                        duration: 3000,
                      })
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
                    onClick={() => {
                      toast({
                        title: 'Skip task',
                        description: 'On-chain reject_task instruction — requires Anchor client setup',
                        status: 'info',
                        duration: 3000,
                      })
                    }}
                  >
                    Skip
                  </Button>
                </HStack>
              )}

              {task.status === 'Accepted' && (
                <Box bg="green.50" p={3} borderRadius="md" textAlign="center">
                  <Text fontSize="sm" color="green.600" fontWeight={600}>
                    Task accepted! Complete it to maintain your streak.
                  </Text>
                </Box>
              )}

              {task.status === 'Resolved' && (
                <Box bg="blue.50" p={3} borderRadius="md" textAlign="center">
                  <Text fontSize="sm" color="blue.600" fontWeight={600}>
                    Task completed and resolved by the coach.
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

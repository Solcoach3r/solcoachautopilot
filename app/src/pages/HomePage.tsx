import { useEffect, useState } from 'react'
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
} from '@chakra-ui/react'

const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID || 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU'
const PROFILE_SEED = Buffer.from('coach_profile')

interface ProfileData {
  currentStreak: number
  bestStreak: number
  tasksAccepted: number
  totalTips: number
  level: number
}

function HomePage() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) { setProfile(null); setBalance(null); return }

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const bal = await connection.getBalance(publicKey!)
        if (!cancelled) setBalance(bal)

        // try to load profile
        try {
          const programKey = new PublicKey(PROGRAM_ID)
          const [profilePda] = PublicKey.findProgramAddressSync(
            [PROFILE_SEED, publicKey!.toBuffer()],
            programKey
          )
          const info = await connection.getAccountInfo(profilePda)
          if (info && !cancelled) {
            const d = info.data
            let off = 8 + 32 // disc + user
            const tasksAccepted = Number(d.readBigUInt64LE(off)); off += 8
            off += 8 // tasks_rejected
            const currentStreak = d.readUInt16LE(off); off += 2
            const bestStreak = d.readUInt16LE(off); off += 2
            const level = d[off]; off += 1
            off += 8 // xp
            const totalTips = Number(d.readBigUInt64LE(off))
            setProfile({ currentStreak, bestStreak, tasksAccepted, totalTips, level })
          }
        } catch {
          // profile doesn't exist yet
        }
      } catch (err) {
        console.error('[home]', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [publicKey, connection])

  const streak = profile?.currentStreak ?? 0
  const streakEmoji = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak >= 1 ? '🔥' : ''

  return (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="lg">
            {publicKey ? `Welcome back!` : 'Good morning!'}
          </Heading>
          <Text color="gray.500" mt={1}>
            {publicKey ? "Here's your daily task" : 'Connect wallet to get started'}
          </Text>
        </Box>
        <VStack spacing={0}>
          <Text fontSize="3xl" fontWeight={800}>
            {streak} {streakEmoji}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight={600}>day streak</Text>
        </VStack>
      </Flex>

      {publicKey && balance !== null && (
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
      )}

      {/* task card */}
      <Card borderRadius="xl" overflow="hidden" borderTop="4px solid" borderTopColor="brand.400">
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center">
            <Badge colorScheme="orange" fontSize="xs">Today's Task</Badge>
            <Badge colorScheme="gray" fontSize="xs">
              {loading ? 'Loading...' : 'Pending'}
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
          ) : (
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight={700} fontSize="lg">
                  Stake SOL on Marinade
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Deposit 0.5 SOL into Marinade Finance to earn mSOL staking yield
                </Text>
              </Box>

              <Box bg="orange.50" p={3} borderRadius="md">
                <Text fontSize="xs" fontWeight={700} color="orange.600" mb={1}>
                  WHY THIS TASK?
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Your wallet has idle SOL that could be earning ~7.2% APY through liquid staking.
                  This diversifies your portfolio while maintaining liquidity.
                </Text>
              </Box>

              <HStack spacing={3}>
                <Button colorScheme="green" flex={1} size="lg">
                  Accept
                </Button>
                <Button colorScheme="red" variant="outline" flex={1} size="lg">
                  Skip
                </Button>
              </HStack>
            </VStack>
          )}
        </CardBody>
      </Card>
    </VStack>
  )
}

export default HomePage

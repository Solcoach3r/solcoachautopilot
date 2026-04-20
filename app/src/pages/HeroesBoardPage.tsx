import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import {
  Box,
  VStack,
  Heading,
  Text,
  Flex,
  Spinner,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardBody,
} from '@chakra-ui/react'

const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID || 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU'

interface LeaderEntry {
  user: string
  tasksAccepted: number
  currentStreak: number
  bestStreak: number
  level: number
}

function shortAddr(addr: string) {
  return addr.slice(0, 4) + '...' + addr.slice(-4)
}

function HeroesBoardPage() {
  const { connection } = useConnection()
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const programKey = new PublicKey(PROGRAM_ID)
        const accounts = await connection.getProgramAccounts(programKey)
        if (cancelled) return

        const entries: LeaderEntry[] = []
        for (const { account } of accounts) {
          try {
            const d = account.data
            // UserCoachProfile detection by size range
            if (d.length < 70 || d.length > 120) continue
            let off = 8
            const user = new PublicKey(d.subarray(off, off + 32)).toBase58(); off += 32
            off += 8 // joined_at
            off += 8 // total_tasks_received
            const tasksAccepted = Number(d.readBigUInt64LE(off)); off += 8
            off += 8 // tasks_rejected
            const currentStreak = d.readUInt16LE(off); off += 2
            const bestStreak = d.readUInt16LE(off)
            const level = Math.floor(tasksAccepted / 5) + 1

            if (tasksAccepted > 0) {
              entries.push({ user, tasksAccepted, currentStreak, bestStreak, level })
            }
          } catch {
            // skip
          }
        }

        setLeaders(entries.sort((a, b) => b.bestStreak - a.bestStreak).slice(0, 50))
      } catch (err) {
        // toast shows the error, no need to log
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [connection])

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Leaderboard</Heading>
        <Text color="gray.500" mt={1}>
          Top coaches ranked by streak and consistency
        </Text>
      </Box>

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner color="brand.500" size="lg" />
        </Flex>
      ) : leaders.length === 0 ? (
        <Card borderRadius="xl">
          <CardBody p={8} textAlign="center">
            <Text fontSize="xl" mb={2}>🏆</Text>
            <Text color="gray.400">No coaches yet — be the first to start a streak!</Text>
          </CardBody>
        </Card>
      ) : (
        <Card borderRadius="xl" overflow="hidden">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>#</Th>
                <Th>Coach</Th>
                <Th>Level</Th>
                <Th>Tasks</Th>
                <Th>Streak</Th>
                <Th>Best</Th>
              </Tr>
            </Thead>
            <Tbody>
              {leaders.map((l, i) => (
                <Tr key={l.user}>
                  <Td>
                    <Text fontWeight={800} color={i < 3 ? 'brand.500' : 'gray.500'}>
                      {i + 1}
                    </Text>
                  </Td>
                  <Td fontFamily="mono" fontSize="xs">{shortAddr(l.user)}</Td>
                  <Td>
                    <Badge colorScheme="orange" fontSize="10px">Lv.{l.level}</Badge>
                  </Td>
                  <Td>{l.tasksAccepted}</Td>
                  <Td>
                    {l.currentStreak > 0 ? (
                      <Text fontWeight={600} color="brand.500">
                        {l.currentStreak} {'🔥'.repeat(Math.min(l.currentStreak, 3))}
                      </Text>
                    ) : (
                      <Text color="gray.400">0</Text>
                    )}
                  </Td>
                  <Td fontWeight={700}>{l.bestStreak}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </VStack>
  )
}

export default HeroesBoardPage

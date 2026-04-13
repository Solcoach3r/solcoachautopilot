import { useEffect, useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  Box,
  VStack,
  Heading,
  Text,
  Badge,
  Card,
  CardBody,
  Flex,
  Spinner,
  HStack,
} from '@chakra-ui/react'

const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID || 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU'
const TASK_TYPES = ['Stake', 'Unstake', 'Swap', 'Rebalance', 'Claim Rewards', 'Add Liquidity']
const TASK_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Expired', 'Resolved']

interface HistoryTask {
  pubkey: string
  day: number
  taskType: string
  protocol: string
  description: string
  status: string
  suggestedAmount: number
  actualResult: number | null
}

function HistoryPage() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [tasks, setTasks] = useState<HistoryTask[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) { setTasks([]); return }
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const programKey = new PublicKey(PROGRAM_ID)
        const accounts = await connection.getProgramAccounts(programKey, {
          filters: [
            { memcmp: { offset: 8, bytes: publicKey!.toBase58() } },
          ],
        })

        if (cancelled) return

        const parsed: HistoryTask[] = []
        for (const { pubkey, account } of accounts) {
          try {
            const d = account.data
            if (d.length < 60) continue
            let off = 8 + 32 // disc + user
            const day = Number(d.readBigInt64LE(off)); off += 8
            if (day < 1700000000 || day > 2000000000) continue // sanity
            const taskTypeByte = d[off]; off += 1
            if (taskTypeByte >= TASK_TYPES.length) continue
            const protoLen = d.readUInt32LE(off); off += 4
            if (protoLen > 64) continue
            const protocol = d.subarray(off, off + protoLen).toString('utf8'); off += protoLen
            const descLen = d.readUInt32LE(off); off += 4
            if (descLen > 512) continue
            const description = d.subarray(off, off + descLen).toString('utf8'); off += descLen
            // skip reasoning
            const reasonLen = d.readUInt32LE(off); off += 4
            off += reasonLen
            const suggestedAmount = Number(d.readBigUInt64LE(off)); off += 8
            // suggested_mint: Option<Pubkey> — 1 byte tag + 32 if Some
            const mintTag = d[off]; off += 1
            if (mintTag === 1) off += 32
            const statusByte = d[off]; off += 1
            // tip_amount
            off += 8
            // actual_result: Option<i64> — 1 byte tag + 8 if Some
            const resultTag = d[off]; off += 1
            const actualResult = resultTag === 1 ? Number(d.readBigInt64LE(off)) : null
            if (resultTag === 1) off += 8

            parsed.push({
              pubkey: pubkey.toBase58(),
              day,
              taskType: TASK_TYPES[taskTypeByte],
              protocol,
              description,
              status: TASK_STATUSES[statusByte] || 'Unknown',
              suggestedAmount,
              actualResult,
            })
          } catch {
            // skip
          }
        }

        setTasks(parsed.sort((a, b) => b.day - a.day))
      } catch (err) {
        // toast shows the error, no need to log
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [publicKey, connection])

  const statusColor: Record<string, string> = {
    Pending: 'gray',
    Accepted: 'green',
    Rejected: 'red',
    Expired: 'yellow',
    Resolved: 'blue',
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Task History</Heading>
        <Text color="gray.500" mt={1}>
          Your past tasks and how they performed
        </Text>
      </Box>

      {!publicKey ? (
        <Card borderRadius="xl" p={8} textAlign="center">
          <Text color="gray.400">Connect wallet to view history</Text>
        </Card>
      ) : loading ? (
        <Flex justify="center" py={12}>
          <Spinner color="brand.500" size="lg" />
        </Flex>
      ) : tasks.length === 0 ? (
        <Card borderRadius="xl" p={8} textAlign="center">
          <CardBody>
            <Text fontSize="xl" mb={2}>📋</Text>
            <Text color="gray.400">No tasks yet — check back after your first day!</Text>
          </CardBody>
        </Card>
      ) : (
        <VStack spacing={3} align="stretch">
          {tasks.map((t) => (
            <Card key={t.pubkey} borderRadius="lg" borderLeft="3px solid" borderLeftColor={`${statusColor[t.status]}.400`}>
              <CardBody py={3} px={4}>
                <Flex justify="space-between" align="start">
                  <Box flex={1}>
                    <HStack mb={1}>
                      <Badge colorScheme="purple" fontSize="10px">{t.taskType}</Badge>
                      <Badge colorScheme="blue" fontSize="10px">{t.protocol}</Badge>
                      <Badge colorScheme={statusColor[t.status]} fontSize="10px">{t.status}</Badge>
                    </HStack>
                    <Text fontWeight={600} fontSize="sm">{t.description}</Text>
                    <Text fontSize="xs" color="gray.400" mt={1}>
                      {new Date(t.day * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {t.suggestedAmount > 0 && ` · ${(t.suggestedAmount / LAMPORTS_PER_SOL).toFixed(3)} SOL`}
                    </Text>
                  </Box>
                  {t.actualResult !== null && (
                    <Box textAlign="right">
                      <Text
                        fontWeight={800}
                        fontSize="sm"
                        color={t.actualResult >= 0 ? 'green.500' : 'red.500'}
                      >
                        {t.actualResult >= 0 ? '+' : ''}{(t.actualResult / LAMPORTS_PER_SOL).toFixed(4)} SOL
                      </Text>
                      <Text fontSize="10px" color="gray.400">P&L</Text>
                    </Box>
                  )}
                </Flex>
              </CardBody>
            </Card>
          ))}
        </VStack>
      )}
    </VStack>
  )
}

export default HistoryPage

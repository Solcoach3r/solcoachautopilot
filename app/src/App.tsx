import { Routes, Route, Link as RouterLink } from 'react-router-dom'
import { Box, Container, Flex, Heading, HStack, Link } from '@chakra-ui/react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import LeaderboardPage from './pages/LeaderboardPage'

function App() {
  return (
    <Box minH="100vh">
      <Box
        bgGradient="linear(to-r, brand.400, brand.600)"
        px={6}
        py={3}
      >
        <Container maxW="container.lg">
          <Flex justify="space-between" align="center">
            <Heading size="md" color="white" fontWeight={800}>
              SolCoach
            </Heading>
            <HStack spacing={4}>
              <Link as={RouterLink} to="/" color="whiteAlpha.900" fontSize="sm" fontWeight={600}>
                Today
              </Link>
              <Link as={RouterLink} to="/history" color="whiteAlpha.800" fontSize="sm">
                History
              </Link>
              <Link as={RouterLink} to="/leaderboard" color="whiteAlpha.800" fontSize="sm">
                Leaderboard
              </Link>
              <WalletMultiButton style={{ fontSize: '13px', height: '36px' }} />
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.lg" py={8}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
      </Container>
    </Box>
  )
}

export default App

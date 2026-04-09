import { Routes, Route } from 'react-router-dom'
import { Box, Container, Flex, Heading, HStack, Link } from '@chakra-ui/react'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import LeaderboardPage from './pages/LeaderboardPage'

function App() {
  return (
    <Box minH="100vh">
      {/* header with warm gradient */}
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
              <Link href="/" color="whiteAlpha.900" fontSize="sm" fontWeight={600}>
                Today
              </Link>
              <Link href="/history" color="whiteAlpha.800" fontSize="sm">
                History
              </Link>
              <Link href="/leaderboard" color="whiteAlpha.800" fontSize="sm">
                Leaderboard
              </Link>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* main content */}
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

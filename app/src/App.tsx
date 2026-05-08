import { Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom'
import { Box, Container, Flex, Heading, HStack, Text, Show, Hide, VStack, Button } from '@chakra-ui/react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import HomePage from './pages/HomePage'
import QuestLogPage from './pages/QuestLogPage'
import HeroesBoardPage from './pages/HeroesBoardPage'
import SupportChat from './components/SupportChat'

/* ─── Error Boundary ─── */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.error) {
      return (
        <Flex minH="60vh" align="center" justify="center">
          <VStack spacing={4} textAlign="center" p={8}>
            <Text fontSize="4xl">😵</Text>
            <Heading size="md">Something went wrong</Heading>
            <Text color="gray.400" fontSize="sm">{this.state.error.message}</Text>
            <Button colorScheme="orange" onClick={() => { this.setState({ error: null }); window.location.reload() }}>
              Reload App
            </Button>
          </VStack>
        </Flex>
      )
    }
    return this.props.children
  }
}

function NotFound() {
  return (
    <Flex minH="60vh" align="center" justify="center">
      <VStack spacing={3} textAlign="center">
        <Text fontSize="4xl">🔍</Text>
        <Heading size="md">Page not found</Heading>
        <Text color="gray.400" fontSize="sm">This page doesn't exist</Text>
        <Button as="a" href="/" colorScheme="orange" size="sm">Go Home</Button>
      </VStack>
    </Flex>
  )
}

function NavItem({ to, label, icon, active }: { to: string; label: string; icon: string; active: boolean }) {
  return (
    <Box
      as={RouterLink}
      to={to}
      display="flex"
      flexDir="column"
      alignItems="center"
      gap="2px"
      color={active ? 'brand.500' : 'gray.400'}
      fontWeight={active ? 700 : 500}
      fontSize="xs"
      transition="all 0.2s"
      _hover={{ color: 'brand.500', textDecor: 'none' }}
      flex={1}
      py={2}
    >
      <Text fontSize="xl">{icon}</Text>
      <Text>{label}</Text>
    </Box>
  )
}

function App() {
  const location = useLocation()
  const path = location.pathname

  return (
    <Box minH="100vh" position="relative" overflow="hidden">
      {/* Floating warm blobs */}
      <Box
        position="fixed" top="-100px" right="-60px"
        w="400px" h="400px" borderRadius="50%"
        bg="radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 70%)"
        filter="blur(40px)" pointerEvents="none" zIndex={0}
      />
      <Box
        position="fixed" bottom="100px" left="-80px"
        w="350px" h="350px" borderRadius="50%"
        bg="radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)"
        filter="blur(50px)" pointerEvents="none" zIndex={0}
      />
      <Box
        position="fixed" top="40%" left="50%"
        w="500px" h="500px" borderRadius="50%"
        bg="radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)"
        filter="blur(60px)" pointerEvents="none" zIndex={0}
        transform="translateX(-50%)"
      />

      {/* Desktop top nav */}
      <Box
        position="sticky" top={0} zIndex={100}
        bg="rgba(255,251,245,0.8)"
        backdropFilter="blur(16px)"
        borderBottom="1px solid"
        borderColor="brand.100"
      >
        <Container maxW="container.lg">
          <Flex justify="space-between" align="center" h="60px">
            <HStack spacing={2}>
              <Text fontSize="xl">☀️</Text>
              <Heading size="md" fontWeight={800} color="brand.600">SolCoach</Heading>
            </HStack>

            <Hide below="md">
              <HStack spacing={1}>
                {[
                  { to: '/', label: 'Today', icon: '🎯' },
                  { to: '/history', label: 'Quest Log', icon: '📜' },
                  { to: '/leaderboard', label: 'Rankings', icon: '🏆' },
                ].map(n => (
                  <Box
                    key={n.to}
                    as={RouterLink}
                    to={n.to}
                    px={4} py={2}
                    borderRadius="full"
                    fontSize="sm"
                    fontWeight={path === n.to ? 700 : 500}
                    color={path === n.to ? 'brand.600' : 'gray.500'}
                    bg={path === n.to ? 'brand.50' : 'transparent'}
                    _hover={{ bg: 'brand.50', color: 'brand.600', textDecor: 'none' }}
                    transition="all 0.2s"
                    aria-current={path === n.to ? 'page' : undefined}
                  >
                    {n.icon} {n.label}
                  </Box>
                ))}
              </HStack>
            </Hide>

            <WalletMultiButton style={{
              fontSize: '13px', height: '38px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              fontWeight: 700,
            }} />
          </Flex>
        </Container>
      </Box>

      {/* Main content */}
      <Container maxW="container.lg" py={6} position="relative" zIndex={1} pb={{ base: '120px', md: 6 }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<QuestLogPage />} />
            <Route path="/leaderboard" element={<HeroesBoardPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </Container>

      {/* Support chat widget */}
      <SupportChat />

      {/* Mobile bottom nav */}
      <Show below="md">
        <Box
          position="fixed" bottom={0} left={0} right={0}
          bg="rgba(255,251,245,0.95)"
          backdropFilter="blur(16px)"
          borderTop="1px solid"
          borderColor="brand.100"
          zIndex={100}
          px={4}
          pb="env(safe-area-inset-bottom)"
        >
          <Flex>
            <NavItem to="/" label="Today" icon="🎯" active={path === '/'} />
            <NavItem to="/history" label="Quest Log" icon="📜" active={path === '/history'} />
            <NavItem to="/leaderboard" label="Rankings" icon="🏆" active={path === '/leaderboard'} />
          </Flex>
        </Box>
      </Show>
    </Box>
  )
}

export default App

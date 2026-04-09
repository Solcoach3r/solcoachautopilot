import { Box, Heading, Text, VStack } from '@chakra-ui/react'

// top users by streak, accuracy, and tips given
function LeaderboardPage() {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Leaderboard</Heading>
        <Text color="gray.500" mt={1}>
          Top coaches ranked by streak and accuracy
        </Text>
      </Box>

      <Box
        bg="white"
        borderRadius="xl"
        p={8}
        textAlign="center"
        color="gray.400"
      >
        Coming soon!
      </Box>
    </VStack>
  )
}

export default LeaderboardPage

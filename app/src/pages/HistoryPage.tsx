import { Box, Heading, Text, VStack } from '@chakra-ui/react'

// shows all past tasks with accept/reject status and P&L
function HistoryPage() {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Task History</Heading>
        <Text color="gray.500" mt={1}>
          Your past tasks and how they performed
        </Text>
      </Box>

      <Box
        bg="white"
        borderRadius="xl"
        p={8}
        textAlign="center"
        color="gray.400"
      >
        No tasks yet — check back after your first day!
      </Box>
    </VStack>
  )
}

export default HistoryPage

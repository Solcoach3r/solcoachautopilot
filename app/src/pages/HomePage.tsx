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
  Skeleton,
} from '@chakra-ui/react'

// the main page - shows today's task and your streak!
function HomePage() {
  return (
    <VStack spacing={6} align="stretch">
      {/* streak counter at the top */}
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="lg">Good morning!</Heading>
          <Text color="gray.500" mt={1}>Here's your daily task</Text>
        </Box>
        <VStack spacing={0}>
          <Text fontSize="3xl" fontWeight={800}>0</Text>
          <Text fontSize="xs" color="gray.500" fontWeight={600}>day streak</Text>
        </VStack>
      </Flex>

      {/* today's task card */}
      <Card
        borderRadius="xl"
        overflow="hidden"
        borderTop="4px solid"
        borderTopColor="brand.400"
      >
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center">
            <Badge colorScheme="orange" fontSize="xs">Today's Task</Badge>
            <Badge colorScheme="gray" fontSize="xs">Pending</Badge>
          </Flex>
        </CardHeader>
        <CardBody pt={2}>
          <VStack align="stretch" spacing={4}>
            <Box>
              <Skeleton height="20px" width="80%" />
              <Skeleton height="14px" width="60%" mt={2} />
            </Box>

            <Box bg="orange.50" p={3} borderRadius="md">
              <Text fontSize="xs" fontWeight={700} color="orange.600" mb={1}>
                WHY THIS TASK?
              </Text>
              <Skeleton height="14px" />
              <Skeleton height="14px" width="70%" mt={1} />
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
        </CardBody>
      </Card>

      {/* portfolio overview placeholder */}
      <Card borderRadius="xl">
        <CardBody>
          <Heading size="sm" mb={3}>Portfolio Overview</Heading>
          <Text color="gray.500" fontSize="sm">
            Connect your wallet to see your holdings
          </Text>
        </CardBody>
      </Card>
    </VStack>
  )
}

export default HomePage

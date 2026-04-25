import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box, VStack, HStack, Text, Input, IconButton, Flex, Spinner,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'

const MotionBox = motion(Box as any)

interface Msg { role: 'user' | 'assistant'; content: string }

export default function SupportChat() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: "Hey! I'm SolCoach Support ☀️ Ask me anything about quests, DeFi, or Solana!" },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Msg = { role: 'user', content: text }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs)
    setLoading(true)

    try {
      const apiMessages = newMsgs
        .filter((_, i) => i > 0) // skip initial greeting
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const data = await res.json()
      const reply = data?.content?.[0]?.text || data?.error || 'Sorry, something went wrong.'
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Connection error — please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [input, msgs, loading])

  return (
    <>
      {/* FAB Button */}
      <Box
        position="fixed" bottom={{ base: '80px', md: '24px' }} right="24px" zIndex={200}
        cursor="pointer" onClick={() => setOpen(o => !o)}
        role="button" tabIndex={0} aria-label={open ? 'Close support chat' : 'Open support chat'}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(o => !o)}
      >
        <MotionBox
          w="56px" h="56px" borderRadius="full"
          bg="linear-gradient(135deg, #f97316, #ea580c)"
          display="flex" alignItems="center" justifyContent="center"
          boxShadow="0 4px 20px rgba(249,115,22,0.35)"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <Text fontSize="xl" color="white" lineHeight={1}>
            {open ? '✕' : '💬'}
          </Text>
        </MotionBox>
        {!open && (
          <Box
            position="absolute" top="-4px" right="-4px"
            w="14px" h="14px" borderRadius="full"
            bg="#10B981" border="2px solid white"
          />
        )}
      </Box>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <MotionBox
            position="fixed"
            bottom={{ base: '144px', md: '90px' }}
            right="24px"
            zIndex={200}
            w={{ base: 'calc(100vw - 48px)', md: '380px' }}
            maxH="520px"
            bg="white"
            borderRadius="20px"
            boxShadow="0 12px 48px rgba(0,0,0,0.12)"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <Flex
              px={4} py={3} align="center" gap={3}
              bg="linear-gradient(135deg, #f97316, #ea580c)"
              flexShrink={0}
            >
              <Text fontSize="xl">☀️</Text>
              <Box flex={1}>
                <Text color="white" fontWeight={800} fontSize="sm">SolCoach Support</Text>
                <HStack spacing={1}>
                  <Box w="6px" h="6px" borderRadius="full" bg="#4ade80" />
                  <Text color="whiteAlpha.800" fontSize="2xs">Online — powered by AI</Text>
                </HStack>
              </Box>
            </Flex>

            {/* Messages */}
            <VStack
              flex={1} overflowY="auto" px={4} py={3} spacing={3}
              align="stretch" minH="280px" maxH="380px"
              sx={{
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { bg: 'gray.200', borderRadius: '2px' },
              }}
            >
              {msgs.map((m, i) => (
                <Flex key={i} justify={m.role === 'user' ? 'flex-end' : 'flex-start'}>
                  <Box
                    maxW="85%"
                    bg={m.role === 'user' ? 'brand.500' : 'gray.50'}
                    color={m.role === 'user' ? 'white' : 'gray.700'}
                    px={3} py={2}
                    borderRadius={m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'}
                    fontSize="sm"
                    lineHeight={1.5}
                  >
                    {m.content}
                  </Box>
                </Flex>
              ))}
              {loading && (
                <Flex justify="flex-start">
                  <Box bg="gray.50" px={4} py={2} borderRadius="16px 16px 16px 4px">
                    <HStack spacing={1}>
                      <Box w="6px" h="6px" borderRadius="full" bg="gray.300" className="dotBounce1" sx={{
                        animation: 'dotBounce 1.2s ease-in-out infinite',
                        '@keyframes dotBounce': { '0%,80%,100%': { transform: 'scale(0.6)' }, '40%': { transform: 'scale(1)' } },
                      }} />
                      <Box w="6px" h="6px" borderRadius="full" bg="gray.300" sx={{
                        animation: 'dotBounce 1.2s ease-in-out 0.15s infinite',
                        '@keyframes dotBounce': { '0%,80%,100%': { transform: 'scale(0.6)' }, '40%': { transform: 'scale(1)' } },
                      }} />
                      <Box w="6px" h="6px" borderRadius="full" bg="gray.300" sx={{
                        animation: 'dotBounce 1.2s ease-in-out 0.3s infinite',
                        '@keyframes dotBounce': { '0%,80%,100%': { transform: 'scale(0.6)' }, '40%': { transform: 'scale(1)' } },
                      }} />
                    </HStack>
                  </Box>
                </Flex>
              )}
              <div ref={bottomRef} />
            </VStack>

            {/* Input */}
            <Flex px={3} py={3} gap={2} borderTop="1px solid" borderColor="gray.100" flexShrink={0}>
              <Input
                ref={inputRef}
                flex={1}
                placeholder="Ask anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                bg="gray.50"
                border="none"
                borderRadius="full"
                fontSize="sm"
                _focus={{ bg: 'gray.100', boxShadow: 'none' }}
                _placeholder={{ color: 'gray.400' }}
              />
              <IconButton
                aria-label="Send"
                icon={<Text fontSize="md">➤</Text>}
                onClick={send}
                isDisabled={!input.trim() || loading}
                bg="brand.500"
                color="white"
                borderRadius="full"
                size="sm"
                _hover={{ bg: 'brand.600' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
              />
            </Flex>
          </MotionBox>
        )}
      </AnimatePresence>
    </>
  )
}

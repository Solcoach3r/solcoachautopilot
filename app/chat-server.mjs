import http from 'node:http'

const KEY = process.env.ANTHROPIC_API_KEY || ''
if (!KEY) { console.error('[chat] ANTHROPIC_API_KEY not set'); process.exit(1) }

const SYSTEM = `You are SolCoach Support — a friendly, concise AI assistant for the SolCoach Autopilot app.
This app gives users daily DeFi quests on Solana (staking, swaps, LP, NFTs, etc.) and tracks streaks.
Answer questions about: how quests work, Solana DeFi basics, wallet setup, devnet usage, specific protocols.
Keep answers short (2-4 sentences). Use emoji sparingly. Be warm and encouraging.
If asked about something unrelated to crypto/DeFi/Solana, gently redirect.
The app runs on Solana devnet — remind users to use devnet SOL from faucet if needed.`

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5174'
const MAX_MSG_LEN = 500
const MAX_MSGS = 20

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }

  let body
  try {
    const chunks = []
    for await (const c of req) chunks.push(c)
    body = JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  // Validate messages
  let messages = body.messages
  if (!Array.isArray(messages)) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'messages must be an array' }))
    return
  }
  // Sanitize: only user/assistant roles, cap length
  messages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MSGS)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN) }))

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: SYSTEM, messages }),
    })
    const data = await r.json()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'API request failed' }))
  }
}).listen(3099, () => console.log('[chat] listening on :3099'))

import { createClient } from '@supabase/supabase-js'

// anon key is sufficient for auth.getUser() validation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const ALLOWED_MODEL = 'claude-sonnet-4-5'
const MAX_TOKENS_CAP = 1000
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Auth: require valid Supabase JWT ───────────────────────────────────────
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No autorizado' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Token inválido' })

  // ── Validate and sanitize request body ────────────────────────────────────
  const { messages, max_tokens } = req.body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Payload inválido' })
  }

  // Only allow the first message with exactly one image + one text block
  const msg = messages[0]
  if (!msg || msg.role !== 'user' || !Array.isArray(msg.content)) {
    return res.status(400).json({ error: 'Formato inválido' })
  }

  const imageBlock = msg.content.find(b => b.type === 'image')
  const textBlock  = msg.content.find(b => b.type === 'text')

  if (!imageBlock || !textBlock) {
    return res.status(400).json({ error: 'Se requiere imagen y texto' })
  }

  // Validate image size
  const imageData = imageBlock.source?.data || ''
  if (imageData.length > MAX_IMAGE_SIZE_BYTES * 1.37) { // base64 overhead ~37%
    return res.status(413).json({ error: 'Imagen demasiado grande (máx 5 MB)' })
  }

  // Build a clean, fixed payload — no user-controlled model or system prompt
  const safePayload = {
    model: ALLOWED_MODEL,
    max_tokens: Math.min(Number(max_tokens) || 800, MAX_TOKENS_CAP),
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageBlock.source?.media_type || 'image/jpeg',
            data: imageData,
          }
        },
        { type: 'text', text: textBlock.text }
      ]
    }]
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(safePayload)
  })

  const data = await response.json()
  return res.status(response.status).json(data)
}

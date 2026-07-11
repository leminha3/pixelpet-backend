const router = require('express').Router()

// POST /api/chat
// Body: { messages: [{role, content}] }
router.post('/', async (req, res) => {
  const { messages } = req.body
  if (!messages || !messages.length)
    return res.status(400).json({ error: 'Missing messages' })

  // Use OpenAI if OPENAI_API_KEY is set, otherwise fall back to simple logic
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are Robot — the AI assistant inside the PixelPet app. You help users with computer issues, system optimization, and everyday questions. Reply briefly and in a friendly tone, in English.'
            },
            ...messages
          ],
          max_tokens: 300,
        })
      })
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I ran into an error.'
      return res.json({ reply })
    } catch (err) {
      return res.status(500).json({ error: 'AI error', reply: 'Sorry, I had trouble connecting to the AI.' })
    }
  }

  // Simple fallback when no API key is configured
  const last = messages[messages.length - 1]?.content?.toLowerCase() || ''
  let reply = "I'm not fully connected to AI yet. Add OPENAI_API_KEY to the .env file!"
  if (last.includes('hello') || last.includes('hi')) reply = "Hello! I'm Robot 🤖 Ready to help you!"
  if (last.includes('optimize') || last.includes('slow')) reply = 'Try clearing temp files: press Win+R, type %temp%, then delete everything.'
  if (last.includes('thank')) reply = "You're welcome! Always happy to help 😊"

  res.json({ reply })
})

module.exports = router

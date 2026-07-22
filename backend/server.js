require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const http    = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

// ── Database ──────────────────────────────────────────────────
// serverSelectionTimeoutMS makes a bad/unreachable connection fail within a
// few seconds instead of hanging. bufferCommands:false makes queries fail
// immediately (instead of silently queuing forever) whenever mongoose isn't
// actually connected — this is what was causing login/register to spin
// forever with no error when MONGODB_URI was wrong or MongoDB Atlas's
// Network Access hadn't allowed Railway's IP.
mongoose.set('bufferCommands', false)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pixelpet', {
  serverSelectionTimeoutMS: 8000,
})
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB connection error:', err.message))

// Chat doesn't touch MongoDB at all (it only calls OpenAI), so it's mounted
// before the DB-check middleware below — it should keep working even if the
// database connection is down.
app.use('/api/chat', require('./routes/chat'))

// Reject any OTHER /api request immediately with a clear error if the
// database isn't actually connected yet, instead of letting it hang until
// the client's own fetch timeout kicks in.
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database not connected. Check MONGODB_URI and MongoDB Atlas Network Access settings on the server.'
    })
  }
  next()
})

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'))
app.use('/api/user',    require('./routes/user'))
app.use('/api/gacha',   require('./routes/gacha'))
app.use('/api/admin',   require('./routes/admin'))
app.use('/api/pixels',  require('./routes/pixels'))
app.use('/api/trade',   require('./routes/trade'))

// ── Health check ──────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'PixelPet server running', version: '1.0.0' }))
app.get('/health', (req, res) => res.json({ ok: true }))
app.get('/health/db', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  res.json({ state: states[mongoose.connection.readyState] || 'unknown' })
})

// Diagnoses the Robot chatbot's OpenAI connection without spending chat
// tokens: checks the key is present, then calls the free /v1/models list
// endpoint (any valid key can call it) to confirm the key itself, billing,
// and network path all actually work.
app.get('/health/openai', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.json({ ok: false, reason: 'OPENAI_API_KEY is not set on Railway (Variables tab).' })
  }
  try {
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    })
    const data = await r.json()
    if (!r.ok) {
      return res.json({
        ok: false,
        status: r.status,
        reason: r.status === 401 ? 'OPENAI_API_KEY is invalid or expired.'
          : r.status === 429 ? 'Rate limited, or the OpenAI account has no billing/credit set up.'
          : data.error?.message || 'Unknown error from OpenAI.'
      })
    }
    const hasTargetModel = data.data?.some(m => m.id === 'gpt-4o-mini')
    return res.json({ ok: true, keyValid: true, hasGpt4oMini: !!hasTargetModel })
  } catch (err) {
    return res.json({ ok: false, reason: 'Could not reach OpenAI: ' + err.message })
  }
})

// ── Socket.IO (realtime: admin notifications, trading) ─────────
const connectedUsers = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id)
    socket.userId = userId
  })

  socket.on('disconnect', () => {
    if (socket.userId) connectedUsers.delete(socket.userId)
  })
})

// Export io for use in routes
app.set('io', io)
app.set('connectedUsers', connectedUsers)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`✓ PixelPet server running on port ${PORT}`))
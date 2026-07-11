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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pixelpet')
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err))

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'))
app.use('/api/user',    require('./routes/user'))
app.use('/api/gacha',   require('./routes/gacha'))
app.use('/api/admin',   require('./routes/admin'))
app.use('/api/chat',    require('./routes/chat'))
app.use('/api/pixels',  require('./routes/pixels'))
app.use('/api/trade',   require('./routes/trade'))

// ── Health check ──────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'PixelPet server running', version: '1.0.0' }))
app.get('/health', (req, res) => res.json({ ok: true }))

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

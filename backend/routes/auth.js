const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const { User } = require('../models')
const { signToken } = require('../middleware/auth')

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Missing information' })

    const exists = await User.findOne({ $or: [{ email }, { username }] })
    if (exists) return res.status(400).json({ error: 'Username or email already exists' })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({ username, email, passwordHash })
    await user.save()

    const token = signToken(user)
    res.json({ token, user: safeUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: 'Email does not exist' })
    if (user.isBanned) return res.status(403).json({ error: 'Account is banned' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(400).json({ error: 'Incorrect password' })

    user.lastSeen = new Date()
    await user.save()

    const token = signToken(user)
    res.json({ token, user: safeUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function safeUser(u) {
  return {
    id: u._id, username: u.username, email: u.email,
    role: u.role, gachaPoints: u.gachaPoints,
    unlockedPixels: u.unlockedPixels, activePixels: u.activePixels,
    containerSettings: u.containerSettings,
  }
}

module.exports = router

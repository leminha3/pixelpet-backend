const router = require('express').Router()
const { auth, adminOnly } = require('../middleware/auth')
const { User, Pixel, Notification, GachaHistory } = require('../models')

// All admin routes require auth + adminOnly
router.use(auth, adminOnly)

// ── List all users ──────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { page=1, limit=50, search='' } = req.query
  const query = search
    ? { $or: [{ username: new RegExp(search,'i') }, { email: new RegExp(search,'i') }] }
    : {}
  const users = await User.find(query)
    .select('-passwordHash')
    .sort({ lastSeen: -1 })
    .skip((page-1)*limit).limit(+limit)
  const total = await User.countDocuments(query)
  res.json({ users, total, page: +page })
})

// ── Overall stats ────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const [totalUsers, activeToday, totalGacha] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 86400000) } }),
    GachaHistory.countDocuments(),
  ])
  res.json({ totalUsers, activeToday, totalGacha })
})

// ── Ban / unban user ──────────────────────────────────────────────
router.patch('/users/:id/ban', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true }).select('-passwordHash')
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ ok: true, user })
})
router.patch('/users/:id/unban', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: false }, { new: true }).select('-passwordHash')
  res.json({ ok: true, user })
})

// ── Give gacha points ───────────────────────────────────────────
router.post('/users/:id/give-points', async (req, res) => {
  const { points } = req.body
  if (!points || points <= 0) return res.status(400).json({ error: 'Invalid points amount' })
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $inc: { gachaPoints: points } },
    { new: true }
  ).select('-passwordHash')
  if (!user) return res.status(404).json({ error: 'User not found' })
  // Send realtime notification
  const io = req.app.get('io')
  const connectedUsers = req.app.get('connectedUsers')
  const sockId = connectedUsers.get(user._id.toString())
  if (sockId) io.to(sockId).emit('points-received', { points, total: user.gachaPoints })
  res.json({ ok: true, user })
})

// ── Give pixel directly ──────────────────────────────────────────
router.post('/users/:id/give-pixel', async (req, res) => {
  const { pixelId } = req.body
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.unlockedPixels.includes(pixelId))
    return res.status(400).json({ error: 'User already has this pixel' })
  user.unlockedPixels.push(pixelId)
  await user.save()
  const io = req.app.get('io')
  const connectedUsers = req.app.get('connectedUsers')
  const sockId = connectedUsers.get(user._id.toString())
  if (sockId) io.to(sockId).emit('pixel-received', { pixelId })
  res.json({ ok: true })
})

// ── Send server-wide notification ────────────────────────────────
router.post('/broadcast', async (req, res) => {
  const { title, message, type='info' } = req.body
  if (!title || !message) return res.status(400).json({ error: 'Missing title/message' })
  const notif = new Notification({ userId: null, title, message, type })
  await notif.save()
  const io = req.app.get('io')
  io.emit('broadcast', { title, message, type })
  res.json({ ok: true })
})

// ── Manage pixel definitions ─────────────────────────────────────
router.get('/pixels', async (req, res) => {
  const pixels = await Pixel.find().sort({ rank: 1 })
  res.json(pixels)
})

router.post('/pixels', async (req, res) => {
  try {
    const pixel = new Pixel(req.body)
    await pixel.save()
    res.json(pixel)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.patch('/pixels/:id', async (req, res) => {
  const pixel = await Pixel.findOneAndUpdate(
    { id: req.params.id },
    { ...req.body, updatedAt: new Date() },
    { new: true }
  )
  if (!pixel) return res.status(404).json({ error: 'Pixel not found' })
  res.json(pixel)
})

router.delete('/pixels/:id', async (req, res) => {
  await Pixel.findOneAndDelete({ id: req.params.id })
  res.json({ ok: true })
})

module.exports = router

// routes/user.js
const router = require('express').Router()
const { auth } = require('../middleware/auth')
const { User, Notification } = require('../models')

router.use(auth)

router.get('/me', async (req, res) => {
  const user = await User.findById(req.userId).select('-passwordHash')
  if (!user) return res.status(404).json({ error: 'Not found' })
  user.lastSeen = new Date()
  await user.save()
  res.json(user)
})

router.patch('/settings', async (req, res) => {
  const { containerSettings, activePixels } = req.body
  const update = {}
  if (containerSettings) update.containerSettings = containerSettings
  if (activePixels) update.activePixels = activePixels
  const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-passwordHash')
  res.json(user)
})

router.get('/notifications', async (req, res) => {
  const notifs = await Notification.find({
    $or: [{ userId: req.userId }, { userId: null }]
  }).sort({ createdAt: -1 }).limit(20)
  res.json(notifs)
})

module.exports = router

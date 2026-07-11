const router = require('express').Router()
const { auth } = require('../middleware/auth')
const { User, Trade } = require('../models')

router.use(auth)

// ── Send a trade offer ──────────────────────────────────────────
// POST /api/trade/offer
router.post('/offer', async (req, res) => {
  try {
    const { toUsername, offeredPixel, requestedPixel } = req.body
    if (!toUsername || !offeredPixel || !requestedPixel)
      return res.status(400).json({ error: 'Missing trade information' })

    const fromUser = await User.findById(req.userId)
    const toUser   = await User.findOne({ username: toUsername })

    if (!toUser) return res.status(404).json({ error: `User "${toUsername}" not found` })
    if (toUser._id.equals(fromUser._id)) return res.status(400).json({ error: 'Cannot trade with yourself' })
    if (!fromUser.unlockedPixels.includes(offeredPixel))
      return res.status(400).json({ error: "You don't have this pixel to trade" })
    if (!toUser.unlockedPixels.includes(requestedPixel))
      return res.status(400).json({ error: `That user doesn't have pixel "${requestedPixel}"` })

    // Default pixel cannot be traded
    if (offeredPixel === 'cat') return res.status(400).json({ error: 'Cannot trade the default cat' })
    if (requestedPixel === 'cat') return res.status(400).json({ error: 'Cannot trade the default cat' })

    const trade = await Trade.create({
      fromUser: fromUser._id,
      toUser: toUser._id,
      offeredPixel,
      requestedPixel,
    })

    // Realtime notification
    const io = req.app.get('io')
    const connectedUsers = req.app.get('connectedUsers')
    const sockId = connectedUsers.get(toUser._id.toString())
    if (sockId) {
      io.to(sockId).emit('trade-offer', {
        tradeId: trade._id,
        from: fromUser.username,
        offeredPixel,
        requestedPixel,
      })
    }

    res.json({ ok: true, tradeId: trade._id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── View incoming/outgoing trades ────────────────────────────────
router.get('/my', async (req, res) => {
  const incoming = await Trade.find({ toUser: req.userId, status: 'pending' })
    .populate('fromUser', 'username')
  const outgoing = await Trade.find({ fromUser: req.userId, status: 'pending' })
    .populate('toUser', 'username')
  res.json({ incoming, outgoing })
})

// ── Accept a trade ────────────────────────────────────────────────
router.post('/:id/accept', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('fromUser').populate('toUser')
    if (!trade) return res.status(404).json({ error: 'Trade not found' })
    if (!trade.toUser._id.equals(req.userId))
      return res.status(403).json({ error: 'You are not the recipient of this trade' })
    if (trade.status !== 'pending')
      return res.status(400).json({ error: 'This trade has already been processed' })

    const from = await User.findById(trade.fromUser._id)
    const to   = await User.findById(trade.toUser._id)

    // Verify both sides still have the pixel
    if (!from.unlockedPixels.includes(trade.offeredPixel))
      return res.status(400).json({ error: "The sender no longer has that pixel" })
    if (!to.unlockedPixels.includes(trade.requestedPixel))
      return res.status(400).json({ error: "You no longer have that pixel" })

    // Swap
    from.unlockedPixels = from.unlockedPixels.filter(p => p !== trade.offeredPixel)
    from.unlockedPixels.push(trade.requestedPixel)
    to.unlockedPixels = to.unlockedPixels.filter(p => p !== trade.requestedPixel)
    to.unlockedPixels.push(trade.offeredPixel)

    await from.save()
    await to.save()
    trade.status = 'accepted'
    await trade.save()

    // Realtime notification
    const io = req.app.get('io')
    const connectedUsers = req.app.get('connectedUsers')
    const fromSock = connectedUsers.get(from._id.toString())
    if (fromSock) io.to(fromSock).emit('trade-accepted', { tradeId: trade._id })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Reject a trade ────────────────────────────────────────────────
router.post('/:id/reject', async (req, res) => {
  const trade = await Trade.findById(req.params.id)
  if (!trade) return res.status(404).json({ error: 'Not found' })
  if (!trade.toUser.equals(req.userId) && !trade.fromUser.equals(req.userId))
    return res.status(403).json({ error: 'Not authorized' })
  trade.status = trade.fromUser.equals(req.userId) ? 'cancelled' : 'rejected'
  await trade.save()
  res.json({ ok: true })
})

module.exports = router

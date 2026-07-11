const router = require('express').Router()
const { auth } = require('../middleware/auth')
const { User, Pixel, GachaHistory } = require('../models')

const GACHA_COST = 100 // points required per gacha pull

// Drop rate by rank
const RANK_RATES = {
  white:  0.60,
  blue:   0.28,
  purple: 0.10,
  gold:   0.02,
}

router.use(auth)

// GET /api/gacha/info — view points and rates
router.get('/info', async (req, res) => {
  const user = await User.findById(req.userId).select('gachaPoints unlockedPixels')
  res.json({ gachaPoints: user.gachaPoints, cost: GACHA_COST, rates: RANK_RATES })
})

// POST /api/gacha/pull — perform a gacha pull
router.post('/pull', async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.gachaPoints < GACHA_COST)
    return res.status(400).json({ error: `You need ${GACHA_COST} points, you have ${user.gachaPoints}` })

  // Roll rank
  const roll = Math.random()
  let rank
  if (roll < RANK_RATES.gold)         rank = 'gold'
  else if (roll < RANK_RATES.gold + RANK_RATES.purple) rank = 'purple'
  else if (roll < RANK_RATES.gold + RANK_RATES.purple + RANK_RATES.blue) rank = 'blue'
  else rank = 'white'

  // Get a pixel within the rolled rank (from DB, fallback to hardcoded list)
  let candidates = await Pixel.find({ rank, locked: true })
  if (!candidates.length) {
    // Hardcoded fallback — IDs must match src/pixels/engine.js PIXEL_REGISTRY
    const fallback = {
      white:  [{ id:'robot',   name:'Robot' }],
      blue:   [{ id:'dragon',  name:'Blue Dragon' }, { id:'fox', name:'Fox' }, { id:'owl', name:'Owl' }],
      purple: [{ id:'wolf',    name:'Purple Wolf' }, { id:'crab', name:'Crab' }],
      gold:   [{ id:'phoenix', name:'Phoenix' }],
    }
    candidates = fallback[rank]
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  const isDuplicate = user.unlockedPixels.includes(picked.id)

  user.gachaPoints -= GACHA_COST
  if (!isDuplicate) user.unlockedPixels.push(picked.id)
  else user.gachaPoints += Math.round(GACHA_COST * 0.3) // refund 30% if duplicate

  await user.save()

  const history = new GachaHistory({
    userId: user._id,
    pixelId: picked.id,
    rank,
    isDuplicate,
    pointsRefunded: isDuplicate ? Math.round(GACHA_COST * 0.3) : 0,
  })
  await history.save()

  res.json({
    result: { id: picked.id, name: picked.name, rank },
    isDuplicate,
    pointsRefunded: isDuplicate ? Math.round(GACHA_COST * 0.3) : 0,
    remainingPoints: user.gachaPoints,
  })
})

// GET /api/gacha/history
router.get('/history', async (req, res) => {
  const history = await GachaHistory.find({ userId: req.userId })
    .sort({ createdAt: -1 }).limit(50)
  res.json(history)
})

module.exports = router

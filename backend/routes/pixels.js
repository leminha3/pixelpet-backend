const router = require('express').Router()
const { Pixel } = require('../models')

// GET /api/pixels — public pixel list
router.get('/', async (req, res) => {
  const pixels = await Pixel.find().sort({ rank: 1 })
  res.json(pixels)
})

module.exports = router

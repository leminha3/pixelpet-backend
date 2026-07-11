const jwt = require('jsonwebtoken')
const { User } = require('../models')

const SECRET = process.env.JWT_SECRET || 'pixelpet_secret_change_in_production'

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Login required' })

  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, SECRET)
    req.userId = decoded.id
    req.userRole = decoded.role
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function adminOnly(req, res, next) {
  if (req.userRole !== 'admin')
    return res.status(403).json({ error: 'Admin access only' })
  next()
}

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '30d' })
}

module.exports = { auth, adminOnly, signToken }

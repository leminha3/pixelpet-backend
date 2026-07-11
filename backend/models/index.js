const mongoose = require('mongoose')

// ── User ──────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, minlength: 3 },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },

  // Gacha & pixel
  gachaPoints:  { type: Number, default: 0 },
  unlockedPixels: { type: [String], default: ['cat'] }, // pixel IDs
  activePixels:   { type: [String], default: ['cat'] },

  // Container settings
  containerSettings: {
    direction:    { type: String, default: 'horizontal' },
    slots:        { type: Number, default: 1 },
    bgColor:      { type: String, default: '#ffffff' },
    radius:       { type: String, default: 'pill' },
  },

  isBanned: { type: Boolean, default: false },
  lastSeen:  { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
})

// ── Pixel definition (admin can add more) ──────────────────
const pixelSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true },
  name:     { type: String, required: true },
  rank:     { type: String, enum: ['white','blue','purple','gold'], required: true },
  locked:   { type: Boolean, default: true },
  defaultUnlocked: { type: Boolean, default: false },

  stats: {
    performance: { type: Number, min:0, max:10, default:5 },
    protection:  { type: Number, min:0, max:10, default:5 },
    special:     { type: Number, min:0, max:10, default:5 },
  },

  functions:    [String],
  uniquePower:  String,
  description:  String,

  // Gacha drop weight (within its rank tier)
  dropWeight: { type: Number, default: 100 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// ── Gacha history ─────────────────────────────────────────────
const gachaSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pixelId:   String,
  rank:      String,
  isDuplicate: Boolean,
  pointsRefunded: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
})

// ── Trade ─────────────────────────────────────────────────────
const tradeSchema = new mongoose.Schema({
  fromUser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUser:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  offeredPixel:  String,
  requestedPixel: String,
  status:    { type: String, enum: ['pending','accepted','rejected','cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
})

// ── Notification ──────────────────────────────────────────────
const notifSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast
  title:   String,
  message: String,
  type:    { type: String, enum: ['info','reward','warning','system'], default: 'info' },
  read:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

module.exports = {
  User:         mongoose.model('User', userSchema),
  Pixel:        mongoose.model('Pixel', pixelSchema),
  GachaHistory: mongoose.model('GachaHistory', gachaSchema),
  Trade:        mongoose.model('Trade', tradeSchema),
  Notification: mongoose.model('Notification', notifSchema),
}

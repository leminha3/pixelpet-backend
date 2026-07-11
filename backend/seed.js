// seed.js — run once to initialize the database
// Usage: node seed.js
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const { User, Pixel } = require('./models')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pixelpet'

const PIXELS = [
  {
    id: 'cat',
    name: 'White Cat',
    rank: 'white',
    locked: false,
    defaultUnlocked: true,
    uniquePower: 'Cat Catching — detects & eliminates viruses',
    description: 'Default mascot. Can detect malicious files and alert the user.',
    functions: ['Kill viruses', 'Analyze files', 'Threat alerts'],
    stats: { performance: 4, protection: 7, special: 5 },
    dropWeight: 0, // not available via gacha, given by default
  },
  {
    id: 'robot',
    name: 'Robot',
    rank: 'white',
    locked: false,
    defaultUnlocked: false,
    uniquePower: 'Intelligence — built-in AI chatbot',
    description: 'Smart AI assistant that can answer questions and help with tasks.',
    functions: ['AI Chatbot', 'Automation', 'Reminders'],
    stats: { performance: 3, protection: 2, special: 9 },
    dropWeight: 80,
  },
  {
    id: 'dragon',
    name: 'Blue Dragon',
    rank: 'blue',
    locked: true,
    defaultUnlocked: false,
    uniquePower: 'Dragon Fire — instant full RAM and CPU optimization',
    description: 'A legendary dragon with outstanding system-optimization power.',
    functions: ['Speed up RAM', 'Optimize CPU', 'Game boost', 'Network shield'],
    stats: { performance: 8, protection: 6, special: 7 },
    dropWeight: 70,
  },
  {
    id: 'fox',
    name: 'Smart Fox',
    rank: 'blue',
    locked: true,
    defaultUnlocked: false,
    uniquePower: 'Scent Tracking — automatically cleans junk files and optimizes disk',
    description: 'A cunning fox that can find and remove junk files at lightning speed.',
    functions: ['Clean junk files', 'Optimize disk', 'Disk analysis', 'Smart cleanup'],
    stats: { performance: 7, protection: 5, special: 6 },
    dropWeight: 60,
  },
  {
    id: 'wolf',
    name: 'Purple Wolf',
    rank: 'purple',
    locked: true,
    defaultUnlocked: false,
    uniquePower: 'Shadows — complete privacy protection and full anonymity',
    description: 'A shadow wolf that protects your identity and blocks tracking.',
    functions: ['Block trackers', 'Privacy protection', 'Smart firewall', 'Deep cleanup'],
    stats: { performance: 7, protection: 10, special: 8 },
    dropWeight: 50,
  },
  {
    id: 'owl',
    name: 'Night Owl',
    rank: 'purple',
    locked: true,
    defaultUnlocked: false,
    uniquePower: 'Night Eye — monitors all processes and alerts on anomalies',
    description: 'A divine owl with sharp eyes that watches all system activity.',
    functions: ['Process monitoring', 'Anomaly alerts', 'System logs', 'Kill process'],
    stats: { performance: 8, protection: 9, special: 8 },
    dropWeight: 40,
  },
  {
    id: 'phoenix',
    name: 'Golden Phoenix',
    rank: 'gold',
    locked: true,
    defaultUnlocked: false,
    uniquePower: 'Rebirth — instantly restores the system to its best state',
    description: 'An extremely rare legendary phoenix. Possesses restoration and full optimization power.',
    functions: ['System restore', 'Full optimization', 'Advanced antivirus', 'Self-learning AI'],
    stats: { performance: 10, protection: 10, special: 10 },
    dropWeight: 30,
  },
]

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✓ MongoDB connected successfully')

    // ── Create pixels ──────────────────────────────────────────
    for (const px of PIXELS) {
      const exists = await Pixel.findOne({ id: px.id })
      if (exists) {
        console.log(`  ~ Pixel "${px.name}" already exists, skipping`)
        continue
      }
      await Pixel.create(px)
      console.log(`  ✓ Created pixel: ${px.name} [${px.rank}]`)
    }

    // ── Create admin ─────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pixelpet.com'
    const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@123456'

    const existingAdmin = await User.findOne({ email: adminEmail })
    if (existingAdmin) {
      console.log(`  ~ Admin "${adminEmail}" already exists`)
    } else {
      const passwordHash = await bcrypt.hash(adminPass, 10)
      await User.create({
        username: 'admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        gachaPoints: 9999,
        unlockedPixels: PIXELS.map(p => p.id), // admin gets all pixels
      })
      console.log(`  ✓ Created admin: ${adminEmail}`)
      console.log(`  ✓ Password: ${adminPass}`)
    }

    console.log('\n✅ Seed complete!')
    console.log(`\nAdmin login:\n  Email: ${adminEmail}\n  Pass: ${adminPass}`)
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed error:', err.message)
    process.exit(1)
  }
}

seed()

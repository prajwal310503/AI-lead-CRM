require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Routes
app.use('/api/auth',          require('./routes/auth'))
app.use('/api/ai',            require('./routes/ai'))
app.use('/api/leads',         require('./routes/leads'))
app.use('/api/proposals',     require('./routes/proposals'))
app.use('/api/agreements',    require('./routes/agreements'))
app.use('/api/tasks',         require('./routes/tasks'))
app.use('/api/payments',      require('./routes/payments'))
app.use('/api/vault',         require('./routes/vault'))
app.use('/api/team',          require('./routes/team'))
app.use('/api/settings',      require('./routes/settings'))
app.use('/api/notifications',  require('./routes/notifications'))
app.use('/api/dashboard',     require('./routes/dashboard'))
app.use('/api/portal',        require('./routes/portal'))
app.use('/api/gmb',           require('./routes/gmb'))
app.use('/api/whatsapp',      require('./routes/whatsapp'))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// Start
const server = app.listen(PORT, () => {
  console.log(`\n🚀 StartWebOS Server running on http://localhost:${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)

  // Increase timeout for long-running scrape operations (multiple SerpAPI calls)
  server.timeout = 600000 // 10 minutes

  // Start scheduler
  try {
    require('./services/schedulerService')
    console.log('   Scheduler: Active')
  } catch (e) {
    console.log('   Scheduler: Skipped (', e.message, ')')
  }
})

module.exports = app

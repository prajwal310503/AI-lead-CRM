const router = require('express').Router()
const { supabase } = require('../middleware/auth')
const jwt = require('jsonwebtoken')

// POST /api/portal/login — token-based client auth
router.post('/login', async (req, res) => {
  const { email, token } = req.body
  if (!email || !token) return res.status(400).json({ error: 'Email and token required' })

  const { data: client, error } = await supabase.from('clients').select('*').eq('email', email).eq('portal_token', token).single()
  if (error || !client) return res.status(401).json({ error: 'Invalid credentials' })
  if (!client.is_active) return res.status(403).json({ error: 'Account inactive. Contact StartWeb.' })

  const jwtToken = jwt.sign({ clientId: client.id, type: 'portal' }, process.env.JWT_SECRET || 'startwebos_jwt_2026', { expiresIn: '7d' })
  res.json({ token: jwtToken, client: { id: client.id, name: client.name, business_name: client.business_name, email: client.email } })
})

// Portal middleware
function portalAuth(req, res, next) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'startwebos_jwt_2026')
    if (decoded.type !== 'portal') return res.status(401).json({ error: 'Invalid token type' })
    req.clientId = decoded.clientId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// GET /api/portal/data
router.get('/data', portalAuth, async (req, res) => {
  const [projectsRes, invoicesRes, tasksRes] = await Promise.all([
    supabase.from('projects').select('*').eq('client_id', req.clientId),
    supabase.from('invoices').select('*').eq('client_id', req.clientId),
    supabase.from('tasks').select('*').eq('client_id', req.clientId),
  ])
  res.json({
    projects: projectsRes.data || [],
    invoices: invoicesRes.data || [],
    tasks: tasksRes.data || [],
  })
})

module.exports = router

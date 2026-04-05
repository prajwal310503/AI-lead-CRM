const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = authHeader.slice(7)
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Invalid token' })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    req.user = user
    req.profile = profile
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Auth failed' })
  }
}

function adminOnly(req, res, next) {
  if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}

function managerOrAbove(req, res, next) {
  if (!['admin', 'manager'].includes(req.profile?.role)) return res.status(403).json({ error: 'Manager access required' })
  next()
}

module.exports = { authMiddleware, adminOnly, managerOrAbove, supabase }

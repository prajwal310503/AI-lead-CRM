const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user, profile: req.profile })
})

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  await supabase.auth.signOut()
  res.json({ success: true })
})

module.exports = router

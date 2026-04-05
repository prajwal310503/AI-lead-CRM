const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const { data } = await supabase.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50)
  res.json(data || [])
})

router.put('/read-all', async (req, res) => {
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false)
  res.json({ success: true })
})

router.put('/:id/read', async (req, res) => {
  await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id)
  res.json({ success: true })
})

// Helper to create a notification
async function createNotification(userId, notification) {
  await supabase.from('notifications').insert({ user_id: userId, ...notification })
}

module.exports = router
module.exports.createNotification = createNotification

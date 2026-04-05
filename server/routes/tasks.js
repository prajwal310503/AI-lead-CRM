const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', async (req, res) => {
  let query = supabase.from('tasks').select('*').order('sort_order').order('created_at', { ascending: false })
  if (!['admin', 'manager'].includes(req.profile?.role)) query = query.eq('assigned_to', req.user.id)
  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/', async (req, res) => {
  const { data, error } = await supabase.from('tasks').insert({ ...req.body, created_by: req.user.id }).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.put('/:id', async (req, res) => {
  const { data, error } = await supabase.from('tasks').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', async (req, res) => {
  await supabase.from('tasks').delete().eq('id', req.params.id)
  res.json({ success: true })
})

// GET /api/tasks/:id/comments
router.get('/:id/comments', async (req, res) => {
  const { data } = await supabase.from('task_comments').select('*, profiles(name)').eq('task_id', req.params.id).order('created_at')
  res.json(data || [])
})

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res) => {
  const { data, error } = await supabase.from('task_comments').insert({ task_id: req.params.id, user_id: req.user.id, comment: req.body.comment }).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

module.exports = router

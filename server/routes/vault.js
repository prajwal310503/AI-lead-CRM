const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

// Credentials
router.get('/credentials', async (req, res) => {
  const { clientId } = req.query
  let query = supabase.from('vault_credentials').select('*').order('category')
  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/credentials', async (req, res) => {
  const { data, error } = await supabase.from('vault_credentials').insert({ ...req.body, created_by: req.user.id }).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.put('/credentials/:id', async (req, res) => {
  const { data, error } = await supabase.from('vault_credentials').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.delete('/credentials/:id', async (req, res) => {
  await supabase.from('vault_credentials').delete().eq('id', req.params.id)
  res.json({ success: true })
})

// Files
router.get('/files', async (req, res) => {
  const { clientId } = req.query
  let query = supabase.from('vault_files').select('*').order('created_at', { ascending: false })
  if (clientId) query = query.eq('client_id', clientId)
  const { data } = await query
  res.json(data || [])
})

module.exports = router

const router = require('express').Router()
const { supabase, authMiddleware, adminOnly } = require('../middleware/auth')

router.use(authMiddleware)

// GET /api/team
router.get('/', adminOnly, async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at')
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET /api/team/invite/:token — public (no auth needed for invite acceptance)
router.get('/invite/:token', async (req, res) => {
  const { data, error } = await supabase.from('team_invitations').select('*').eq('token', req.params.token).eq('status', 'pending').single()
  if (error || !data) return res.status(404).json({ error: 'Invalid or expired invitation' })
  if (new Date(data.expires_at) < new Date()) return res.status(400).json({ error: 'Invitation has expired' })
  res.json({ name: data.name, email: data.email, role: data.role })
})

// POST /api/team/accept-invite — public
router.post('/accept-invite', async (req, res) => {
  const { token, password } = req.body
  const { data: invite } = await supabase.from('team_invitations').select('*').eq('token', token).eq('status', 'pending').single()
  if (!invite) return res.status(400).json({ error: 'Invalid invitation' })
  if (new Date(invite.expires_at) < new Date()) return res.status(400).json({ error: 'Invitation expired' })

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: invite.email, password, email_confirm: true,
  })
  if (authError) return res.status(400).json({ error: authError.message })

  // Create profile
  await supabase.from('profiles').insert({ id: authData.user.id, name: invite.name || invite.email, email: invite.email, role: invite.role })

  // Mark invite accepted
  await supabase.from('team_invitations').update({ status: 'accepted' }).eq('id', invite.id)

  res.json({ success: true })
})

// POST /api/team/send-invite
router.post('/send-invite', adminOnly, async (req, res) => {
  const { invitationId } = req.body
  const { data: invite } = await supabase.from('team_invitations').select('*').eq('id', invitationId).single()
  if (!invite) return res.status(404).json({ error: 'Invitation not found' })

  const { data: settings } = await supabase.from('app_settings').select('*').eq('user_id', req.user.id).single()

  try {
    const { sendTeamInviteEmail } = require('../services/emailService')
    await sendTeamInviteEmail({
      to: invite.email, name: invite.name, role: invite.role, token: invite.token,
      frontendUrl: process.env.FRONTEND_URL, settings,
    })
    res.json({ success: true })
  } catch (e) {
    // Still mark as sent even if email fails
    console.error('Email failed:', e.message)
    res.json({ success: true, warning: 'Email may not have been delivered: ' + e.message })
  }
})

// PUT /api/team/:id
router.put('/:id', adminOnly, async (req, res) => {
  const { data, error } = await supabase.from('profiles').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

module.exports = router

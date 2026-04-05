const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

// ── GET /api/agreements ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status } = req.query
  let query = supabase
    .from('agreements')
    .select('*, leads(business_name, phone, email)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── GET /api/agreements/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('agreements')
    .select('*, leads(business_name, phone, email, city), proposals(proposal_number, total, services, ai_content)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── POST /api/agreements ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { data, error } = await supabase
    .from('agreements')
    .insert({ ...req.body, created_by: req.user.id, status: req.body.status || 'draft' })
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── PUT /api/agreements/:id ────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  // Prevent overwriting locks
  const { data: existing } = await supabase
    .from('agreements')
    .select('is_locked')
    .eq('id', req.params.id)
    .single()

  if (existing?.is_locked) {
    // Only allow read-only fields on a locked doc
    const allowed = ['view_count']
    const filtered = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    if (!Object.keys(filtered).length) return res.status(403).json({ error: 'Agreement is locked and cannot be edited.' })
    const { data, error } = await supabase.from('agreements').update(filtered).eq('id', req.params.id).select().single()
    if (error) return res.status(400).json({ error: error.message })
    return res.json(data)
  }

  const { data, error } = await supabase
    .from('agreements')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── PATCH /api/agreements/:id/sign ─────────────────────────────────────────
router.patch('/:id/sign', async (req, res) => {
  const { signer, signature, method = 'draw' } = req.body
  if (!signer || !signature) return res.status(400).json({ error: 'signer and signature required' })

  const agreementId = req.params.id
  const now = new Date().toISOString()

  // Capture IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || req.ip
    || 'unknown'

  // Fetch current state
  const { data: current, error: fetchErr } = await supabase
    .from('agreements')
    .select('your_signed_at, client_signed_at, is_locked, sign_log, lead_id, proposal_id, created_by')
    .eq('id', agreementId)
    .single()

  if (fetchErr || !current) return res.status(404).json({ error: 'Agreement not found' })
  if (current.is_locked) return res.status(403).json({ error: 'Agreement is locked — no further signatures accepted.' })

  // Build update payload
  const signatureField  = signer === 'agency' ? 'your_signature'  : 'client_signature'
  const signedAtField   = signer === 'agency' ? 'your_signed_at'  : 'client_signed_at'

  const agencySigned = signer === 'agency' ? true  : !!current.your_signed_at
  const clientSigned = signer === 'client' ? true  : !!current.client_signed_at
  const bothSigned   = agencySigned && clientSigned

  let status = 'sent'
  if (bothSigned)                             status = 'fully_signed'
  else if (agencySigned || clientSigned)      status = 'partially_signed'

  // Append to sign_log
  const existingLog = Array.isArray(current.sign_log) ? current.sign_log : []
  const newLogEntry = { signer, method, ip, timestamp: now, user_id: req.user.id }
  const sign_log = [...existingLog, newLogEntry]

  const updates = {
    [signatureField]: signature,
    [signedAtField]:  now,
    status,
    sign_log,
    updated_at: now,
    ...(bothSigned ? { is_locked: true, locked_at: now } : {}),
  }

  const { data, error } = await supabase
    .from('agreements')
    .update(updates)
    .eq('id', agreementId)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  // ── On both signed: trigger post-sign workflow ─────────────────────────
  if (bothSigned) {
    setImmediate(async () => {
      try {
        await postSignWorkflow(agreementId, data, req.user.id)
      } catch (e) {
        console.error('[agreements/sign] post-sign workflow error:', e.message)
      }
    })
  }

  res.json(data)
})

// ── POST /api/agreements/:id/send ──────────────────────────────────────────
router.post('/:id/send', async (req, res) => {
  const { data: agreement } = await supabase
    .from('agreements')
    .select('*, leads(email, owner_name, business_name)')
    .eq('id', req.params.id)
    .single()

  if (!agreement) return res.status(404).json({ error: 'Not found' })

  await supabase.from('agreements')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)

  const { data: settings } = await supabase
    .from('app_settings').select('*').eq('user_id', req.user.id).single()

  const lead = agreement.leads
  if (lead?.email && settings?.smtp_user) {
    try {
      const { sendAgreementEmail } = require('../services/emailService')
      await sendAgreementEmail({
        to:    lead.email,
        name:  lead.owner_name || lead.business_name,
        title: agreement.title,
        settings,
      })
    } catch (e) { console.error('[agreements/send] email:', e.message) }
  }

  res.json({ success: true })
})

// ── DELETE /api/agreements/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { data: check } = await supabase
    .from('agreements').select('is_locked').eq('id', req.params.id).single()
  if (check?.is_locked) return res.status(403).json({ error: 'Cannot delete a locked agreement.' })

  const { error } = await supabase.from('agreements').delete().eq('id', req.params.id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// ── Post-sign workflow (fires async after both parties sign) ───────────────
async function postSignWorkflow(agreementId, agreement, userId) {
  const now = new Date().toISOString()

  // Fetch full agreement with lead
  const { data: full } = await supabase
    .from('agreements')
    .select('*, leads(id, business_name, owner_name, email, phone, industry, city)')
    .eq('id', agreementId)
    .single()

  const lead = full?.leads
  const leadId = lead?.id || full?.lead_id || null

  // ── 1. Create Project (if not already exists) ────────────────────────
  let project = null
  const { data: existingProj } = await supabase
    .from('projects')
    .select('id')
    .eq('agreement_id', agreementId)
    .maybeSingle()

  if (!existingProj) {
    const { data: projData } = await supabase.from('projects').insert({
      lead_id:       leadId,
      agreement_id:  agreementId,
      proposal_id:   full?.proposal_id || null,
      created_by:    userId,
      name:          full?.title?.replace('Agreement — ', 'Project — ') || `Project — ${lead?.business_name}`,
      client_name:   lead?.business_name || full?.client_name || 'Client',
      description:   `Auto-created on agreement sign — ${full?.agreement_number}`,
      status:        'active',
      stage:         'kickoff',
      budget:        full?.total_value || full?.total_amount || 0,
      start_date:    now,
      created_at:    now,
      updated_at:    now,
    }).select().single()
    project = projData
    console.log('[agreements] Project created:', project?.id)
  }

  // ── 2. Create Invoice (if not already exists) ─────────────────────────
  let invoice = null
  const { data: existingInv } = await supabase
    .from('invoices')
    .select('id')
    .eq('agreement_id', agreementId)
    .maybeSingle()

  if (!existingInv) {
    const year    = new Date().getFullYear()
    const counter = Math.floor(Math.random() * 9000) + 1000
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString()

    const { data: invData } = await supabase.from('invoices').insert({
      lead_id:        leadId,
      agreement_id:   agreementId,
      proposal_id:    full?.proposal_id || null,
      project_id:     project?.id || null,
      created_by:     userId,
      invoice_number: `SW-${year}-${counter}`,
      title:          `Invoice — ${lead?.business_name || full?.client_name || 'Client'}`,
      client_name:    lead?.business_name || full?.client_name || 'Client',
      client_email:   lead?.email || full?.client_email || null,
      client_phone:   lead?.phone || null,
      status:         'unpaid',
      items:          [{ description: full?.title, qty: 1, unit_price: full?.total_value || full?.total_amount || 0, total: full?.total_value || full?.total_amount || 0 }],
      subtotal:       full?.total_value || full?.total_amount || 0,
      discount:       0,
      tax_percent:    18,
      tax_amount:     Math.round((full?.total_value || full?.total_amount || 0) * 0.18 * 100) / 100,
      total:          Math.round((full?.total_value || full?.total_amount || 0) * 1.18 * 100) / 100,
      due_date:       dueDate,
      payment_terms:  full?.payment_terms || '50-50',
      created_at:     now,
      updated_at:     now,
    }).select().single()
    invoice = invData
    console.log('[agreements] Invoice created:', invoice?.id)
  }

  // ── 3. Update lead stage to Converted ────────────────────────────────
  if (leadId) {
    await supabase.from('leads').update({
      stage:      'Converted',
      status:     'converted',
      updated_at: now,
    }).eq('id', leadId).then(null, () => {})

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id:     leadId,
      user_id:     userId,
      type:        'agreement_signed',
      title:       'Agreement Fully Signed',
      description: `${full?.agreement_number} signed by both parties. Project & Invoice auto-created.`,
    }).then(null, () => {})
  }

  // ── 4. Notify all admins & managers ──────────────────────────────────
  const { data: recipients } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'manager'])

  for (const r of recipients || []) {
    await supabase.from('notifications').insert({
      user_id:  r.id,
      type:     'agreement_signed',
      title:    `Agreement Signed — ${lead?.business_name || full?.client_name}`,
      message:  `${full?.agreement_number} is fully executed. Project & Invoice have been created.`,
      read:     false,
      metadata: { agreement_id: agreementId, lead_id: leadId },
    }).then(null, () => {})
  }

  // ── 5. WhatsApp / Email notify (non-fatal) ────────────────────────────
  const { data: settings } = await supabase
    .from('app_settings').select('*').eq('user_id', userId).single()

  if (lead?.phone && settings?.whatsapp_enabled && settings?.whatsapp_token) {
    try {
      const { sendWhatsAppMessage } = require('../services/whatsappService')
      const msg = `Hi ${lead.owner_name || lead.business_name}, your service agreement with StartWeb has been fully signed! 🎉 Our team will be in touch shortly to kick off your project. Thank you for choosing us.`
      await sendWhatsAppMessage({ phone: lead.phone, message: msg, settings })
    } catch (e) { console.error('[agreements] WA notify:', e.message) }
  }

  if (lead?.email && settings?.smtp_user) {
    try {
      const { sendAgreementSignedEmail } = require('../services/emailService')
      await sendAgreementSignedEmail({
        to:    lead.email,
        name:  lead.owner_name || lead.business_name,
        title: full?.title,
        settings,
      })
    } catch (e) { console.error('[agreements] email notify:', e.message) }
  }
}

module.exports = router

const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('proposals').select('*, leads(business_name), clients(name)').order('created_at', { ascending: false })
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/', async (req, res) => {
  const { data, error } = await supabase.from('proposals').insert({ ...req.body, created_by: req.user.id }).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.put('/:id', async (req, res) => {
  const { data, error } = await supabase.from('proposals').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', async (req, res) => {
  await supabase.from('proposals').delete().eq('id', req.params.id)
  res.json({ success: true })
})

// POST /api/proposals/send  — called immediately after insert with proposalId
router.post('/send', async (req, res) => {
  const { proposalId, email, phone, clientName, projectTitle, total, validUntil, proposalNumber } = req.body
  if (!proposalId) return res.status(400).json({ error: 'proposalId required' })

  const { data: settings } = await supabase.from('app_settings').select('*').eq('user_id', req.user.id).single()

  if (email && settings?.smtp_user) {
    try {
      const { sendProposalEmail } = require('../services/emailService')
      await sendProposalEmail({ to: email, name: clientName, proposalTitle: projectTitle, total: `₹${Number(total).toLocaleString('en-IN')}`, pdfUrl: '', settings })
    } catch (e) { console.error('[proposal/send] email:', e.message) }
  }

  if (phone && settings?.whatsapp_enabled && settings?.whatsapp_token) {
    try {
      const { sendProposalSent } = require('../services/whatsappService')
      await sendProposalSent({ phone, name: clientName, title: projectTitle, link: '', settings })
    } catch (e) { console.error('[proposal/send] WA:', e.message) }
  }

  res.json({ success: true })
})

// POST /api/proposals/:id/send
router.post('/:id/send', async (req, res) => {
  const { data: proposal } = await supabase.from('proposals').select('*, leads(business_name, owner_name, email, phone)').eq('id', req.params.id).single()
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' })

  await supabase.from('proposals').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', req.params.id)

  const { data: settings } = await supabase.from('app_settings').select('*').eq('user_id', req.user.id).single()
  const lead = proposal.leads

  // Send email
  if (lead?.email && settings?.smtp_user) {
    try {
      const { sendProposalEmail } = require('../services/emailService')
      await sendProposalEmail({ to: lead.email, name: lead.owner_name || lead.business_name, proposalTitle: proposal.title, total: `₹${proposal.total?.toLocaleString('en-IN')}`, pdfUrl: proposal.pdf_url, settings })
    } catch (e) { console.error('Email send failed:', e.message) }
  }

  // Send WhatsApp
  if (lead?.phone && settings?.whatsapp_enabled) {
    try {
      const { sendProposalSent } = require('../services/whatsappService')
      await sendProposalSent({ phone: lead.phone, name: lead.owner_name || lead.business_name, title: proposal.title, link: proposal.pdf_url || '', settings })
    } catch (e) { console.error('WA send failed:', e.message) }
  }

  res.json({ success: true })
})

// POST /api/proposals/:id/accept — accept proposal + auto-create agreement, project, invoice
router.post('/:id/accept', async (req, res) => {
  const proposalId = req.params.id

  const { data: proposal, error: propErr } = await supabase
    .from('proposals')
    .select('*, leads(id, business_name, owner_name, email, phone, city, industry)')
    .eq('id', proposalId)
    .single()
  if (propErr || !proposal) return res.status(404).json({ error: 'Proposal not found' })

  const lead = proposal.leads
  const now = new Date().toISOString()

  // ── 1. Mark proposal accepted ──────────────────────────────────────────
  await supabase.from('proposals').update({
    status:      'accepted',
    accepted_at: now,
    updated_at:  now,
  }).eq('id', proposalId)

  // Update lead stage
  if (lead?.id) {
    await supabase.from('leads').update({
      stage:      'Converted',
      status:     'converted',
      updated_at: now,
    }).eq('id', lead.id).then(null, () => {})
  }

  // ── 2. Create Agreement ────────────────────────────────────────────────
  let agreement = null
  try {
    const agNumber = `AGR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
    const serviceList = (proposal.services || []).map(s => `• ${s.name}: ₹${Number(s.price).toLocaleString('en-IN')}`).join('\n')
    const agreementText = `SERVICE AGREEMENT

This agreement is between StartWeb (Agency) and ${lead?.business_name || 'Client'} (Client).

SERVICES AGREED:
${serviceList}

Total Investment: ₹${Number(proposal.total).toLocaleString('en-IN')}
Payment Plan: ${proposal.payment_terms || '50% upfront, 50% on delivery'}
Validity: ${proposal.validity_days || 30} days

PROJECT TERMS:
- Scope as defined in Proposal ${proposal.proposal_number}
- Any additional work outside scope will be quoted separately
- Client to provide content, credentials and feedback within 48 hours

PAYMENT TERMS:
- Invoices are due within 7 days of issue
- Late payments attract 2% per month
- Work pauses if payment is overdue by 14 days

By accepting this proposal, ${lead?.owner_name || 'the client'} agrees to these terms.`

    const { data: agData } = await supabase.from('agreements').insert({
      proposal_id:       proposalId,
      lead_id:           lead?.id || null,
      created_by:        req.user.id,
      agreement_number:  agNumber,
      title:             `Agreement — ${proposal.title}`,
      content:           agreementText,
      status:            'draft',
      total_value:       proposal.total || 0,
      created_at:        now,
      updated_at:        now,
    }).select().single()
    agreement = agData
  } catch (e) {
    console.error('[accept] Agreement create error:', e.message)
  }

  // ── 3. Create Project ──────────────────────────────────────────────────
  let project = null
  try {
    const { data: projData } = await supabase.from('projects').insert({
      lead_id:     lead?.id || null,
      created_by:  req.user.id,
      proposal_id: proposalId,
      name:        proposal.title || `Project — ${lead?.business_name}`,
      client_name: lead?.business_name || 'Client',
      description: `Auto-created from Proposal ${proposal.proposal_number}`,
      status:      'active',
      stage:       'kickoff',
      budget:      proposal.total || 0,
      services:    proposal.services || [],
      start_date:  now,
      created_at:  now,
      updated_at:  now,
    }).select().single()
    project = projData
  } catch (e) {
    console.error('[accept] Project create error:', e.message)
  }

  // ── 4. Create Invoice ──────────────────────────────────────────────────
  let invoice = null
  try {
    const year = new Date().getFullYear()
    const counter = Math.floor(Math.random() * 9000) + 1000
    const invNumber = `SW-${year}-${counter}`
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString()

    const { data: invData } = await supabase.from('invoices').insert({
      lead_id:        lead?.id || null,
      proposal_id:    proposalId,
      project_id:     project?.id || null,
      created_by:     req.user.id,
      invoice_number: invNumber,
      title:          `Invoice — ${proposal.title}`,
      client_name:    lead?.business_name || 'Client',
      client_email:   lead?.email || null,
      client_phone:   lead?.phone || null,
      status:         'unpaid',
      items:          (proposal.services || []).map(s => ({ description: s.name, qty: 1, unit_price: s.price, total: s.price })),
      subtotal:       proposal.subtotal || proposal.total || 0,
      discount:       proposal.discount || 0,
      tax_percent:    proposal.tax_percent || 18,
      tax_amount:     proposal.tax_amount || 0,
      total:          proposal.total || 0,
      due_date:       dueDate,
      payment_terms:  proposal.payment_terms || '50-50',
      created_at:     now,
      updated_at:     now,
    }).select().single()
    invoice = invData
  } catch (e) {
    console.error('[accept] Invoice create error:', e.message)
  }

  // ── 5. Log activity ────────────────────────────────────────────────────
  await supabase.from('lead_activities').insert({
    lead_id:     lead?.id || null,
    user_id:     req.user.id,
    type:        'proposal_accepted',
    title:       'Proposal Accepted',
    description: `${proposal.proposal_number} — ${formatIndianCurrency(proposal.total)} accepted. Agreement + Project + Invoice created.`,
  }).then(null, () => {})

  // ── 6. Notify admins ───────────────────────────────────────────────────
  const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'manager'])
  for (const admin of admins || []) {
    await supabase.from('notifications').insert({
      user_id:  admin.id,
      type:     'proposal_accepted',
      title:    `Proposal Accepted — ${lead?.business_name}`,
      message:  `${proposal.proposal_number} worth ₹${Number(proposal.total).toLocaleString('en-IN')} has been accepted.`,
      read:     false,
      metadata: { proposal_id: proposalId, lead_id: lead?.id },
    }).then(null, () => {})
  }

  res.json({ success: true, agreement, project, invoice })
})

function formatIndianCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

module.exports = router

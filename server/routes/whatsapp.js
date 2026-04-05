const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')
const { createClient } = require('@supabase/supabase-js')
const { sendWhatsApp, sendWhatsAppMedia } = require('../services/whatsappService')

// Admin Supabase client — used by the webhook (no JWT from Meta)
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── GET /api/whatsapp/webhook — verification (Meta / unused for Twilio/AiSensy) ──
router.get('/webhook', async (req, res) => {
  const mode      = req.query['hub.mode']
  const token     = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && challenge) {
    console.log('[WA Webhook] Meta verification request received')
    return res.status(200).send(challenge)
  }
  res.status(200).send('OK')
})

// ── Helper: process and store an inbound WA message ───────────────────────
async function processInbound(fromPhone, msgBody, waMessageId) {
  const clean10 = fromPhone.replace(/^91/, '').replace(/\D/g, '')
  const clean12 = `91${clean10}`

  const { data: leads } = await adminSupabase
    .from('leads')
    .select('id, business_name, created_by, whatsapp_status')
    .or(`phone.eq.${clean10},phone.eq.+91${clean10},phone.eq.${clean12}`)
    .limit(1)

  const lead = leads?.[0] || null

  await adminSupabase.from('whatsapp_messages').insert({
    lead_id:       lead?.id || null,
    direction:     'inbound',
    message:       msgBody,
    body:          msgBody,
    phone:         fromPhone,
    wa_message_id: waMessageId || null,
    message_type:  'reply',
    status:        'received',
    sent_at:       new Date().toISOString(),
  }).then(null, e => console.error('[WA Webhook] Log inbound error:', e.message))

  if (!lead) return

  await adminSupabase.from('leads').update({
    whatsapp_last_reply_at: new Date().toISOString(),
    whatsapp_status:        'replied',
    is_interested:          true,
    updated_at:             new Date().toISOString(),
  }).eq('id', lead.id).then(null, () => {})

  await adminSupabase.from('lead_activities').insert({
    lead_id:     lead.id,
    user_id:     lead.created_by || null,
    type:        'whatsapp_reply',
    title:       'WhatsApp Reply Received',
    description: msgBody.slice(0, 140),
  }).then(null, () => {})

  const { data: staff } = await adminSupabase.from('profiles').select('id').in('role', ['admin', 'manager'])
  for (const member of staff || []) {
    await adminSupabase.from('notifications').insert({
      user_id:  member.id,
      type:     'whatsapp_reply',
      title:    `WhatsApp Reply — ${lead.business_name}`,
      message:  msgBody.slice(0, 120),
      read:     false,
      metadata: { lead_id: lead.id },
    }).then(null, () => {})
  }
}

// ── POST /api/whatsapp/webhook — receive inbound messages (Twilio OR AiSensy) ──
router.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED')

  try {
    const body = req.body

    // ── Twilio format: form-urlencoded with From/Body fields ──────────────
    if (body.From && body.Body !== undefined) {
      const fromPhone = body.From.replace('whatsapp:', '').replace('+', '')
      const msgBody   = body.Body || ''
      const msgId     = body.MessageSid || null
      await processInbound(fromPhone, msgBody, msgId)
      return
    }

    // ── AiSensy format: JSON with source/mobile/message fields ───────────
    if (body.mobile || body.destination) {
      const fromPhone = (body.mobile || body.destination || '').replace(/\D/g, '')
      const msgBody   = body.message || body.text || `[${body.type || 'message'}]`
      const msgId     = body.messageId || null
      await processInbound(fromPhone, msgBody, msgId)
      return
    }

    // ── Meta Cloud API format (legacy fallback) ───────────────────────────
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value
          for (const status of value.statuses || []) {
            await adminSupabase.from('whatsapp_messages')
              .update({ status: status.status, updated_at: new Date().toISOString() })
              .eq('wa_message_id', status.id).then(null, () => {})
          }
          for (const msg of value.messages || []) {
            await processInbound(msg.from, msg.text?.body || `[${msg.type}]`, msg.id)
          }
        }
      }
    }
  } catch (e) {
    console.error('[WA Webhook] Processing error:', e.message)
  }
})

// ── Protected routes below ────────────────────────────────────────────────
router.use(authMiddleware)

// GET /api/whatsapp/messages/:leadId — fetch conversation for a lead
router.get('/messages/:leadId', async (req, res) => {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('lead_id', req.params.leadId)
    .order('sent_at', { ascending: true })
    .limit(100)
  if (error) return res.status(400).json({ error: error.message })
  res.json(data || [])
})

// POST /api/whatsapp/intro/:leadId — manually trigger intro for a lead
router.post('/intro/:leadId', async (req, res) => {
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', req.params.leadId)
    .single()
  if (leadErr || !lead) return res.status(404).json({ error: 'Lead not found' })

  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('*')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
  const settings = settingsRows?.[0] || null

  try {
    const { triggerIntro } = require('../services/whatsappIntroService')
    const result = await triggerIntro(lead, settings, req.user.id)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/whatsapp/send/:leadId — send a text or media WA message to a lead
router.post('/send/:leadId', async (req, res) => {
  const { message, formatted_markdown, media_url, media_type, media_caption } = req.body

  // Must have either text or media
  const sentText  = (message || formatted_markdown || '').trim()
  const hasMedia  = !!(media_url && media_type)
  if (!sentText && !hasMedia) return res.status(400).json({ error: 'message or media required' })

  const { data: lead } = await supabase
    .from('leads')
    .select('id, business_name, phone')
    .eq('id', req.params.leadId)
    .single()
  if (!lead?.phone) return res.status(400).json({ error: 'Lead has no phone number' })

  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('*')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
  const settings = settingsRows?.[0] || null

  const now = new Date().toISOString()

  try {
    let result

    if (hasMedia) {
      // Send media message
      result = await sendWhatsAppMedia(lead.phone, media_type, media_url, media_caption || sentText, settings)
      // If also has caption text, send as a separate text message after media
      if (sentText && !result?.skipped) {
        try { await sendWhatsApp(lead.phone, sentText, settings) } catch {}
      }
    } else {
      // Send plain/markdown text message
      result = await sendWhatsApp(lead.phone, sentText, settings)
    }

    // If provider not configured, tell the client immediately
    if (result?.skipped) {
      return res.status(400).json({ error: result.reason || 'WhatsApp provider not configured. Go to Settings → WhatsApp.' })
    }

    const waMessageId = result?.messages?.[0]?.id || result?.id || null
    const status      = 'sent'
    const displayText = sentText || `[${media_type}: ${media_url}]`

    await supabase.from('whatsapp_messages').insert({
      lead_id:            lead.id,
      user_id:            req.user.id,
      direction:          'outbound',
      message:            displayText,
      body:               displayText,
      formatted_markdown: formatted_markdown || sentText || null,
      sent_message:       displayText,
      media_url:          media_url || null,
      media_type:         media_type || null,
      phone:              lead.phone,
      wa_message_id:      waMessageId,
      message_type:       'custom',
      status,
      sent_at:            now,
    })

    await supabase.from('lead_activities').insert({
      lead_id:     lead.id,
      user_id:     req.user.id,
      type:        'whatsapp',
      title:       'WhatsApp Message Sent',
      description: displayText.replace(/\*/g, '').replace(/_/g, '').slice(0, 120),
    })

    res.json({ success: true, skipped: result?.skipped || false, waMessageId })
  } catch (e) {
    // Log full error so it's visible in server console
    console.error('[WA Send] Error status:', e.response?.status)
    console.error('[WA Send] Error body:', JSON.stringify(e.response?.data))
    const errMsg = e.response?.data?.message
      || e.response?.data?.error?.message
      || e.response?.data?.error
      || (e.response?.status === 401 ? 'AiSensy/Twilio rejected your API key (401 Unauthorized). Check your API Key and Campaign Name in Settings → WhatsApp.' : e.message)
    const displayText = sentText || `[${media_type}]`

    await supabase.from('whatsapp_messages').insert({
      lead_id:       lead.id,
      user_id:       req.user.id,
      direction:     'outbound',
      message:       displayText,
      body:          displayText,
      media_url:     media_url || null,
      media_type:    media_type || null,
      phone:         lead.phone,
      message_type:  'custom',
      status:        'failed',
      error_message: errMsg,
      sent_at:       now,
    }).then(null, () => {})

    res.status(400).json({ error: errMsg })
  }
})

// GET /api/whatsapp/stats — WA stats for dashboard
router.get('/stats', async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [repliesRes, introRes, pendingRes] = await Promise.all([
    supabase.from('whatsapp_messages').select('id', { count: 'exact' })
      .eq('direction', 'inbound').gte('sent_at', today.toISOString()),
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('whatsapp_intro_sent', true),
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('whatsapp_intro_sent', true).eq('whatsapp_status', 'intro_sent').is('whatsapp_last_reply_at', null),
  ])

  res.json({
    replies_today:    repliesRes.count || 0,
    intros_sent:      introRes.count   || 0,
    awaiting_reply:   pendingRes.count || 0,
  })
})

module.exports = router

const axios = require('axios')
const { createClient } = require('@supabase/supabase-js')
const { sendWhatsApp } = require('./whatsappService')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── Fallback intro (no AI key needed) ─────────────────────────────────────
function buildFallbackIntro(lead) {
  const name  = lead.owner_name ? `Hi ${lead.owner_name}` : 'Hi there'
  const biz   = lead.business_name || 'your business'
  const city  = lead.city ? ` in ${lead.city}` : ''
  const noWeb = !lead.website
    ? ` I noticed ${biz} doesn't have a strong online presence yet.`
    : ''
  return `${name}! 👋 I'm Deepak from StartWeb.${noWeb} We help local businesses${city} grow through website, Google & social media. Can I share a quick growth strategy for ${biz}? Just 2 mins! 🚀`
}

// ── AI-generated personalized intro ───────────────────────────────────────
async function generateIntroWithAI(lead, settings) {
  const apiKeys = settings?.api_keys || {}
  const provider = settings?.active_provider || 'claude'
  const model    = settings?.active_model    || 'claude-sonnet-4-6'

  const details = [
    `Business: ${lead.business_name}`,
    lead.owner_name              && `Owner: ${lead.owner_name}`,
    lead.industry                && `Industry: ${lead.industry}`,
    lead.city                    && `City: ${lead.city}`,
    lead.google_rating           && `Google Rating: ${lead.google_rating}/5 (${lead.google_reviews_count || 0} reviews)`,
    `Website: ${lead.website ? 'Has website' : 'No website'}`,
    lead.gmb_status              && `GMB Status: ${lead.gmb_status}`,
    lead.google_reviews_count < 10 && 'Very few reviews — weak online presence',
  ].filter(Boolean).join('\n')

  const prompt = `You are Deepak from StartWeb, a digital marketing agency based in Navi Mumbai. Write a personalized WhatsApp intro message for this lead. Rules: max 3 sentences, friendly and warm (not salesy), mention one specific pain point from their data, end with a soft open question. Do not use excessive emojis.

Lead Details:
${details}

Write ONLY the message text. No quotes. No explanation. No JSON.`

  const opts = { timeout: 15000 }

  try {
    if (provider === 'claude') {
      const key = apiKeys.claude || process.env.ANTHROPIC_API_KEY
      if (!key) return null
      const resp = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: model || 'claude-sonnet-4-6', max_tokens: 220, messages: [{ role: 'user', content: prompt }] },
        { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, ...opts }
      )
      return resp.data.content?.[0]?.text?.trim() || null

    } else if (provider === 'openai') {
      const key = apiKeys.openai || process.env.OPENAI_API_KEY
      if (!key) return null
      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model: model || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 220 },
        { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, ...opts }
      )
      return resp.data.choices?.[0]?.message?.content?.trim() || null

    } else if (provider === 'gemini') {
      const key = apiKeys.gemini || process.env.GEMINI_API_KEY
      if (!key) return null
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { ...opts }
      )
      return resp.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null

    } else {
      // OpenRouter
      const key = apiKeys.openrouter || process.env.OPENROUTER_API_KEY
      if (!key) return null
      const resp = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model: model || 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 220 },
        { headers: { Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://startweb.cloud', 'X-Title': 'StartWebOS', 'Content-Type': 'application/json' }, ...opts }
      )
      return resp.data.choices?.[0]?.message?.content?.trim() || null
    }
  } catch (e) {
    console.error('[WA Intro AI] Error:', e.message)
    return null
  }
}

// ── Follow-up message builder ──────────────────────────────────────────────
function buildFollowupMessage(lead, day) {
  const name = lead.owner_name || 'Sir/Ma\'am'
  const biz  = lead.business_name
  const msgs = {
    3:  `Hi ${name}! 👋 Just following up on my message about ${biz}'s digital growth. We've helped similar ${lead.industry || 'businesses'} in ${lead.city || 'your area'} grow 30–50% online. Can we hop on a quick 10-min call?`,
    7:  `Hello ${name}, hope all's well at ${biz}! I noticed your Google presence could be much stronger — we just helped a ${lead.industry || 'similar business'} in ${lead.city || 'your city'} go from 20 to 200+ monthly leads. Can I send you a free audit?`,
    14: `Hi ${name}! Last follow-up from StartWeb — I have a ready growth proposal for ${biz} covering website + GMB + social media. Investment starts at ₹9,999/mo with guaranteed results. Shall I send it across?`,
  }
  return msgs[day] || msgs[3]
}

// ── Main trigger function ─────────────────────────────────────────────────
// Call this after a lead is created or from the manual trigger route
async function triggerIntro(lead, settings, userId) {
  if (!lead?.phone) {
    return { success: false, error: 'Lead has no phone number' }
  }

  // Generate AI intro or use fallback
  let message = await generateIntroWithAI(lead, settings)
  if (!message) message = buildFallbackIntro(lead)

  // Send via Meta Cloud API
  let waResult    = { skipped: true }
  let waMessageId = null
  let status      = 'pending'

  try {
    waResult    = await sendWhatsApp(lead.phone, message, settings)
    waMessageId = waResult?.messages?.[0]?.id || null
    status      = waResult?.skipped ? 'skipped' : 'sent'
  } catch (e) {
    status = 'failed'
    console.error('[WA Intro] Send error:', e.message)

    await supabase.from('whatsapp_messages').insert({
      lead_id:       lead.id,
      user_id:       userId || lead.created_by || null,
      direction:     'outbound',
      message,
      body:          message,
      phone:         lead.phone,
      message_type:  'intro',
      status:        'failed',
      error_message: e.response?.data?.error?.message || e.message,
      auto_sent:     !userId,
      sent_at:       new Date().toISOString(),
    }).then(null, () => {})

    await supabase.from('leads').update({
      whatsapp_intro_sent:    true,
      whatsapp_intro_sent_at: new Date().toISOString(),
      whatsapp_status:        'intro_failed',
      updated_at:             new Date().toISOString(),
    }).eq('id', lead.id).then(null, () => {})

    return { success: false, error: e.message, message }
  }

  // Log successful send
  await supabase.from('whatsapp_messages').insert({
    lead_id:       lead.id,
    user_id:       userId || lead.created_by || null,
    direction:     'outbound',
    message,
    body:          message,
    phone:         lead.phone,
    wa_message_id: waMessageId,
    message_type:  'intro',
    status,
    auto_sent:     !userId,
    sent_at:       new Date().toISOString(),
  }).catch(e => console.error('[WA Intro] Log error:', e.message))

  // Update lead flags
  await supabase.from('leads').update({
    whatsapp_intro_sent:    true,
    whatsapp_intro_sent_at: new Date().toISOString(),
    whatsapp_status:        status === 'skipped' ? 'intro_skipped' : 'intro_sent',
    updated_at:             new Date().toISOString(),
  }).eq('id', lead.id).then(null, () => {})

  // Log activity
  await supabase.from('lead_activities').insert({
    lead_id:     lead.id,
    user_id:     userId || lead.created_by || null,
    type:        'whatsapp',
    title:       status === 'skipped'
      ? 'WhatsApp Intro (WA Link — API not configured)'
      : 'WhatsApp Intro Sent',
    description: message.slice(0, 140),
  }).then(null, () => {})

  console.log(`[WA Intro] ${status} → ${lead.business_name} (${lead.phone})`)

  return {
    success:      status !== 'failed',
    message,
    status,
    waMessageId,
    skipped:      waResult?.skipped || false,
  }
}

// ── Follow-up trigger (called from cron) ──────────────────────────────────
async function triggerFollowup(lead, day, settings) {
  if (!lead?.phone) return

  const message = buildFollowupMessage(lead, day)

  let waResult    = { skipped: true }
  let waMessageId = null
  let status      = 'pending'

  try {
    waResult    = await sendWhatsApp(lead.phone, message, settings)
    waMessageId = waResult?.messages?.[0]?.id || null
    status      = waResult?.skipped ? 'skipped' : 'sent'
  } catch (e) {
    status = 'failed'
    console.error(`[WA Followup Day ${day}] Send error:`, e.message)
  }

  await supabase.from('whatsapp_messages').insert({
    lead_id:       lead.id,
    user_id:       lead.created_by || null,
    direction:     'outbound',
    message,
    body:          message,
    phone:         lead.phone,
    wa_message_id: waMessageId,
    message_type:  `followup_day_${day}`,
    follow_up_day: day,
    status,
    auto_sent:     true,
    sent_at:       new Date().toISOString(),
  }).then(null, () => {})

  await supabase.from('lead_activities').insert({
    lead_id:     lead.id,
    user_id:     lead.created_by || null,
    type:        'auto_followup',
    title:       `Auto Follow-up Day ${day} Sent`,
    description: message.slice(0, 140),
  }).then(null, () => {})

  await supabase.from('leads').update({
    followup_count:        (lead.followup_count || 0) + 1,
    last_followup_sent_at: new Date().toISOString(),
    whatsapp_status:       `followup_${day}`,
    updated_at:            new Date().toISOString(),
  }).eq('id', lead.id).then(null, () => {})

  if (lead.created_by) {
    await supabase.from('notifications').insert({
      user_id:  lead.created_by,
      type:     'followup_sent',
      title:    `Follow-up Day ${day} — ${lead.business_name}`,
      message:  `Day ${day} auto follow-up ${status === 'failed' ? 'failed' : 'sent'} to ${lead.phone}`,
      read:     false,
      metadata: { lead_id: lead.id, day },
    }).then(null, () => {})
  }

  return { status, message }
}

module.exports = {
  triggerIntro,
  triggerFollowup,
  generateIntroWithAI,
  buildFallbackIntro,
  buildFollowupMessage,
}

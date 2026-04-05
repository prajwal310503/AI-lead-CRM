const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')
const axios = require('axios')
const nodemailer = require('nodemailer')

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const { data } = await supabase.from('app_settings').select('*').eq('user_id', req.user.id)
    .order('updated_at', { ascending: false }).limit(1)
  res.json((data && data[0]) || {})
})

router.put('/', async (req, res) => {
  const incoming = req.body

  // Always embed apify/serpapi tokens inside api_keys JSONB —
  // works on schemas with or without dedicated text columns
  const mergedApiKeys = {
    ...(incoming.api_keys || {}),
    apify_token: incoming.apify_token || incoming.api_keys?.apify_token || '',
    serpapi_key: incoming.serpapi_key || incoming.api_keys?.serpapi_key || '',
  }

  const { apify_token, serpapi_key, ...rest } = incoming

  // ── Full payload (all columns) ──
  const fullPayload = {
    ...rest,
    api_keys:   mergedApiKeys,
    user_id:    req.user.id,
    updated_at: new Date().toISOString(),
  }
  if (apify_token !== undefined) fullPayload.apify_token = apify_token || null
  if (serpapi_key !== undefined) fullPayload.serpapi_key = serpapi_key || null

  // ── Minimal payload — only columns guaranteed to exist in any app_settings table ──
  // This always works even if the table is missing optional columns like default_location etc.
  const minPayload = {
    user_id:    req.user.id,
    api_keys:   mergedApiKeys,
    updated_at: new Date().toISOString(),
  }
  // Ultra-minimal — only user_id + api_keys, in case updated_at column also doesn't exist
  const ultraMinPayload = {
    user_id:  req.user.id,
    api_keys: mergedApiKeys,
  }

  // ── Find existing row ──
  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .eq('user_id', req.user.id)
    .limit(1)

  const existingId = existing?.[0]?.id

  const doSave = async (p) => {
    if (existingId) {
      const { data, error } = await supabase.from('app_settings').update(p).eq('id', existingId).select().limit(1)
      return { data: data?.[0] || null, error }
    } else {
      const { data, error } = await supabase.from('app_settings').insert(p).select().limit(1)
      return { data: data?.[0] || null, error }
    }
  }

  // ── Stage 1: Try full save ──
  let { data, error } = await doSave(fullPayload)

  if (!error && data) {
    console.log('[settings PUT] full save OK, user:', req.user.id)
    return res.json(data)
  }

  // ── Stage 2: Full save failed — log and fall back to minimal save ──
  // This handles schemas missing optional columns (default_location, max_leads, etc.)
  if (error) {
    console.error('[settings PUT] full save failed:', error.message, '— falling back to minimal save')
  }

  const { data: minData, error: minError } = await doSave(minPayload)

  if (!minError && minData) {
    console.log('[settings PUT] minimal save OK (API keys saved). user:', req.user.id)
    return res.json({ ...minData, _partial: true })
  }

  // ── Stage 3: Ultra-minimal save — just user_id + api_keys ──
  console.error('[settings PUT] minimal save also failed:', minError?.message, '— trying ultra-minimal')
  const { data: uData, error: uError } = await doSave(ultraMinPayload)

  if (uError) {
    console.error('[settings PUT] ultra-minimal save failed:', uError.message)
    return res.status(400).json({ error: uError.message })
  }

  console.log('[settings PUT] ultra-minimal save OK. user:', req.user.id)
  res.json({ ...(uData || {}), _partial: true })
})

// POST /api/settings/test-ai
router.post('/test-ai', async (req, res) => {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('active_provider, active_model, api_keys')
    .eq('user_id', req.user.id)
    .single()

  const provider = settings?.active_provider || 'openrouter'
  const model    = settings?.active_model    || 'openai/gpt-4o'
  const apiKeys  = settings?.api_keys        || {}
  const prompt   = 'Reply with exactly: {"ok":true,"msg":"StartWebOS AI connection successful!"}'

  try {
    let result = ''

    if (provider === 'claude') {
      const key = apiKeys.claude || process.env.ANTHROPIC_API_KEY
      if (!key) return res.status(400).json({ error: 'No Claude API key configured' })
      const resp = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: model || 'claude-sonnet-4-6', max_tokens: 128, messages: [{ role: 'user', content: prompt }] },
        { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } }
      )
      result = resp.data.content[0].text

    } else if (provider === 'openai') {
      const key = apiKeys.openai || process.env.OPENAI_API_KEY
      if (!key) return res.status(400).json({ error: 'No OpenAI API key configured' })
      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model: model || 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 128 },
        { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
      )
      result = resp.data.choices[0].message.content

    } else if (provider === 'gemini') {
      const key = apiKeys.gemini || process.env.GEMINI_API_KEY
      if (!key) return res.status(400).json({ error: 'No Gemini API key configured' })
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: prompt }] }] }
      )
      result = resp.data.candidates[0].content.parts[0].text

    } else {
      const key = apiKeys.openrouter || process.env.OPENROUTER_API_KEY
      if (!key) return res.status(400).json({ error: 'No OpenRouter API key configured' })
      const resp = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model: model || 'openai/gpt-4o', messages: [{ role: 'user', content: prompt }] },
        { headers: { Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://startweb.cloud', 'X-Title': 'StartWebOS', 'Content-Type': 'application/json' } }
      )
      result = resp.data.choices[0].message.content
    }

    res.json({ success: true, provider, model, result })
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.response?.data?.message || e.message
    res.status(500).json({ error: msg })
  }
})

// POST /api/settings/test-wa
router.post('/test-wa', async (req, res) => {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('wa_provider, twilio_account_sid, twilio_auth_token, twilio_from, aisensy_api_key, aisensy_sender_id, meta_phone_id, meta_access_token, company_phone')
    .eq('user_id', req.user.id)
    .single()

  const provider = settings?.wa_provider || 'twilio'
  const toPhone  = settings?.company_phone
  if (!toPhone) return res.status(400).json({ error: 'Company phone number is required. Add it in Settings → Company.' })

  const testMsg = '✅ StartWebOS WhatsApp test message. Your integration is working!'

  try {
    if (provider === 'meta') {
      const phoneId = settings?.meta_phone_id
      const token   = settings?.meta_access_token
      if (!phoneId || !token) return res.status(400).json({ error: 'Meta Phone Number ID and Access Token are required.' })
      const cleaned = toPhone.replace(/\D/g, '')
      const to = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
      await axios.post(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        { messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body: testMsg } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
    } else if (provider === 'twilio') {
      const sid   = settings?.twilio_account_sid
      const token = settings?.twilio_auth_token
      const from  = settings?.twilio_from
      if (!sid || !token || !from) return res.status(400).json({ error: 'Twilio Account SID, Auth Token and From Number are required.' })

      const cleaned = toPhone.replace(/\D/g, '')
      const to = cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:${to}`, Body: testMsg }),
        { auth: { username: sid, password: token }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    } else if (provider === 'aisensy') {
      const apiKey   = settings?.aisensy_api_key
      const senderId = settings?.aisensy_sender_id
      if (!apiKey) return res.status(400).json({ error: 'AiSensy API Key is required.' })

      const cleaned = toPhone.replace(/\D/g, '')
      const to = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
      await axios.post(
        'https://backend.aisensy.com/campaign/t1/api/v2',
        {
          apiKey,
          campaignName: senderId || 'Test',
          destination:  to,
          userName:     'StartWebOS',
          templateParams: [testMsg],
          source:       'new-landing-page form',
          media:        {},
          buttons:      [],
          carouselCards:[],
          location:     {},
        },
        { headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      return res.status(400).json({ error: 'Unknown WhatsApp provider selected.' })
    }

    res.json({ success: true, message: `Test message sent to ${toPhone} via ${provider}` })
  } catch (e) {
    console.error('[WA Test] Status:', e.response?.status)
    console.error('[WA Test] Body:', JSON.stringify(e.response?.data))
    const raw = e.response?.data
    const msg = (typeof raw === 'string' ? raw : null)
      || raw?.message
      || raw?.error?.message
      || raw?.error
      || e.message
    const hint = e.response?.status === 401
      ? ' — Your AiSensy API Key is invalid. Go to AiSensy Dashboard → Settings → API and copy the correct key.'
      : e.response?.status === 404
      ? ' — Campaign not found. Make sure the Campaign Name exactly matches an approved campaign in your AiSensy account.'
      : ''
    res.status(500).json({ error: msg + hint })
  }
})

// POST /api/settings/test-email
router.post('/test-email', async (req, res) => {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, company_email')
    .eq('user_id', req.user.id)
    .single()

  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, company_email } = settings || {}
  if (!smtp_host || !smtp_user || !smtp_pass) {
    return res.status(400).json({ error: 'SMTP host, user, and password are required. Configure them in Settings → Email.' })
  }

  const toEmail = company_email || smtp_user
  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: Number(smtp_port) || 587,
      secure: Number(smtp_port) === 465,
      auth: { user: smtp_user, pass: smtp_pass },
    })
    await transporter.sendMail({
      from: `"${smtp_from_name || 'StartWebOS'}" <${smtp_user}>`,
      to: toEmail,
      subject: '✅ StartWebOS Email Test',
      html: '<p>Your email integration is working! <strong>StartWebOS SMTP is configured correctly.</strong></p>',
    })
    res.json({ success: true, message: `Test email sent to ${toEmail}` })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router

const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')
const axios = require('axios')

router.use(authMiddleware)

// POST /api/ai/complete
// Proxies AI calls server-side to avoid browser CORS restrictions
router.post('/complete', async (req, res) => {
  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt is required' })

  // Fetch user's AI settings from Supabase
  const { data: settings } = await supabase
    .from('app_settings')
    .select('active_provider, active_model, api_keys')
    .eq('user_id', req.user.id)
    .single()

  const provider = settings?.active_provider || 'openrouter'
  const model    = settings?.active_model    || 'openai/gpt-4o'
  const apiKeys  = settings?.api_keys        || {}

  try {
    let result = ''

    if (provider === 'claude') {
      const key = apiKeys.claude || process.env.ANTHROPIC_API_KEY
      if (!key) return res.status(400).json({ error: 'No Claude API key configured. Add it in Settings → AI.' })
      const resp = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: model || 'claude-sonnet-4-6', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] },
        { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } }
      )
      result = resp.data.content[0].text

    } else if (provider === 'openai') {
      const key = apiKeys.openai || process.env.OPENAI_API_KEY
      if (!key) return res.status(400).json({ error: 'No OpenAI API key configured. Add it in Settings → AI.' })
      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model: model || 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 2048 },
        { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
      )
      result = resp.data.choices[0].message.content

    } else if (provider === 'gemini') {
      const key = apiKeys.gemini || process.env.GEMINI_API_KEY
      if (!key) return res.status(400).json({ error: 'No Gemini API key configured. Add it in Settings → AI.' })
      const geminiModel = model || 'gemini-1.5-flash'
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: prompt }] }] }
      )
      result = resp.data.candidates[0].content.parts[0].text

    } else {
      // openrouter (default)
      const key = apiKeys.openrouter || process.env.OPENROUTER_API_KEY
      if (!key) return res.status(400).json({ error: 'No OpenRouter API key configured. Add it in Settings → AI.' })
      const resp = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model: model || 'openai/gpt-4o', messages: [{ role: 'user', content: prompt }] },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': 'https://startweb.cloud',
            'X-Title': 'StartWebOS',
            'Content-Type': 'application/json',
          },
        }
      )
      result = resp.data.choices[0].message.content
    }

    res.json({ result })
  } catch (e) {
    console.error('AI route error:', e.response?.data || e.message)
    const msg =
      e.response?.data?.error?.message ||
      e.response?.data?.message ||
      e.message
    res.status(500).json({ error: msg })
  }
})

module.exports = router

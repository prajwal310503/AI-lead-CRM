const router = require('express').Router()
const { authMiddleware, supabase } = require('../middleware/auth')
const axios = require('axios')

router.use(authMiddleware)

// Resolve Google Places API key: env var takes priority, then user settings
const getKey = async (userId) => {
  if (process.env.GOOGLE_MAPS_KEY) return process.env.GOOGLE_MAPS_KEY
  const { data } = await supabase
    .from('app_settings')
    .select('api_keys')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.api_keys?.google_places || null
}

// GET /api/gmb/autocomplete?input=sharma+dental
router.get('/autocomplete', async (req, res) => {
  const KEY = await getKey(req.user.id)
  if (!KEY) return res.json({ predictions: [] })
  const { input } = req.query
  if (!input || input.trim().length < 2) return res.json({ predictions: [] })

  try {
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      { params: { input: input.trim(), types: 'establishment', language: 'en', key: KEY }, timeout: 5000 }
    )
    const predictions = (data.predictions || []).slice(0, 6).map((p) => ({
      place_id: p.place_id,
      name: p.structured_formatting?.main_text || p.description,
      address: p.structured_formatting?.secondary_text || '',
    }))
    res.json({ predictions })
  } catch {
    res.json({ predictions: [] })
  }
})

// GET /api/gmb/details?place_id=ChIJ...
router.get('/details', async (req, res) => {
  const KEY = await getKey(req.user.id)
  if (!KEY) return res.json({ result: null })
  const { place_id } = req.query
  if (!place_id) return res.json({ result: null })

  try {
    const fields = 'name,formatted_phone_number,website,rating,user_ratings_total,formatted_address,address_components,business_status,url'
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      { params: { place_id, fields, key: KEY }, timeout: 5000 }
    )
    if (!data.result) return res.json({ result: null })

    const p = data.result
    const getComp = (type) => p.address_components?.find((c) => c.types.includes(type))?.long_name || ''

    res.json({
      result: {
        business_name: p.name || '',
        phone: p.formatted_phone_number || '',
        website: p.website || '',
        google_rating: p.rating || '',
        google_reviews_count: p.user_ratings_total || 0,
        city: getComp('locality') || getComp('administrative_area_level_2'),
        area: getComp('sublocality_level_1') || getComp('sublocality'),
        location: p.formatted_address || '',
        google_maps_url: p.url || '',
        gmb_status: p.business_status === 'OPERATIONAL' ? 'claimed' : '',
      },
    })
  } catch {
    res.json({ result: null })
  }
})

module.exports = router

const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')
const axios = require('axios')

router.use(authMiddleware)

// GET /api/leads
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .or('is_active.is.null,is_active.eq.true')  // exclude soft-deleted
    .order('created_at', { ascending: false })
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// Known leads columns — keeps insert/update safe even if client sends extra fields
const LEAD_COLUMNS = new Set([
  'business_name','owner_name','phone','email','website','industry','city','location','area',
  'google_rating','google_reviews_count','gmb_status',
  'instagram_url','facebook_url','linkedin_url','youtube_url','twitter_url','google_maps_url',
  'social_data','health_score','website_score','seo_score','social_score','competitor_score',
  'revenue_estimate','missed_revenue_estimate','urgency_level','deal_probability',
  'recommended_services','ideal_package','ai_analysis','notes',
  'status','source','is_priority','is_analysed','is_interested','is_active',
  'next_followup_date','followup_count','auto_followup','auto_followup_days','last_contacted',
])

function pickLeadFields(body) {
  return Object.fromEntries(Object.entries(body).filter(([k]) => LEAD_COLUMNS.has(k)))
}

// POST /api/leads/bulk  — insert multiple leads at once (used by Lead Scraper save)
router.post('/bulk', async (req, res) => {
  const { leads } = req.body
  if (!Array.isArray(leads) || !leads.length) return res.status(400).json({ error: 'leads array required' })
  const payload = leads.map(r => ({ ...pickLeadFields(r), created_by: req.user.id, status: r.status || 'cold' }))
  const { data, error } = await supabase.from('leads').insert(payload).select()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST /api/leads
router.post('/', async (req, res) => {
  const payload = { ...pickLeadFields(req.body), created_by: req.user.id }
  const { data, error } = await supabase.from('leads').insert(payload).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)

  // Async: trigger WhatsApp intro if enabled (fire-and-forget, after response sent)
  if (data?.phone) {
    setImmediate(async () => {
      try {
        const { data: settingsRows } = await supabase
          .from('app_settings')
          .select('*')
          .eq('user_id', req.user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
        const settings = settingsRows?.[0] || null
        if (settings?.whatsapp_enabled && settings?.wa_auto_intro) {
          const { triggerIntro } = require('../services/whatsappIntroService')
          await triggerIntro(data, settings, req.user.id)
        }
      } catch (e) {
        console.error('[WA Auto-Intro] Error:', e.message)
      }
    })
  }
})

// PUT /api/leads/:id/stage
router.put('/:id/stage', async (req, res) => {
  const { stage, prev_stage } = req.body
  if (!stage) return res.status(400).json({ error: 'stage is required' })
  const { data, error } = await supabase
    .from('leads')
    .update({ status: stage, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  // Log activity (fire-and-forget)
  supabase.from('lead_activities').insert({
    lead_id: req.params.id,
    user_id: req.user.id,
    type: 'stage_changed',
    title: `Stage changed to ${stage}`,
    description: prev_stage ? `From ${prev_stage} to ${stage}` : `Set to ${stage}`,
  }).then(null, () => {})
  res.json(data)
})

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  const payload = { ...pickLeadFields(req.body), updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from('leads').update(payload).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('leads').delete().eq('id', req.params.id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// ============================================================
// SCRAPING ENGINE — Apify / SerpAPI / Google Places / Mock
// ============================================================

// ─── Apify Google Maps Scraper ────────────────────────────────────────────────
async function fetchApify(token, searchStrings, maxCrawledPlaces) {
  try {
    const { data } = await axios.post(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${token}&timeout=120`,
      {
        searchStringsArray: searchStrings,
        maxCrawledPlaces: Math.min(maxCrawledPlaces, 500),
        language: 'en',
        maxImages: 0,
        scrapeDirectories: false,
        includeHistogram: false,
        includeOpeningHours: false,
        includePeopleAlsoSearch: false,
      },
      { timeout: 130000 }
    )
    return Array.isArray(data) ? data.map(mapApifyResult) : []
  } catch (e) {
    console.error('Apify error:', e.message)
    return null // null = failed (not empty)
  }
}

function mapApifyResult(r) {
  const addrParts = (r.address || '').split(',')
  return {
    business_name:        r.title || r.name || '',
    phone:                r.phone || null,
    email:                r.email || null,
    website:              r.website || null,
    location:             r.address || null,
    city:                 r.city || addrParts.slice(-2, -1)[0]?.trim() || null,
    area:                 addrParts[0]?.trim() || null,
    industry:             r.categoryName || null,
    google_rating:        r.totalScore ? parseFloat(parseFloat(r.totalScore).toFixed(1)) : null,
    google_reviews_count: r.reviewsCount || 0,
    gmb_status:           r.claimThisBusiness === false ? 'claimed' : 'unclaimed',
    google_maps_url:      r.url || null,
    place_id:             r.placeId || null,
  }
}

// ─── SerpAPI Google Maps (with pagination) ────────────────────────────────────
async function fetchSerpAPI(apiKey, searchStrings, maxResults, startOffset = 0) {
  const allResults = []
  for (const q of searchStrings) {
    let start = startOffset
    while (allResults.length < maxResults) {
      try {
        const { data } = await axios.get('https://serpapi.com/search.json', {
          params: { engine: 'google_maps', q, api_key: apiKey, start, hl: 'en', gl: 'in' },
          timeout: 30000,
        })
        const batch = data.local_results || []
        if (!batch.length) break
        allResults.push(...batch.map(r => mapSerpResult(r, q)))
        if (batch.length < 20) break // last page
        start += 20
        if (allResults.length >= maxResults) break
      } catch (e) {
        console.error('SerpAPI error:', e.message)
        break
      }
    }
    if (allResults.length >= maxResults) break
  }
  return allResults.slice(0, maxResults)
}

function mapSerpResult(r, query = '') {
  return {
    business_name:        r.title || '',
    phone:                r.phone || null,
    email:                null,
    website:              r.website || null,
    location:             r.address || null,
    city:                 (r.address || '').split(',').slice(-2, -1)[0]?.trim() || null,
    area:                 (r.address || '').split(',')[0]?.trim() || null,
    industry:             r.type || query.split(' in ')[0] || null,
    google_rating:        r.rating ? parseFloat(r.rating) : null,
    google_reviews_count: r.reviews || 0,
    gmb_status:           r.claimed_status === 'Claimed' ? 'claimed' : 'unclaimed',
    google_maps_url:      r.link || null,
    place_id:             r.place_id || null,
  }
}

// ─── Google Places API ────────────────────────────────────────────────────────
async function fetchGooglePlaces(apiKey, searchStrings, maxResults) {
  const allResults = []
  for (const q of searchStrings) {
    try {
      const { data: gp } = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: { query: q, key: apiKey, language: 'en' },
        timeout: 10000,
      })
      if (gp.status === 'OK' && gp.results?.length) {
        allResults.push(...gp.results.map((p, i) => {
          const parts = (p.formatted_address || '').split(',')
          return {
            business_name:        p.name,
            location:             p.formatted_address || '',
            city:                 parts[parts.length - 3]?.trim() || null,
            area:                 parts[0]?.trim() || null,
            industry:             q.split(' in ')[0] || null,
            google_rating:        p.rating || null,
            google_reviews_count: p.user_ratings_total || 0,
            gmb_status:           p.business_status === 'OPERATIONAL' ? 'claimed' : 'unknown',
            website:              null,
            phone:                null,
            google_maps_url:      `https://maps.google.com/?place_id=${p.place_id}`,
            place_id:             p.place_id || null,
          }
        }))
      }
    } catch (e) { console.error('Google Places error:', e.message) }
    if (allResults.length >= maxResults) break
  }
  return allResults.slice(0, maxResults)
}


// ─── Server-side deduplication ────────────────────────────────────────────────
async function deduplicateResults(rawResults, userId, seenPlaceIds = []) {
  if (!rawResults.length) return { newResults: [], duplicates: 0, duplicateResults: [], newSeenPlaceIds: [] }

  const seenSet = new Set(seenPlaceIds)

  // Collect values to batch-check
  const phones   = [...new Set(rawResults.map(r => r.phone).filter(Boolean))]
  const websites = [...new Set(rawResults.map(r => r.website).filter(Boolean))]
  const names    = [...new Set(rawResults.map(r => r.business_name).filter(Boolean))]

  const existingPhones   = new Set()
  const existingWebsites = new Set()
  const existingNames    = new Set()

  // Check ALL active leads — if a lead is saved in CRM (any source/status), it's a duplicate
  const activeFilter = (q) => q.or('is_active.is.null,is_active.eq.true')

  const withFallback = async (query, fallbackQuery) => {
    const { data, error } = await query
    if (error) { const r = await fallbackQuery; return r.data || [] }
    return data || []
  }

  if (phones.length) {
    const base = supabase.from('leads').select('phone').eq('created_by', userId).in('phone', phones)
    const data = await withFallback(activeFilter(base), supabase.from('leads').select('phone').eq('created_by', userId).in('phone', phones))
    data.forEach(r => r.phone && existingPhones.add(r.phone))
  }
  if (websites.length) {
    const base = supabase.from('leads').select('website').eq('created_by', userId)
    const data = await withFallback(activeFilter(base), supabase.from('leads').select('website').eq('created_by', userId))
    data.forEach(r => {
      if (r.website) existingWebsites.add(r.website.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase())
    })
  }
  if (names.length) {
    const base = supabase.from('leads').select('business_name').eq('created_by', userId).in('business_name', names)
    const data = await withFallback(activeFilter(base), supabase.from('leads').select('business_name').eq('created_by', userId).in('business_name', names))
    data.forEach(r => r.business_name && existingNames.add(r.business_name.toLowerCase().trim()))
  }

  let duplicates = 0
  const newResults = []
  const duplicateResults = []
  const sessionNames   = new Set()
  const sessionPhones  = new Set()
  const sessionWebsites= new Set()

  for (const r of rawResults) {
    const placeKey   = r.place_id || null
    const nameKey    = (r.business_name || '').toLowerCase().trim()
    const websiteKey = r.website ? r.website.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase() : null
    const phoneKey   = r.phone || null

    // If already seen in this session (via place_id) — skip silently, don't re-count
    if (placeKey && seenSet.has(placeKey)) continue

    const isCRMDup =
      existingNames.has(nameKey) ||
      sessionNames.has(nameKey) ||
      (phoneKey && (existingPhones.has(phoneKey) || sessionPhones.has(phoneKey))) ||
      (websiteKey && (existingWebsites.has(websiteKey) || sessionWebsites.has(websiteKey)))

    // Always track identifiers (new OR dup) so same business isn't processed again
    if (placeKey) seenSet.add(placeKey)
    sessionNames.add(nameKey)
    if (phoneKey) sessionPhones.add(phoneKey)
    if (websiteKey) sessionWebsites.add(websiteKey)

    if (isCRMDup) {
      duplicates++
      duplicateResults.push(r)
    } else {
      newResults.push(r)
    }
  }

  return { newResults, duplicates, duplicateResults, newSeenPlaceIds: [...seenSet] }
}

// ─── GET /api/leads/check-api ─────────────────────────────────────────────────
// Returns which API keys are configured for the current user (no key values exposed)
router.get('/check-api', async (req, res) => {
  const { data: rows } = await supabase
    .from('app_settings')
    .select('*')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)

  const settings = (rows && rows.length > 0) ? rows[0] : null
  const apiKeys  = settings?.api_keys || {}

  const apify   = !!(settings?.apify_token  || apiKeys.apify_token  || apiKeys.apifyToken  || process.env.APIFY_TOKEN)
  const serpapi = !!(settings?.serpapi_key  || apiKeys.serpapi_key  || apiKeys.serpapiKey  || process.env.SERPAPI_KEY)
  const google  = !!(apiKeys.google_places  || apiKeys.googlePlaces || process.env.GOOGLE_PLACES_KEY)

  res.json({
    has_apify:   apify,
    has_serpapi: serpapi,
    has_google:  google,
    any_key:     apify || serpapi || google,
    row_found:   !!settings,
    updated_at:  settings?.updated_at || null,
  })
})

// ─── POST /api/leads/scrape ───────────────────────────────────────────────────
// SQL to run in Supabase before using sessions:
// CREATE TABLE IF NOT EXISTS scrape_sessions (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   keywords TEXT[] NOT NULL DEFAULT '{}',
//   locations TEXT[] NOT NULL DEFAULT '{}',
//   "limit" INTEGER NOT NULL DEFAULT 50,
//   current_offset INTEGER DEFAULT 0,
//   total_fetched INTEGER DEFAULT 0,
//   total_inserted INTEGER DEFAULT 0,
//   duplicates_skipped INTEGER DEFAULT 0,
//   completed BOOLEAN DEFAULT false,
//   source TEXT DEFAULT 'demo',
//   seen_place_ids TEXT[] DEFAULT '{}',
//   created_by UUID REFERENCES auth.users(id),
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE scrape_sessions ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "own_sessions" ON scrape_sessions FOR ALL USING (auth.uid() = created_by);

router.post('/scrape', async (req, res) => {
  const {
    keywords  = [],   // array of category strings
    locations = [],   // array of city strings
    limit     = 20,   // total target
    sessionId = null, // if continuing
  } = req.body

  if (!keywords.length && !locations.length) {
    return res.status(400).json({ error: 'keywords and locations required' })
  }

  // ── Load settings — use limit(1) instead of single() so it never fails
  // if multiple rows exist for same user_id (no unique constraint on table)
  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('*')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)

  const settings = (settingsRows && settingsRows.length > 0) ? settingsRows[0] : null

  // Fallback chain: dedicated column → api_keys JSONB → env var
  // This handles both old schemas (no dedicated column) and new schemas
  const apiKeys = settings?.api_keys || {}
  const apifyToken      = settings?.apify_token  || apiKeys.apify_token  || apiKeys.apifyToken  || process.env.APIFY_TOKEN
  const serpApiKey      = settings?.serpapi_key  || apiKeys.serpapi_key  || apiKeys.serpapiKey  || process.env.SERPAPI_KEY
  const googlePlacesKey = apiKeys.google_places  || apiKeys.googlePlaces || process.env.GOOGLE_PLACES_KEY

  // Debug log (remove after confirming it works)
  console.log('[scrape] user:', req.user.id, '| apify:', apifyToken ? `...${apifyToken.slice(-6)}` : 'none', '| serpapi:', serpApiKey ? 'set' : 'none')

  // ── No API key configured ──
  if (!apifyToken && !serpApiKey && !googlePlacesKey) {
    return res.json({
      no_api:    true,
      results:   [],
      analytics: { total_fetched: 0, total_inserted: 0, duplicates_skipped: 0, remaining: limit },
      has_more:  false,
      source:    null,
    })
  }

  const source = apifyToken ? 'apify'
               : serpApiKey ? 'serpapi'
               : 'google_places'

  // ── Load or create session ──
  let session = null
  if (sessionId) {
    const { data } = await supabase
      .from('scrape_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('created_by', req.user.id)
      .single()
    session = data
  }

  if (!session) {
    const { data, error } = await supabase
      .from('scrape_sessions')
      .insert({
        keywords,
        locations,
        limit,
        current_offset:    0,
        total_fetched:     0,
        total_inserted:    0,
        duplicates_skipped: 0,
        completed:         false,
        source,
        seen_place_ids:    [],
        created_by:        req.user.id,
      })
      .select()
      .single()

    if (error) {
      // Table doesn't exist yet — run without session tracking
      session = {
        id: null, keywords, locations, limit,
        current_offset: 0, total_fetched: 0, total_inserted: 0,
        duplicates_skipped: 0, completed: false, source, seen_place_ids: [],
      }
    } else {
      session = data
    }
  }

  // ── If already completed ──
  if (session.completed) {
    return res.json({
      sessionId:   session.id,
      results:     [],
      analytics:   { total_fetched: session.total_fetched, total_inserted: session.total_inserted, duplicates_skipped: session.duplicates_skipped, remaining: 0 },
      has_more:    false,
      source:      session.source,
      demo:        session.source === 'demo',
    })
  }

  const offset        = session.current_offset  || 0
  const alreadyFetched= session.total_fetched   || 0
  const seenPlaceIds  = session.seen_place_ids  || []
  const remaining     = Math.max(0, limit - alreadyFetched)

  if (remaining <= 0) {
    await supabase.from('scrape_sessions').update({ completed: true, updated_at: new Date().toISOString() }).eq('id', session.id)
    return res.json({
      sessionId:   session.id,
      results:     [],
      analytics:   { total_fetched: alreadyFetched, total_inserted: session.total_inserted, duplicates_skipped: session.duplicates_skipped, remaining: 0 },
      has_more:    false,
      source:      session.source,
      demo:        session.source === 'demo',
    })
  }

  // ── Build search strings ──
  const effectiveKeywords  = keywords.length  ? keywords  : session.keywords  || []
  const effectiveLocations = locations.length ? locations : session.locations || []
  const searchStrings = []
  for (const loc of effectiveLocations) {
    for (const kw of effectiveKeywords) {
      searchStrings.push(`${kw} in ${loc}`)
    }
  }
  if (!searchStrings.length) searchStrings.push('business')

  // ── Fetch from API — server-side loop until we have enough new leads ──────
  // Loops through API pages internally so the client gets everything in ONE response.
  let allNewResults      = []
  let allDuplicateResults= []
  let totalDuplicates    = (session.duplicates_skipped || 0)
  let totalRawFetched    = 0
  let currentOffset      = offset
  let currentSeenIds     = [...seenPlaceIds]
  let actualSource       = source
  const BATCH            = 200   // raw results to request per iteration
  const MAX_ITERS        = 10    // safety cap

  for (let iter = 0; iter < MAX_ITERS && allNewResults.length < remaining; iter++) {
    let batchRaw = []

    if (apifyToken && iter === 0) {
      // Apify fetches all at once — request enough to cover duplicates
      const totalRequest = Math.min(remaining * 3 + 50, 500)
      const apifyResults = await fetchApify(apifyToken, searchStrings, totalRequest)
      if (apifyResults !== null) { batchRaw = apifyResults; actualSource = 'apify' }
    }

    if (!batchRaw.length && serpApiKey) {
      batchRaw = await fetchSerpAPI(serpApiKey, searchStrings, BATCH, currentOffset)
      actualSource = 'serpapi'
    }

    if (!batchRaw.length && googlePlacesKey && iter === 0) {
      batchRaw = await fetchGooglePlaces(googlePlacesKey, searchStrings, remaining)
      actualSource = 'google_places'
    }

    if (!batchRaw.length) break  // No more results from any API

    // Drop results with no phone number
    const filtered = batchRaw.filter(r => r.phone && r.phone.toString().replace(/\D/g, '').length >= 7)

    // Deduplicate against CRM + already-seen in this loop
    const { newResults: batchNew, duplicates: batchDups, duplicateResults: batchDupResults, newSeenPlaceIds } =
      await deduplicateResults(filtered, req.user.id, currentSeenIds)

    allNewResults.push(...batchNew)
    allDuplicateResults.push(...batchDupResults)
    totalDuplicates += batchDups
    currentSeenIds   = newSeenPlaceIds
    totalRawFetched += batchRaw.length
    currentOffset   += batchRaw.length

    // Stop looping if API returned a partial page (no more data) or single-shot APIs
    const isLastPage = batchRaw.length < BATCH || actualSource === 'apify' || actualSource === 'google_places'
    if (isLastPage) break
  }

  // Trim to the requested limit
  const finalResults  = allNewResults.slice(0, remaining)
  const newTotalFetched = alreadyFetched + totalRawFetched
  const newOffset       = currentOffset

  if (!finalResults.length && !allDuplicateResults.length) {
    if (session.id) {
      await supabase.from('scrape_sessions').update({ completed: true, updated_at: new Date().toISOString() }).eq('id', session.id)
    }
    return res.json({
      sessionId:   session.id,
      results:     [],
      duplicates:  [],
      analytics: {
        total_fetched:     alreadyFetched,
        total_inserted:    session.total_inserted || 0,
        duplicates_skipped: totalDuplicates,
        remaining:         remaining,
      },
      has_more:    false,
      source:      actualSource,
    })
  }

  // ── Update session — mark completed since we've done a full scrape ──
  if (session.id) {
    await supabase
      .from('scrape_sessions')
      .update({
        current_offset:     newOffset,
        total_fetched:      newTotalFetched,
        duplicates_skipped: totalDuplicates,
        completed:          true,
        source:             actualSource,
        seen_place_ids:     currentSeenIds.slice(0, 5000),
        updated_at:         new Date().toISOString(),
      })
      .eq('id', session.id)
  }

  return res.json({
    sessionId:   session.id,
    results:     finalResults,
    duplicates:  allDuplicateResults,
    analytics: {
      total_fetched:     newTotalFetched,
      total_inserted:    session.total_inserted || 0,
      duplicates_skipped: totalDuplicates,
      remaining:         Math.max(0, remaining - finalResults.length),
    },
    has_more:    false,   // Everything done in one shot — no batching needed
    source:      actualSource,
    demo:        actualSource === 'demo',
  })
})

// ── PATCH /api/leads/scrape-sessions/:id/inserted — update inserted count after save ──
router.patch('/scrape-sessions/:id/inserted', async (req, res) => {
  const { count } = req.body
  const { data, error } = await supabase
    .from('scrape_sessions')
    .update({ total_inserted: count, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('created_by', req.user.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET /api/leads/scrape-sessions — list user's sessions
router.get('/scrape-sessions', async (req, res) => {
  const { data, error } = await supabase
    .from('scrape_sessions')
    .select('*')
    .eq('created_by', req.user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return res.status(400).json({ error: error.message })
  res.json(data || [])
})

// GET /api/leads/check-duplicate — real-time duplicate check
router.get('/check-duplicate', async (req, res) => {
  const { business_name, phone, website, exclude_id } = req.query
  const matches = []

  if (business_name && business_name.trim().length >= 3) {
    let q = supabase.from('leads').select('id, business_name, phone, city, status')
      .ilike('business_name', `%${business_name.trim()}%`)
      .limit(5)
    if (exclude_id) q = q.neq('id', exclude_id)
    const { data } = await q
    if (data?.length) matches.push(...data.map(d => ({ ...d, match_type: 'name' })))
  }

  if (phone && phone.replace(/\D/g, '').length >= 8) {
    const clean = phone.replace(/\D/g, '')
    let q = supabase.from('leads').select('id, business_name, phone, city, status')
      .or(`phone.eq.${phone},phone.eq.+91${clean},phone.eq.${clean}`)
      .limit(3)
    if (exclude_id) q = q.neq('id', exclude_id)
    const { data } = await q
    if (data?.length) {
      data.forEach(d => {
        if (!matches.find(m => m.id === d.id)) matches.push({ ...d, match_type: 'phone' })
      })
    }
  }

  if (website && website.length > 5) {
    const clean = website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    let q = supabase.from('leads').select('id, business_name, phone, city, status')
      .or(`website.ilike.%${clean}%`)
      .limit(3)
    if (exclude_id) q = q.neq('id', exclude_id)
    const { data } = await q
    if (data?.length) {
      data.forEach(d => {
        if (!matches.find(m => m.id === d.id)) matches.push({ ...d, match_type: 'website' })
      })
    }
  }

  const seen = new Set()
  const unique = matches.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id); return true
  }).map(m => ({
    ...m,
    confidence: m.match_type === 'phone' ? 'exact'
      : m.business_name?.toLowerCase() === business_name?.toLowerCase() ? 'exact'
      : 'likely',
  }))

  res.json({ duplicates: unique, count: unique.length })
})

// POST /api/leads/:id/activity
router.post('/:id/activity', async (req, res) => {
  const { data, error } = await supabase.from('lead_activities').insert({
    lead_id: req.params.id, user_id: req.user.id, ...req.body
  }).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST /api/leads/:id/analyze — save AI analysis result + log workflow
router.post('/:id/analyze', async (req, res) => {
  const { analysis } = req.body
  if (!analysis) return res.status(400).json({ error: 'analysis payload required' })

  const updates = {
    health_score:         analysis.health_score,
    website_score:        analysis.website_score,
    gmb_score:            analysis.gmb_score,
    social_score:         analysis.social_score,
    seo_score:            analysis.seo_score,
    competitor_score:     analysis.competitor_score,
    pain_points:          analysis.pain_points || [],
    opportunities:        analysis.opportunities || [],
    ai_hook_message:      analysis.ai_hook_message,
    analysis_summary:     analysis.analysis_summary,
    recommended_services: analysis.recommended_services || [],
    service_pitch:        analysis.service_pitch || null,
    is_analysed:          true,
    updated_at:           new Date().toISOString(),
  }

  const { data, error } = await supabase.from('leads').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('lead_activities').insert({
    lead_id: req.params.id, user_id: req.user.id,
    type: 'analyzed', title: 'AI Analysis Completed',
    description: `Health score: ${analysis.health_score}/100`,
  })

  await supabase.from('workflow_logs').insert({
    entity_type: 'lead', entity_id: req.params.id,
    user_id: req.user.id, action: 'ai_analyze',
    metadata: { health_score: analysis.health_score },
  }).then(null, () => {})

  res.json(data)
})

// POST /api/leads/:id/whatsapp — log WhatsApp message sent
router.post('/:id/whatsapp', async (req, res) => {
  const { message, phone, message_type = 'hook' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  await supabase.from('whatsapp_messages').insert({
    lead_id:      req.params.id,
    user_id:      req.user.id,
    phone,
    message,
    message_type,
    sent_at:      new Date().toISOString(),
  }).then(null, () => {})

  const { error: actErr } = await supabase.from('lead_activities').insert({
    lead_id: req.params.id, user_id: req.user.id,
    type: 'whatsapp_sent', title: 'WhatsApp Message Sent',
    description: message.slice(0, 100),
  })

  await supabase.from('workflow_logs').insert({
    entity_type: 'lead', entity_id: req.params.id,
    user_id: req.user.id, action: 'whatsapp_sent',
    metadata: { message_type, phone },
  }).then(null, () => {})

  if (actErr) return res.status(400).json({ error: actErr.message })
  res.json({ success: true })
})

// PUT /api/leads/:id/stage — update kanban stage + log activity
router.put('/:id/stage', async (req, res) => {
  const { stage, prev_stage } = req.body
  if (!stage) return res.status(400).json({ error: 'stage required' })

  const { data, error } = await supabase.from('leads')
    .update({ status: stage, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('lead_activities').insert({
    lead_id: req.params.id, user_id: req.user.id,
    type: 'stage_changed', title: 'Stage Updated',
    description: prev_stage ? `Moved from ${prev_stage} → ${stage}` : `Set to ${stage}`,
  })

  await supabase.from('workflow_logs').insert({
    entity_type: 'lead', entity_id: req.params.id,
    user_id: req.user.id, action: 'stage_changed',
    metadata: { from: prev_stage, to: stage },
  }).then(null, () => {})

  res.json(data)
})

// POST /api/leads/:id/send-report
router.post('/:id/send-report', async (req, res) => {
  const { sent_to_email, sent_to_phone, method = 'download' } = req.body
  const { data: lead } = await supabase.from('leads').select('business_name').eq('id', req.params.id).single()

  await supabase.from('lead_activities').insert({
    lead_id: req.params.id, user_id: req.user.id,
    type: 'report_sent', title: 'Business Analysis Report Sent',
    description: `Sent via ${method}${sent_to_email ? ` to ${sent_to_email}` : ''}`,
  })

  await supabase.from('workflow_logs').insert({
    entity_type: 'lead', entity_id: req.params.id,
    user_id: req.user.id, action: 'report_sent',
    metadata: { method, sent_to_email, sent_to_phone },
  }).then(null, () => {})

  res.json({ success: true, business_name: lead?.business_name })
})

module.exports = router
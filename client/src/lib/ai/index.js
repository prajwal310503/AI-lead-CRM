import api from '../api'

// All AI calls are proxied through the Express server to avoid CORS issues.
// The server reads the user's saved API keys from Supabase app_settings.
export async function callAI(prompt) {
  const { data } = await api.post('/api/ai/complete', { prompt })
  return data.result
}

export function parseJSONResponse(text) {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1))
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function buildLeadAnalysisPrompt(lead) {
  const socialPresence = [
    lead.instagram_url && 'Instagram',
    lead.facebook_url  && 'Facebook',
    lead.linkedin_url  && 'LinkedIn',
    lead.youtube_url   && 'YouTube',
    lead.twitter_url   && 'Twitter/X',
  ].filter(Boolean)

  return `You are a senior digital marketing strategist and business analyst for StartWeb agency (Navi Mumbai).
Analyze this lead and provide a complete intelligence report.

BUSINESS PROFILE:
- Name: ${lead.business_name}
- Owner: ${lead.owner_name || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Location: ${lead.area ? lead.area + ', ' : ''}${lead.city || lead.location || 'Unknown'}
- Website: ${lead.website || 'MISSING'}
- Phone: ${lead.phone || 'Unknown'}
- Email: ${lead.email || 'Unknown'}

DIGITAL PRESENCE:
- Google Rating: ${lead.google_rating || 'N/A'} (${lead.google_reviews_count || 0} reviews)
- GMB Status: ${lead.gmb_status || 'unknown'}
- Social Platforms: ${socialPresence.length > 0 ? socialPresence.join(', ') : 'None detected'}
- Google Maps: ${lead.google_maps_url ? 'Listed' : 'Not found'}

BUSINESS CONTEXT:
- Revenue Estimate: ${lead.revenue_estimate || 'Unknown'}
- Priority: ${lead.is_priority ? 'High priority target' : 'Standard'}
- Notes: ${lead.notes || 'None'}

Analyze deeply and respond with ONLY valid JSON (no markdown, no extra text):
{
  "health_score": <INTEGER 0-100 overall digital health score>,
  "website_score": <INTEGER 0-100 website quality score>,
  "gmb_score": <INTEGER 0-100 Google My Business presence score>,
  "social_score": <INTEGER 0-100 social media presence score>,
  "seo_score": <INTEGER 0-100 search engine optimization score>,
  "competitor_score": <INTEGER 0-100 competitive position vs local competitors>,
  "pain_points": ["<specific pain point 1>", "<pain point 2>", "<pain point 3>", "<pain point 4>"],
  "opportunities": ["<growth opportunity 1>", "<opportunity 2>", "<opportunity 3>"],
  "recommended_services": ["<exact service name 1>", "<service 2>", "<service 3>", "<service 4>"],
  "ideal_package": "<starter|growth|premium|custom>",
  "missed_revenue_estimate": <INTEGER monthly revenue loss in INR e.g. 50000>,
  "deal_probability": <INTEGER 0-100 percentage chance of converting this lead>,
  "urgency_level": "<low|medium|high|critical>",
  "negotiation_risk_level": "<low|medium|high>",
  "service_pitch": "<2-3 sentence personalized pitch for this specific business>",
  "ai_hook_message": "<WhatsApp opening message under 280 chars — conversational, specific to their business, no emojis>",
  "analysis_summary": "<150-word professional analysis covering digital gaps, competitive position, and growth potential>"
}`
}

export function buildProposalContentPrompt(lead, services) {
  const serviceList = services.map((s) => s.name).join(', ')
  return `You are a professional proposal writer for StartWeb, a digital marketing agency based in Panvel, Navi Mumbai.

Client: ${lead?.business_name || 'Client'}
Industry: ${lead?.industry || 'Business'}
Services: ${serviceList}

Generate professional proposal content. Respond ONLY with valid JSON:
{
  "ai_intro": "<2-paragraph introduction personalized for this client>",
  "ai_why_us": "<3 compelling reasons why StartWeb is the best choice>",
  "ai_timeline": "<realistic project timeline breakdown>",
  "ai_closing": "<persuasive closing paragraph>"
}`
}

export function buildDashboardInsightsPrompt(stats) {
  return `You are a business analyst for StartWeb agency. Based on these metrics, provide 3 actionable insights.

Stats: ${JSON.stringify(stats)}

Respond ONLY with valid JSON:
{
  "insights": [
    { "title": "<insight title>", "description": "<actionable insight>", "type": "opportunity|warning|success" },
    { "title": "<insight title>", "description": "<actionable insight>", "type": "opportunity|warning|success" },
    { "title": "<insight title>", "description": "<actionable insight>", "type": "opportunity|warning|success" }
  ]
}`
}

export function buildProposalAIPrompt(lead, services, totals) {
  const serviceList = services.map(s =>
    `- ${s.name}: ₹${(s.override_price ?? s.base_price).toLocaleString('en-IN')} (${s.price_type})`
  ).join('\n')
  return `You are a senior proposal writer for StartWeb, a premium digital marketing agency in Navi Mumbai.

CLIENT PROFILE:
- Business: ${lead.business_name}
- Owner: ${lead.owner_name || 'N/A'}
- Industry: ${lead.industry || 'Business'}
- Location: ${lead.city || 'India'}
- Website: ${lead.website ? 'Has website' : 'NO WEBSITE'}
- Google Rating: ${lead.google_rating || 'N/A'} (${lead.google_reviews_count || 0} reviews)
- Health Score: ${lead.health_score || 'N/A'}/100
- Deal Probability: ${lead.deal_probability || 'N/A'}%
- Pain Points: ${Array.isArray(lead.pain_points) ? lead.pain_points.join('; ') : (lead.pain_points || 'N/A')}
- Opportunities: ${Array.isArray(lead.opportunities) ? lead.opportunities.join('; ') : 'N/A'}

PROPOSED SERVICES:\n${serviceList}
Total Investment: ₹${(totals?.total || 0).toLocaleString('en-IN')}

Generate a complete professional proposal. Respond ONLY with valid JSON:
{
  "intro": "<2-paragraph personalised introduction addressing their specific business challenges>",
  "strategy": "<detailed 3-4 paragraph strategic approach — how these services solve their problems>",
  "implementation_phases": [
    {"phase": "Phase 1: Discovery & Strategy", "duration": "Week 1-2", "tasks": ["Competitor analysis", "Current presence audit", "Goal definition"]},
    {"phase": "Phase 2: Build & Create", "duration": "Week 3-6", "tasks": ["Design mockups", "Development", "Content creation"]},
    {"phase": "Phase 3: Launch & Grow", "duration": "Week 7-8", "tasks": ["Go-live", "SEO setup", "Analytics configuration"]},
    {"phase": "Phase 4: Optimise & Report", "duration": "Ongoing", "tasks": ["Monthly reports", "Continuous improvements", "Support"]}
  ],
  "deliverables": ["<deliverable 1>", "<deliverable 2>", "<deliverable 3>", "<deliverable 4>", "<deliverable 5>", "<deliverable 6>"],
  "roi_projection": "<specific quantified ROI projection with numbers, percentages, timeframes tailored to their industry>",
  "pricing_explanation": "<justify investment — compare to hiring in-house, lost revenue cost, competitor spend>",
  "closing_statement": "<compelling 2-paragraph close with urgency, trust signals, and clear next steps>"
}`
}

export function buildNegotiationPrompt(lead, services, originalTotal, discountPct, paymentPlan) {
  const discountedTotal = Math.round(originalTotal * (1 - discountPct / 100))
  return `You are an expert sales negotiation coach for StartWeb digital agency.

CLIENT: ${lead.business_name} (${lead.industry || 'Business'}, ${lead.city || 'India'})
ORIGINAL PROPOSAL: ₹${originalTotal.toLocaleString('en-IN')}
REQUESTED DISCOUNT: ${discountPct}%
DISCOUNTED TOTAL: ₹${discountedTotal.toLocaleString('en-IN')}
PAYMENT PLAN: ${paymentPlan}
SERVICES: ${services.map(s => s.name).join(', ')}
CURRENT DEAL PROBABILITY: ${lead.deal_probability || 50}%

Respond ONLY with valid JSON:
{
  "objection_type": "<pricing|value_gap|cash_flow|authority|comparison|urgency>",
  "counter_strategy": "<2-3 sentence specific counter — what to say, how to reframe value>",
  "revised_margin": <integer 0-100, estimated gross margin % after discount>,
  "probability_after_revision": <integer 0-100, new deal probability if these terms are accepted>
}`
}

export function buildFollowupMessagePrompt(lead, day) {
  return `You are a business development executive at StartWeb agency. Write a follow-up WhatsApp message for day ${day}.

Business: ${lead.business_name}
Owner: ${lead.owner_name || 'Sir/Ma\'am'}
Industry: ${lead.industry || 'business'}
City: ${lead.city || 'your area'}
Previous contact: We reached out ${day} days ago about digital marketing services.

Write a SHORT (under 250 chars), friendly, non-pushy follow-up. Reference their specific business. No emojis spam.
Respond with ONLY the message text.`
}

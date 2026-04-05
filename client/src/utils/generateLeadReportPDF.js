import jsPDF from 'jspdf'
import 'jspdf-autotable'

// ── Light theme palette ──────────────────────────────────────────────────────
const WHITE      = [255, 255, 255]
const BG_LIGHT   = [248, 249, 250]
const BG_CARD    = [243, 244, 246]
const BORDER     = [229, 231, 235]
const DARK       = [17,  24,  39]
const DARK2      = [31,  41,  55]
const MUTED      = [107, 114, 128]
const ORANGE     = [255, 107,  53]
const ORANGE_LT  = [255, 237, 229]
const BLUE       = [14,  165, 233]
const BLUE_LT    = [224, 242, 254]
const GREEN      = [16,  185, 129]
const GREEN_LT   = [209, 250, 229]
const AMBER      = [217, 119,   6]
const AMBER_LT   = [254, 243, 199]
const RED        = [220,  38,  38]
const RED_LT     = [254, 226, 226]
const PURPLE     = [139,  92, 246]
const PURPLE_LT  = [237, 233, 254]

const W      = 210
const MARGIN = 16

// ── Utilities ────────────────────────────────────────────────────────────────
const fill  = (doc, rgb) => doc.setFillColor(...rgb)
const draw  = (doc, rgb) => doc.setDrawColor(...rgb)
const color = (doc, rgb) => doc.setTextColor(...rgb)

function scoreColor(score) {
  if (!score && score !== 0) return MUTED
  if (score >= 75) return GREEN
  if (score >= 50) return AMBER
  return RED
}

function scoreLabel(score) {
  if (!score && score !== 0) return 'N/A'
  if (score >= 75) return 'Strong'
  if (score >= 50) return 'Average'
  return 'Critical'
}

// Light-theme page base: white bg + top orange bar
function pageBase(doc) {
  fill(doc, WHITE)
  doc.rect(0, 0, W, 297, 'F')
  fill(doc, ORANGE)
  doc.rect(0, 0, W, 3, 'F')
  fill(doc, BORDER)
  doc.rect(0, 294, W, 3, 'F')
}

function pageFooter(doc, pageNum, companyName, totalPages) {
  draw(doc, BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, 289, W - MARGIN, 289)
  color(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`${companyName} · Confidential Business Analysis Report`, MARGIN, 293)
  doc.text(`Page ${pageNum} of ${totalPages}`, W - MARGIN, 293, { align: 'right' })
}

function sectionHeader(doc, y, title, subtitle) {
  // Orange left accent bar
  fill(doc, ORANGE)
  doc.rect(MARGIN, y, 3, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  color(doc, ORANGE)
  doc.text(title, MARGIN + 7, y + 5.5)
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    color(doc, MUTED)
    doc.text(subtitle, MARGIN + 7 + doc.getTextWidth(title) + 4, y + 5.5)
  }
  draw(doc, BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y + 10, W - MARGIN, y + 10)
  return y + 16
}

function drawScoreBar(doc, x, y, label, score, barW = 80) {
  color(doc, DARK2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(label, x, y)

  const barX = x + 52
  const barH  = 5
  fill(doc, BG_CARD)
  draw(doc, BORDER)
  doc.setLineWidth(0.2)
  doc.roundedRect(barX, y - 4, barW, barH, 1.5, 1.5, 'FD')

  const pct = Math.max(0, Math.min(100, score || 0))
  const sc  = scoreColor(score)
  fill(doc, sc)
  doc.roundedRect(barX, y - 4, Math.max(2, barW * (pct / 100)), barH, 1.5, 1.5, 'F')

  color(doc, sc)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`${pct}`, barX + barW + 5, y)

  const sl = scoreLabel(score)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  color(doc, sc)
  doc.text(sl, barX + barW + 14, y)
}

function pillBadge(doc, x, y, text, bgColor, textColor, h = 6) {
  const tw  = doc.getTextWidth(text)
  const pw  = tw + 8
  fill(doc, bgColor)
  doc.roundedRect(x, y - h + 1, pw, h, 1.5, 1.5, 'F')
  color(doc, textColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(text, x + 4, y - 0.5)
  return x + pw + 4
}

function infoRow(doc, y, label, value, valueColor = DARK2) {
  color(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(label, MARGIN, y)
  color(doc, valueColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  const lines = doc.splitTextToSize(value || '—', W - MARGIN - 90)
  doc.text(lines[0], MARGIN + 62, y)
  draw(doc, BORDER)
  doc.setLineWidth(0.15)
  doc.line(MARGIN, y + 2.5, W - MARGIN, y + 2.5)
  return y + 9
}

/**
 * Generate an 11-page Light-theme Lead Business Analysis Report PDF.
 * @param {Object} lead    — lead row with analysis data
 * @param {Object} company — company settings
 * @returns {jsPDF} doc
 */
export function generateLeadReportPDF(lead, company = {}) {
  const doc           = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const companyName   = company.company_name || 'StartWeb'
  const generatedDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const TOTAL_PAGES   = 11

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════
  pageBase(doc)

  // Top company strip
  fill(doc, DARK)
  doc.rect(0, 3, W, 18, 'F')
  color(doc, WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(companyName, MARGIN, 14)
  color(doc, [156, 163, 175])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(company.company_website || 'startweb.cloud', MARGIN, 19)
  // Date badge top-right
  color(doc, [209, 213, 219])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(generatedDate, W - MARGIN, 14, { align: 'right' })
  doc.text('BUSINESS ANALYSIS REPORT', W - MARGIN, 19, { align: 'right' })

  // Hero area
  fill(doc, BG_LIGHT)
  doc.rect(0, 21, W, 100, 'F')

  // Orange accent stripe left
  fill(doc, ORANGE)
  doc.rect(0, 21, 5, 100, 'F')

  // Business name
  doc.setFont('helvetica', 'bold')
  color(doc, DARK)
  const bizName = doc.splitTextToSize(lead.business_name || 'Business Name', W - MARGIN * 2 - 40)
  doc.setFontSize(bizName.length > 1 ? 22 : 26)
  doc.text(bizName, MARGIN + 10, 46)

  // Tags row
  let tagX = MARGIN + 10
  const tagY = 58 + (bizName.length - 1) * 8
  doc.setFontSize(7.5)
  if (lead.industry) tagX = pillBadge(doc, tagX, tagY, lead.industry.toUpperCase(), BLUE_LT, BLUE, 7)
  if (lead.city)     tagX = pillBadge(doc, tagX, tagY, lead.city.toUpperCase(), ORANGE_LT, ORANGE, 7)
  if (lead.gmb_status) pillBadge(doc, tagX, tagY, `GMB: ${lead.gmb_status.toUpperCase()}`, lead.gmb_status === 'claimed' ? GREEN_LT : RED_LT, lead.gmb_status === 'claimed' ? GREEN : RED, 7)

  // Owner / Contact row below tags
  if (lead.owner_name || lead.phone) {
    color(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const contactLine = [lead.owner_name, lead.phone, lead.email].filter(Boolean).join('  ·  ')
    doc.text(contactLine, MARGIN + 10, tagY + 10)
  }

  // Health score circle (right side)
  const scoreVal = lead.health_score || 0
  const sc = scoreColor(scoreVal)
  const cx = W - MARGIN - 20, cy = 65
  fill(doc, WHITE)
  draw(doc, sc)
  doc.setLineWidth(2)
  doc.circle(cx, cy, 18, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  color(doc, sc)
  doc.text(String(scoreVal), cx, cy + 4, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  color(doc, MUTED)
  doc.text('Health Score', cx, cy + 10, { align: 'center' })
  doc.text(`/ 100`, cx, cy + 14, { align: 'center' })

  // Score label pill under circle
  fill(doc, sc)
  doc.roundedRect(cx - 12, cy + 16, 24, 6, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  color(doc, WHITE)
  doc.text(scoreLabel(scoreVal).toUpperCase(), cx, cy + 20, { align: 'center' })

  // Contact info strip
  const infoY = 130
  fill(doc, WHITE)
  draw(doc, BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, infoY, W - MARGIN * 2, 22, 2, 2, 'FD')

  const infoItems = [
    ['Phone', lead.phone || '—'],
    ['Email', lead.email || '—'],
    ['Website', lead.website || 'Not present'],
    ['GMB Status', (lead.gmb_status || 'unknown').toUpperCase()],
  ]
  infoItems.forEach((item, i) => {
    const ix = MARGIN + 4 + i * 46
    color(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(item[0], ix, infoY + 8)
    color(doc, DARK2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(doc.splitTextToSize(item[1], 42)[0], ix, infoY + 15)
  })

  // Google rating box
  if (lead.google_rating) {
    const rY = infoY + 28
    fill(doc, AMBER_LT)
    draw(doc, AMBER)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN, rY, 88, 14, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    color(doc, AMBER)
    doc.text(`${lead.google_rating}★  (${lead.google_reviews_count || 0} reviews)`, MARGIN + 6, rY + 9)
    doc.setFontSize(7)
    color(doc, MUTED)
    doc.text('Google Rating', MARGIN + 6, rY + 4)
  }

  // Executive snapshot
  if (lead.analysis_summary) {
    const sumY = 185
    fill(doc, BLUE_LT)
    draw(doc, BLUE)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN, sumY, W - MARGIN * 2, 46, 2, 2, 'FD')
    fill(doc, BLUE)
    doc.rect(MARGIN, sumY, 3, 46, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    color(doc, BLUE)
    doc.text('EXECUTIVE SNAPSHOT', MARGIN + 8, sumY + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    color(doc, DARK2)
    const sumLines = doc.splitTextToSize(lead.analysis_summary, W - MARGIN * 2 - 14)
    doc.text(sumLines.slice(0, 5), MARGIN + 8, sumY + 15)
  }

  // Cover footer / confidential
  fill(doc, DARK)
  doc.rect(0, 240, W, 24, 'F')
  color(doc, WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Prepared exclusively for', MARGIN, 250)
  color(doc, ORANGE)
  doc.setFontSize(12)
  doc.text(lead.business_name || 'Business', MARGIN, 259)
  color(doc, [75, 85, 99])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const contactStr = [company.company_phone, company.company_email, company.company_website].filter(Boolean).join('  ·  ')
  doc.text(contactStr || 'Contact us today!', W - MARGIN, 259, { align: 'right' })
  color(doc, [75, 85, 99])
  doc.text('CONFIDENTIAL', W - MARGIN, 250, { align: 'right' })

  pageFooter(doc, 1, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  let y = sectionHeader(doc, 22, 'Executive Summary', lead.business_name)

  // Key metrics row
  const metrics = [
    { label: 'Health Score', value: `${lead.health_score || 'N/A'}/100`, color: scoreColor(lead.health_score) },
    { label: 'Google Rating', value: lead.google_rating ? `${lead.google_rating}★` : 'N/A', color: AMBER },
    { label: 'GMB Status', value: (lead.gmb_status || 'Unknown').toUpperCase(), color: lead.gmb_status === 'claimed' ? GREEN : RED },
    { label: 'Website', value: lead.website ? 'Present' : 'Missing', color: lead.website ? GREEN : RED },
  ]

  metrics.forEach((m, i) => {
    const mx = MARGIN + i * 46
    fill(doc, BG_LIGHT)
    draw(doc, BORDER)
    doc.setLineWidth(0.2)
    doc.roundedRect(mx, y, 42, 24, 2, 2, 'FD')
    fill(doc, m.color)
    doc.rect(mx, y, 42, 3, 'F')
    color(doc, m.color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(m.value, mx + 21, y + 14, { align: 'center' })
    color(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(m.label, mx + 21, y + 20, { align: 'center' })
  })
  y += 32

  // Analysis summary
  if (lead.analysis_summary) {
    fill(doc, BG_LIGHT)
    draw(doc, BORDER)
    doc.setLineWidth(0.2)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 8, 1.5, 1.5, 'FD')
    color(doc, BLUE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('ANALYSIS OVERVIEW', MARGIN + 4, y + 5.5)
    y += 12
    color(doc, DARK2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const sumLines = doc.splitTextToSize(lead.analysis_summary, W - MARGIN * 2)
    doc.text(sumLines, MARGIN, y)
    y += sumLines.length * 5 + 8
  }

  // Score overview table
  fill(doc, BG_LIGHT)
  draw(doc, BORDER)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 8, 1.5, 1.5, 'FD')
  color(doc, ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('DIGITAL PERFORMANCE OVERVIEW', MARGIN + 4, y + 5.5)
  y += 14

  const scoreItems = [
    ['Overall Health', lead.health_score],
    ['Website Quality', lead.website_score],
    ['Google My Business', lead.gmb_score],
    ['Social Media', lead.social_score],
    ['SEO Performance', lead.seo_score],
    ['Competitive Position', lead.competitor_score],
  ]
  scoreItems.forEach(([label, score]) => {
    drawScoreBar(doc, MARGIN + 2, y, label, score, W - MARGIN * 2 - 85)
    y += 12
  })

  pageFooter(doc, 2, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — DIGITAL SCORE DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'Digital Score Dashboard', 'Comprehensive performance metrics')

  scoreItems.forEach(([label, score], i) => {
    const sy = y + i * 30
    const sc2 = scoreColor(score)
    fill(doc, BG_LIGHT)
    draw(doc, BORDER)
    doc.setLineWidth(0.2)
    doc.roundedRect(MARGIN, sy, W - MARGIN * 2, 26, 2, 2, 'FD')
    fill(doc, sc2)
    doc.rect(MARGIN, sy, 3, 26, 'F')

    // Score circle
    const circ_x = W - MARGIN - 16, circ_y = sy + 13
    fill(doc, WHITE)
    draw(doc, sc2)
    doc.setLineWidth(1)
    doc.circle(circ_x, circ_y, 9, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    color(doc, sc2)
    doc.text(String(score || 0), circ_x, circ_y + 2, { align: 'center' })

    color(doc, DARK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(label, MARGIN + 8, sy + 9)

    // Bar
    const barX = MARGIN + 8, barY = sy + 15, barW2 = W - MARGIN * 2 - 50
    fill(doc, BG_CARD)
    doc.roundedRect(barX, barY, barW2, 5, 2, 2, 'F')
    fill(doc, sc2)
    doc.roundedRect(barX, barY, Math.max(2, barW2 * ((score || 0) / 100)), 5, 2, 2, 'F')

    // Label
    color(doc, sc2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(scoreLabel(score), barX + barW2 + 4, sy + 18)
  })

  y += scoreItems.length * 30 + 8

  // Legend
  fill(doc, BG_LIGHT)
  draw(doc, BORDER)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 18, 2, 2, 'FD')
  color(doc, MUTED)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('SCORE LEGEND', MARGIN + 4, y + 6)
  ;[[GREEN, '75-100: Strong (On track)'], [AMBER, '50-74: Average (Needs work)'], [RED, '0-49: Critical (Urgent action required)']].forEach(([col, lbl], i) => {
    fill(doc, col)
    doc.circle(MARGIN + 4 + i * 62, y + 13, 2.5, 'F')
    color(doc, DARK2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(lbl, MARGIN + 10 + i * 62, y + 14)
  })

  pageFooter(doc, 3, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — WEBSITE AUDIT
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'Website Audit', `Score: ${lead.website_score || 'N/A'}/100`)

  // Website URL card
  fill(doc, BG_LIGHT)
  draw(doc, lead.website ? [209, 250, 229] : [254, 226, 226])
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 2, 2, 'FD')
  color(doc, lead.website ? GREEN : RED)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(lead.website ? `✓  ${lead.website}` : '✗  No website detected', MARGIN + 6, y + 6)
  color(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(lead.website ? 'Website is live — analysis below' : 'A website is essential for digital presence and lead capture', MARGIN + 6, y + 12)
  y += 22

  // Audit checklist
  const websiteChecks = [
    ['Website Presence', lead.website ? 'Present' : 'Missing', lead.website],
    ['Mobile Friendly', lead.is_mobile_friendly !== false ? 'Likely Yes' : 'No', lead.is_mobile_friendly !== false],
    ['SSL Certificate (HTTPS)', lead.website?.startsWith('https') ? 'Detected' : 'Not confirmed', lead.website?.startsWith('https')],
    ['Contact Information', lead.phone || lead.email ? 'Present' : 'Unknown', !!(lead.phone || lead.email)],
    ['Google Maps Presence', lead.google_maps_url ? 'Listed' : 'Not listed', !!lead.google_maps_url],
    ['Social Media Links', (lead.instagram_url || lead.facebook_url) ? 'Found' : 'Not detected', !!(lead.instagram_url || lead.facebook_url)],
  ]

  websiteChecks.forEach(([label, value, ok]) => {
    fill(doc, ok ? GREEN_LT : RED_LT)
    draw(doc, ok ? [209, 250, 229] : [254, 226, 226])
    doc.setLineWidth(0.15)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 11, 1.5, 1.5, 'FD')
    color(doc, ok ? GREEN : RED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(ok ? '✓' : '✗', MARGIN + 4, y + 7.5)
    color(doc, DARK2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(label, MARGIN + 12, y + 7.5)
    color(doc, ok ? GREEN : RED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(value, W - MARGIN - 4, y + 7.5, { align: 'right' })
    y += 13
  })

  // Recommendations
  y += 4
  fill(doc, BLUE_LT)
  draw(doc, BLUE)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 60, 2, 2, 'FD')
  fill(doc, BLUE)
  doc.rect(MARGIN, y, 3, 60, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  color(doc, BLUE)
  doc.text('WEBSITE RECOMMENDATIONS', MARGIN + 8, y + 8)
  const webRecs = [
    '• Build a professional mobile-first website with fast loading speed (< 3 seconds)',
    '• Add clear CTAs (Call Now, Book Appointment, Get Quote) on every page',
    '• Include trust signals: testimonials, certifications, business hours, address',
    '• Implement on-page SEO with relevant local keywords',
    '• Add Google Analytics and Search Console for performance tracking',
    '• Create a WhatsApp chat widget for instant customer engagement',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  color(doc, DARK2)
  webRecs.forEach((rec, i) => doc.text(rec, MARGIN + 8, y + 17 + i * 7.5))

  pageFooter(doc, 4, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5 — SEO AUDIT
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'SEO & Search Visibility Audit', `Score: ${lead.seo_score || 'N/A'}/100`)

  // Score card
  const seoScore = lead.seo_score || 0
  fill(doc, BG_LIGHT)
  draw(doc, BORDER)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN, y, 60, 28, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  color(doc, scoreColor(seoScore))
  doc.text(String(seoScore), MARGIN + 30, y + 16, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  color(doc, MUTED)
  doc.text('SEO SCORE / 100', MARGIN + 30, y + 23, { align: 'center' })

  fill(doc, BG_LIGHT)
  draw(doc, BORDER)
  doc.roundedRect(MARGIN + 64, y, W - MARGIN * 2 - 64, 28, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  color(doc, DARK2)
  const seoSummary = seoScore >= 75
    ? 'Good SEO foundation detected. Some improvements recommended to maintain competitive ranking.'
    : seoScore >= 50
    ? 'Moderate SEO signals. Strategic optimization needed to rank higher in local search.'
    : 'Low SEO visibility. Business is likely invisible in Google search — urgent action needed.'
  const seoLines = doc.splitTextToSize(seoSummary, W - MARGIN * 2 - 74)
  doc.text(seoLines, MARGIN + 68, y + 9)
  y += 34

  // SEO checklist
  color(doc, ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('SEO AUDIT CHECKLIST', MARGIN, y)
  y += 8

  const seoChecks = [
    ['Website Indexed by Google', lead.website ? 'Likely Yes' : 'Not applicable', !!lead.website],
    ['Local Keyword Optimization', seoScore >= 60 ? 'Detected' : 'Not optimized', seoScore >= 60],
    ['Google Business Profile', lead.gmb_status === 'claimed' ? 'Active' : 'Missing/Inactive', lead.gmb_status === 'claimed'],
    ['NAP Consistency (Name/Address/Phone)', lead.phone ? 'Partially verified' : 'Unverifiable', !!lead.phone],
    ['Backlink Profile', seoScore >= 70 ? 'Moderate' : 'Weak', seoScore >= 70],
    ['Schema Markup', seoScore >= 80 ? 'Likely present' : 'Likely missing', seoScore >= 80],
    ['Page Speed', seoScore >= 65 ? 'Acceptable' : 'Needs improvement', seoScore >= 65],
  ]
  seoChecks.forEach(([label, value, ok]) => {
    fill(doc, ok ? GREEN_LT : RED_LT)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 11, 1.5, 1.5, 'F')
    color(doc, ok ? GREEN : RED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(ok ? '✓' : '✗', MARGIN + 4, y + 7.5)
    color(doc, DARK2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(label, MARGIN + 12, y + 7.5)
    color(doc, ok ? GREEN : RED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(value, W - MARGIN - 4, y + 7.5, { align: 'right' })
    y += 13
  })

  y += 4
  fill(doc, ORANGE_LT)
  draw(doc, ORANGE)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 52, 2, 2, 'FD')
  fill(doc, ORANGE)
  doc.rect(MARGIN, y, 3, 52, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  color(doc, ORANGE)
  doc.text('SEO RECOMMENDATIONS', MARGIN + 8, y + 8)
  const seoRecs = [
    '• Set up and fully optimize Google Business Profile with photos, posts & Q&A',
    '• Target local keywords: e.g. "best dental clinic in Panvel" or "gym near Vashi"',
    '• Build local citations on JustDial, Sulekha, IndiaMART, Yellow Pages',
    '• Create regular blog content answering customer questions',
    '• Ensure Name, Address, Phone (NAP) consistency across all platforms',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  color(doc, DARK2)
  seoRecs.forEach((r, i) => doc.text(r, MARGIN + 8, y + 17 + i * 7.5))

  pageFooter(doc, 5, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6 — GMB AUDIT
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'Google My Business Audit', `Score: ${lead.gmb_score || 'N/A'}/100`)

  const gmbStatus = (lead.gmb_status || 'unknown').toLowerCase()
  const gmbOk = gmbStatus === 'claimed'

  // GMB status banner
  fill(doc, gmbOk ? GREEN_LT : RED_LT)
  draw(doc, gmbOk ? GREEN : RED)
  doc.setLineWidth(0.5)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 20, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  color(doc, gmbOk ? GREEN : RED)
  const gmbStatusText = gmbOk ? '✓  GMB Profile is CLAIMED & Active' : gmbStatus === 'unclaimed' ? '⚠  GMB Profile is UNCLAIMED' : '✗  GMB Profile NOT FOUND'
  doc.text(gmbStatusText, MARGIN + 8, y + 13)
  y += 26

  // Rating analysis
  if (lead.google_rating) {
    fill(doc, AMBER_LT)
    draw(doc, AMBER)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 24, 2, 2, 'FD')
    color(doc, AMBER)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text(`${lead.google_rating}★`, MARGIN + 15, y + 16)
    doc.setFontSize(9)
    doc.text(`${lead.google_reviews_count || 0} total reviews`, MARGIN + 42, y + 10)
    color(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const ratingMsg = lead.google_rating >= 4.5 ? 'Excellent! Keep collecting reviews consistently.'
      : lead.google_rating >= 4.0 ? 'Good rating. Target 4.5+ with proactive review requests.'
      : lead.google_rating >= 3.0 ? 'Average. Focus on resolving complaints and requesting reviews.'
      : 'Low rating. Immediate attention needed — respond to all negative reviews.'
    doc.text(ratingMsg, MARGIN + 42, y + 18)
    y += 30
  }

  // GMB checklist
  color(doc, ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('GMB PROFILE CHECKLIST', MARGIN, y)
  y += 8

  const gmbChecks = [
    ['Profile Claimed', gmbOk ? 'Claimed' : 'Not claimed', gmbOk],
    ['Business Name', lead.business_name ? 'Present' : 'Missing', !!lead.business_name],
    ['Phone Number Listed', lead.phone ? 'Listed' : 'Missing', !!lead.phone],
    ['Website URL', lead.website ? 'Added' : 'Not added', !!lead.website],
    ['Google Maps Pinned', lead.google_maps_url ? 'Listed' : 'Not detected', !!lead.google_maps_url],
    ['Customer Reviews', lead.google_reviews_count > 0 ? `${lead.google_reviews_count} reviews` : 'No reviews', lead.google_reviews_count > 0],
    ['Rating above 4.0', lead.google_rating >= 4.0 ? `${lead.google_rating}★` : 'Below 4.0', lead.google_rating >= 4.0],
  ]
  gmbChecks.forEach(([label, value, ok]) => {
    fill(doc, ok ? GREEN_LT : RED_LT)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 11, 1.5, 1.5, 'F')
    color(doc, ok ? GREEN : RED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(ok ? '✓' : '✗', MARGIN + 4, y + 7.5)
    color(doc, DARK2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(label, MARGIN + 12, y + 7.5)
    color(doc, ok ? GREEN : RED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(value, W - MARGIN - 4, y + 7.5, { align: 'right' })
    y += 13
  })

  y += 4
  fill(doc, GREEN_LT)
  draw(doc, GREEN)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 44, 2, 2, 'FD')
  fill(doc, GREEN)
  doc.rect(MARGIN, y, 3, 44, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  color(doc, GREEN)
  doc.text('GMB QUICK WINS', MARGIN + 8, y + 8)
  const gmbRecs = [
    '• Claim and verify your GMB profile (takes 5-7 days)',
    '• Add 10+ high-quality photos of your business, team & services',
    '• Post weekly updates, offers and announcements on GMB',
    '• Ask satisfied customers to leave Google reviews (send direct link)',
    '• Respond to ALL reviews (positive and negative) within 24 hours',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  color(doc, DARK2)
  gmbRecs.forEach((r, i) => doc.text(r, MARGIN + 8, y + 17 + i * 6.5))

  pageFooter(doc, 6, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 7 — SOCIAL MEDIA AUDIT
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'Social Media Audit', `Score: ${lead.social_score || 'N/A'}/100`)

  const socials = [
    { name: 'Instagram', url: lead.instagram_url, color: [225, 48, 108], icon: '📸', importance: 'Very High' },
    { name: 'Facebook', url: lead.facebook_url, color: [24, 119, 242], icon: '👍', importance: 'High' },
    { name: 'YouTube', url: lead.youtube_url, color: [255, 0, 0], icon: '▶️', importance: 'High' },
    { name: 'LinkedIn', url: lead.linkedin_url, color: [10, 102, 194], icon: '💼', importance: 'Medium' },
    { name: 'Twitter / X', url: lead.twitter_url, color: [29, 161, 242], icon: '🐦', importance: 'Medium' },
    { name: 'WhatsApp Business', url: lead.phone ? `https://wa.me/91${lead.phone.replace(/\D/g, '')}` : null, color: [37, 211, 102], icon: '💬', importance: 'Very High' },
  ]

  socials.forEach((s, i) => {
    const present = !!s.url
    fill(doc, present ? [BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]] : [254, 242, 242])
    draw(doc, BORDER)
    doc.setLineWidth(0.2)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 14, 2, 2, 'FD')

    // Colored left accent
    fill(doc, s.color)
    doc.rect(MARGIN, y, 4, 14, 'F')

    color(doc, DARK2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(s.name, MARGIN + 9, y + 9)

    // URL or missing
    if (present) {
      color(doc, s.color)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      const shortUrl = s.url.replace('https://', '').replace('http://', '').slice(0, 35)
      doc.text(shortUrl, MARGIN + 9, y + 13.5)
    }

    // Status badge
    pillBadge(doc, W - MARGIN - (present ? 28 : 32), y + 4.5, present ? 'PRESENT ✓' : 'MISSING ✗', present ? GREEN_LT : RED_LT, present ? GREEN : RED, 7)

    // Importance
    color(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(`Importance: ${s.importance}`, W - MARGIN - 36, y + 12)

    y += 16
  })

  y += 4

  // Social media strategy box
  fill(doc, PURPLE_LT)
  draw(doc, PURPLE)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 52, 2, 2, 'FD')
  fill(doc, PURPLE)
  doc.rect(MARGIN, y, 3, 52, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  color(doc, PURPLE)
  doc.text('SOCIAL MEDIA STRATEGY RECOMMENDATIONS', MARGIN + 8, y + 8)
  const socialRecs = [
    '• Create a consistent content calendar posting 4-5x per week on Instagram & Facebook',
    '• Use Instagram Reels and YouTube Shorts for maximum organic reach',
    '• Enable WhatsApp Business with catalog, quick replies and away messages',
    '• Run targeted local ads on Facebook/Instagram to reach nearby customers',
    '• Engage with comments and DMs within 2 hours to improve algorithm ranking',
    '• Use location tags and relevant hashtags on every post',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  color(doc, DARK2)
  socialRecs.forEach((r, i) => doc.text(r, MARGIN + 8, y + 17 + i * 6.5))

  pageFooter(doc, 7, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 8 — COMPETITOR GAP ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'Competitor Gap Analysis', `Score: ${lead.competitor_score || 'N/A'}/100`)

  // Gap analysis intro
  fill(doc, BG_LIGHT)
  draw(doc, BORDER)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 24, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  color(doc, DARK2)
  const gapIntro = `Competitors in ${lead.city || 'your area'} in the ${lead.industry || 'same industry'} are leveraging digital tools that ${lead.business_name || 'this business'} is currently missing out on. Below is a detailed gap analysis showing areas where competitors have an advantage.`
  const gapLines = doc.splitTextToSize(gapIntro, W - MARGIN * 2 - 8)
  doc.text(gapLines, MARGIN + 4, y + 8)
  y += 30

  // Gap comparison table
  const gaps = [
    { area: 'Professional Website', competitor: 'Most have', you: lead.website ? 'Present' : 'Missing', gap: !lead.website },
    { area: 'Google My Business', competitor: 'Optimized', you: lead.gmb_status === 'claimed' ? 'Claimed' : 'Unclaimed', gap: lead.gmb_status !== 'claimed' },
    { area: 'Customer Reviews', competitor: '50-200+ reviews', you: `${lead.google_reviews_count || 0} reviews`, gap: (lead.google_reviews_count || 0) < 30 },
    { area: 'Instagram Presence', competitor: 'Active accounts', you: lead.instagram_url ? 'Present' : 'Missing', gap: !lead.instagram_url },
    { area: 'Facebook Business Page', competitor: 'Active with ads', you: lead.facebook_url ? 'Present' : 'Missing', gap: !lead.facebook_url },
    { area: 'Online Booking / CTA', competitor: 'Book online available', you: lead.website ? 'Possibly present' : 'Not available', gap: !lead.website },
    { area: 'WhatsApp Business', competitor: '80% use it', you: lead.phone ? 'Possible (unverified)' : 'Unknown', gap: !lead.phone },
    { area: 'Paid Advertising', competitor: 'Running Google/FB ads', you: 'Not verified', gap: true },
  ]

  // Header row
  fill(doc, DARK2)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 9, 1.5, 1.5, 'F')
  color(doc, WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('AREA', MARGIN + 4, y + 6)
  doc.text('COMPETITORS', MARGIN + 74, y + 6)
  doc.text('YOUR BUSINESS', MARGIN + 122, y + 6)
  doc.text('GAP', W - MARGIN - 8, y + 6, { align: 'right' })
  y += 11

  gaps.forEach((g, i) => {
    fill(doc, i % 2 === 0 ? WHITE : BG_LIGHT)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 10, 1, 1, 'F')
    color(doc, DARK2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(g.area, MARGIN + 4, y + 7)
    color(doc, GREEN)
    doc.text(g.competitor, MARGIN + 74, y + 7)
    color(doc, g.gap ? RED : GREEN)
    doc.text(g.you, MARGIN + 122, y + 7)
    fill(doc, g.gap ? RED_LT : GREEN_LT)
    doc.roundedRect(W - MARGIN - 18, y + 1.5, 14, 7, 1.5, 1.5, 'F')
    color(doc, g.gap ? RED : GREEN)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(g.gap ? 'GAP' : 'OK', W - MARGIN - 11, y + 7, { align: 'center' })
    y += 12
  })

  pageFooter(doc, 8, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 9 — REVENUE OPPORTUNITY
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'Revenue Opportunity Analysis', 'Estimated digital marketing impact')

  // Revenue loss card
  fill(doc, RED_LT)
  draw(doc, RED)
  doc.setLineWidth(0.4)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 32, 2, 2, 'FD')
  fill(doc, RED)
  doc.rect(MARGIN, y, 4, 32, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  color(doc, RED)
  doc.text('ESTIMATED MONTHLY REVENUE LOSS', MARGIN + 9, y + 9)
  doc.setFontSize(7.5)
  color(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.text('Due to poor digital visibility and missing online channels:', MARGIN + 9, y + 16)
  const pain_points = Array.isArray(lead.pain_points) ? lead.pain_points : []
  const estimated_loss = lead.estimated_revenue_loss || (pain_points.length > 3 ? '₹50,000 – ₹1,50,000' : pain_points.length > 1 ? '₹20,000 – ₹75,000' : '₹10,000 – ₹40,000')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  color(doc, RED)
  doc.text(estimated_loss + '/month*', MARGIN + 9, y + 26)
  y += 38

  // Revenue gain card
  fill(doc, GREEN_LT)
  draw(doc, GREEN)
  doc.setLineWidth(0.4)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 32, 2, 2, 'FD')
  fill(doc, GREEN)
  doc.rect(MARGIN, y, 4, 32, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  color(doc, GREEN)
  doc.text('ESTIMATED REVENUE GAIN AFTER 6 MONTHS', MARGIN + 9, y + 9)
  doc.setFontSize(7.5)
  color(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.text('With a complete digital marketing strategy in place:', MARGIN + 9, y + 16)
  const estimated_gain = lead.estimated_revenue_gain || (pain_points.length > 3 ? '₹80,000 – ₹2,50,000' : '₹30,000 – ₹1,20,000')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  color(doc, GREEN)
  doc.text(estimated_gain + '/month*', MARGIN + 9, y + 26)
  y += 38

  // Revenue drivers
  color(doc, BLUE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('KEY REVENUE DRIVERS', MARGIN, y)
  y += 8

  const drivers = [
    { driver: 'Google My Business Optimization', impact: '+15-30%', desc: 'More local search visibility brings qualified foot traffic' },
    { driver: 'Professional Website with SEO', impact: '+20-40%', desc: 'Ranks for local keywords, captures leads 24/7' },
    { driver: 'Social Media Marketing', impact: '+10-25%', desc: 'Builds brand trust and drives repeat customers' },
    { driver: 'Paid Advertising (Google/Meta)', impact: '+25-50%', desc: 'Immediate leads with highly targeted campaigns' },
    { driver: 'WhatsApp + CRM Automation', impact: '+10-20%', desc: 'Faster response = higher conversion rates' },
  ]

  drivers.forEach((d) => {
    fill(doc, BG_LIGHT)
    draw(doc, BORDER)
    doc.setLineWidth(0.2)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 18, 2, 2, 'FD')
    color(doc, GREEN)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(d.impact, W - MARGIN - 4, y + 11, { align: 'right' })
    color(doc, DARK2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(d.driver, MARGIN + 4, y + 7)
    color(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(d.desc, MARGIN + 4, y + 14)
    y += 20
  })

  y += 2
  color(doc, MUTED)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.text('* Revenue estimates are based on industry averages and business size. Actual results may vary.', MARGIN, y)

  pageFooter(doc, 9, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 10 — 30-60-90 DAY ACTION PLAN
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, '30-60-90 Day Action Plan', 'Your digital transformation roadmap')

  const phases = [
    {
      period: '30 DAYS', label: 'Foundation', color: ORANGE, bgColor: ORANGE_LT,
      tasks: [
        'Claim and fully optimize Google My Business profile',
        'Build professional website with mobile optimization',
        'Set up WhatsApp Business with automated messages',
        'Create Instagram and Facebook business pages',
        'Conduct full digital presence audit and competitor research',
      ]
    },
    {
      period: '60 DAYS', label: 'Growth', color: BLUE, bgColor: BLUE_LT,
      tasks: [
        'Launch Google Ads and Meta (Facebook/Instagram) campaigns',
        'Start weekly social media content calendar',
        'Implement on-page SEO and local keyword optimization',
        'Set up Google Analytics and performance tracking',
        'Begin collecting customer reviews (target 20+ reviews)',
      ]
    },
    {
      period: '90 DAYS', label: 'Scale', color: GREEN, bgColor: GREEN_LT,
      tasks: [
        'Analyze campaign performance and scale winning ads',
        'Optimize landing pages for maximum conversion',
        'Launch email/WhatsApp follow-up automation',
        'Build Google review strategy (target 50+ reviews)',
        'Monthly performance report and strategy review',
      ]
    },
  ]

  phases.forEach((phase) => {
    fill(doc, phase.bgColor)
    draw(doc, phase.color)
    doc.setLineWidth(0.4)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 62, 2, 2, 'FD')
    fill(doc, phase.color)
    doc.rect(MARGIN, y, 4, 62, 'F')

    // Period badge
    fill(doc, phase.color)
    doc.roundedRect(MARGIN + 8, y + 5, 24, 9, 2, 2, 'F')
    color(doc, WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(phase.period, MARGIN + 20, y + 11, { align: 'center' })

    color(doc, phase.color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(phase.label, MARGIN + 36, y + 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    color(doc, DARK2)
    phase.tasks.forEach((task, i) => doc.text(`• ${task}`, MARGIN + 8, y + 24 + i * 8))

    y += 68
  })

  pageFooter(doc, 10, companyName, TOTAL_PAGES)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 11 — INVESTMENT ESTIMATE & CTA
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBase(doc)

  y = sectionHeader(doc, 22, 'Investment Estimate & Next Steps', 'Transparent pricing for your growth')

  // Packages
  const packages = [
    {
      name: 'Starter',
      price: '₹9,999/mo',
      color: BLUE,
      bgColor: BLUE_LT,
      items: ['GMB Optimization', 'Basic Social Media', 'WhatsApp Business Setup', '2x Posts/week', 'Monthly Report'],
    },
    {
      name: 'Growth',
      price: '₹19,999/mo',
      color: ORANGE,
      bgColor: ORANGE_LT,
      items: ['Everything in Starter', 'Professional Website', 'Google Ads (₹5k budget)', 'SEO Optimization', '5x Posts/week', 'Weekly Report'],
      highlight: true,
    },
    {
      name: 'Premium',
      price: '₹34,999/mo',
      color: PURPLE,
      bgColor: PURPLE_LT,
      items: ['Everything in Growth', 'Full Digital Strategy', 'Meta + Google Ads', 'Video Reels Creation', 'Dedicated Manager', 'Daily Reports'],
    },
  ]

  packages.forEach((pkg, i) => {
    const px = MARGIN + i * 60
    fill(doc, pkg.bgColor)
    draw(doc, pkg.color)
    doc.setLineWidth(pkg.highlight ? 1 : 0.3)
    doc.roundedRect(px, y, 56, 74, 2, 2, 'FD')
    fill(doc, pkg.color)
    doc.rect(px, y, 56, 12, 'F')
    color(doc, WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(pkg.name.toUpperCase(), px + 28, y + 8, { align: 'center' })

    if (pkg.highlight) {
      fill(doc, DARK)
      doc.roundedRect(px + 6, y - 4, 44, 6, 2, 2, 'F')
      color(doc, ORANGE)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.text('MOST POPULAR', px + 28, y + 0.5, { align: 'center' })
    }

    color(doc, pkg.color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(pkg.price, px + 28, y + 23, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    color(doc, DARK2)
    pkg.items.forEach((item, ii) => {
      doc.text(`✓  ${item}`, px + 4, y + 33 + ii * 7.5)
    })
  })

  y += 82

  // Pain points summary
  const painPoints = Array.isArray(lead.pain_points) ? lead.pain_points.slice(0, 3) : []
  if (painPoints.length > 0) {
    color(doc, RED)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('KEY ISSUES IDENTIFIED FOR THIS BUSINESS:', MARGIN, y)
    y += 7
    painPoints.forEach((pt) => {
      fill(doc, RED_LT)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 10, 1.5, 1.5, 'F')
      color(doc, RED)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('⚠', MARGIN + 4, y + 7)
      color(doc, DARK2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const ptLines = doc.splitTextToSize(pt, W - MARGIN * 2 - 14)
      doc.text(ptLines[0], MARGIN + 11, y + 7)
      y += 12
    })
    y += 4
  }

  // Services recommended
  const recServices = Array.isArray(lead.recommended_services) ? lead.recommended_services.slice(0, 4) : []
  if (recServices.length > 0) {
    color(doc, GREEN)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('RECOMMENDED SERVICES FOR ' + (lead.business_name || 'THIS BUSINESS').toUpperCase() + ':', MARGIN, y)
    y += 7
    recServices.forEach((svc, i) => {
      fill(doc, i % 2 === 0 ? GREEN_LT : BG_LIGHT)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 9, 1.5, 1.5, 'F')
      color(doc, GREEN)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.text(`${i + 1}.`, MARGIN + 3, y + 6.5)
      color(doc, DARK2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(svc, MARGIN + 9, y + 6.5)
      y += 11
    })
    y += 4
  }

  // CTA strip
  const ctaY = Math.min(y, 264)
  fill(doc, ORANGE)
  doc.roundedRect(MARGIN, ctaY, W - MARGIN * 2, 22, 3, 3, 'F')
  color(doc, WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Ready to dominate your local market?', MARGIN + 8, ctaY + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const ctaContact = [company.company_phone, company.company_email, company.company_website].filter(Boolean).join('  ·  ')
  doc.text(ctaContact || 'Contact us today to get started!', MARGIN + 8, ctaY + 16)

  // WhatsApp hook message
  if (lead.ai_hook_message) {
    const hookY = ctaY - 28
    fill(doc, BLUE_LT)
    draw(doc, BLUE)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN, hookY, W - MARGIN * 2, 24, 2, 2, 'FD')
    fill(doc, BLUE)
    doc.rect(MARGIN, hookY, 3, 24, 'F')
    color(doc, BLUE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('AI-GENERATED OUTREACH MESSAGE', MARGIN + 8, hookY + 6)
    color(doc, DARK2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const hookLines = doc.splitTextToSize(lead.ai_hook_message, W - MARGIN * 2 - 14)
    doc.text(hookLines.slice(0, 2), MARGIN + 8, hookY + 13)
  }

  pageFooter(doc, 11, companyName, TOTAL_PAGES)

  return doc
}

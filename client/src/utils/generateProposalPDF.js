import jsPDF from 'jspdf'
import 'jspdf-autotable'

const ORANGE = [255, 107, 53]
const BLUE   = [14, 165, 233]
const DARK   = [5, 6, 15]
const DARK2  = [17, 18, 38]
const DARK3  = [26, 26, 46]
const WHITE  = [240, 244, 255]
const MUTED  = [148, 163, 184]
const BORDER = [30, 32, 60]

function hex2rgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function setFill(doc, rgb) { doc.setFillColor(...rgb) }
function setDraw(doc, rgb) { doc.setDrawColor(...rgb) }
function setFont(doc, rgb) { doc.setTextColor(...rgb) }

function inr(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0)
}

/**
 * Generate a dark-themed Proposal PDF.
 * @param {Object} proposal - proposal row from DB + services array
 * @param {Object} lead - associated lead row
 * @param {Object} company - company settings
 * @returns {jsPDF} document instance
 */
export function generateProposalPDF(proposal, lead, company = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const MARGIN = 16

  // ── Page 1: Cover ────────────────────────────────────────────────────────
  // Background
  setFill(doc, DARK)
  doc.rect(0, 0, W, 297, 'F')

  // Orange accent bar top
  setFill(doc, ORANGE)
  doc.rect(0, 0, W, 2, 'F')

  // Company name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  setFont(doc, ORANGE)
  doc.text(company.company_name || 'StartWeb', MARGIN, 36)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setFont(doc, MUTED)
  doc.text('Web & Digital Agency · ' + (company.company_website || 'startweb.cloud'), MARGIN, 44)

  // Divider
  setDraw(doc, BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, 50, W - MARGIN, 50)

  // "PROPOSAL" label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setFont(doc, BLUE)
  doc.text('PROPOSAL', MARGIN, 62)

  // Title
  doc.setFontSize(22)
  setFont(doc, WHITE)
  const title = proposal.title || `Proposal for ${lead?.business_name || 'Client'}`
  const titleLines = doc.splitTextToSize(title, W - MARGIN * 2)
  doc.text(titleLines, MARGIN, 72)

  // Proposal number + date
  const y1 = 72 + titleLines.length * 8 + 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setFont(doc, MUTED)
  const date = proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Proposal #${proposal.proposal_number || '—'}`, MARGIN, y1)
  doc.text(`Date: ${date}`, MARGIN, y1 + 7)
  doc.text(`Valid for ${proposal.validity_days || 30} days`, MARGIN, y1 + 14)

  // Prepared for box
  const boxY = y1 + 30
  setFill(doc, DARK2)
  setDraw(doc, BORDER)
  doc.setLineWidth(0.4)
  doc.roundedRect(MARGIN, boxY, W - MARGIN * 2, 42, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setFont(doc, BLUE)
  doc.text('PREPARED FOR', MARGIN + 8, boxY + 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setFont(doc, WHITE)
  doc.text(lead?.business_name || 'Client', MARGIN + 8, boxY + 19)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setFont(doc, MUTED)
  if (lead?.owner_name) doc.text(lead.owner_name, MARGIN + 8, boxY + 27)
  if (lead?.city) doc.text(lead.city, MARGIN + 8, boxY + 34)

  // Total highlight
  setFill(doc, DARK3)
  setDraw(doc, ORANGE)
  doc.setLineWidth(0.8)
  doc.roundedRect(W - MARGIN - 55, boxY + 4, 47, 34, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setFont(doc, MUTED)
  doc.text('TOTAL VALUE', W - MARGIN - 52, boxY + 13, { align: 'left' })
  doc.setFontSize(15)
  setFont(doc, ORANGE)
  doc.text(inr(proposal.total), W - MARGIN - 52, boxY + 25, { align: 'left' })

  // Footer
  setFont(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${company.company_name || 'StartWeb'} · ${company.company_email || 'hello@startweb.cloud'}`, MARGIN, 285)
  doc.text('Confidential', W - MARGIN, 285, { align: 'right' })
  setFill(doc, ORANGE)
  doc.rect(0, 295, W, 2, 'F')

  // ── Page 2: Services & Pricing ───────────────────────────────────────────
  doc.addPage()
  setFill(doc, DARK)
  doc.rect(0, 0, W, 297, 'F')
  setFill(doc, ORANGE)
  doc.rect(0, 0, W, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setFont(doc, WHITE)
  doc.text('Services & Investment', MARGIN, 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setFont(doc, MUTED)
  doc.text('Tailored specifically for ' + (lead?.business_name || 'your business'), MARGIN, 32)

  const services = Array.isArray(proposal.services) ? proposal.services : []
  const tableRows = services.map((s, i) => [
    (i + 1).toString(),
    s.name || '',
    s.price_type || 'fixed',
    inr(s.price ?? s.base_price ?? 0),
  ])

  doc.autoTable({
    startY: 40,
    head: [['#', 'Service / Deliverable', 'Type', 'Price']],
    body: tableRows,
    styles: { fillColor: DARK2, textColor: WHITE, lineColor: BORDER, lineWidth: 0.2, fontSize: 10 },
    headStyles: { fillColor: DARK3, textColor: ORANGE, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [12, 14, 30] },
    columnStyles: { 0: { cellWidth: 12 }, 3: { halign: 'right', textColor: BLUE } },
    margin: { left: MARGIN, right: MARGIN },
  })

  const afterTable = doc.lastAutoTable.finalY + 8
  // Totals
  const totalRows = [
    ['Subtotal', inr(proposal.subtotal)],
    proposal.discount ? ['Discount', `- ${inr(proposal.discount)}`] : null,
    ['Tax (' + (proposal.tax_percent || 0) + '%)', inr(proposal.tax_amount)],
  ].filter(Boolean)

  totalRows.forEach((row, i) => {
    const ty = afterTable + i * 8
    setFont(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(row[0], W - MARGIN - 70, ty)
    setFont(doc, WHITE)
    doc.text(row[1], W - MARGIN, ty, { align: 'right' })
  })

  const totalY = afterTable + totalRows.length * 8 + 4
  setFill(doc, DARK3)
  setDraw(doc, ORANGE)
  doc.setLineWidth(0.5)
  doc.roundedRect(W - MARGIN - 72, totalY - 6, 64, 12, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  setFont(doc, ORANGE)
  doc.text('Total: ' + inr(proposal.total), W - MARGIN - 4, totalY + 2, { align: 'right' })

  // Footer page 2
  setFont(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${company.company_name || 'StartWeb'} · Proposal #${proposal.proposal_number || '—'}`, MARGIN, 285)
  doc.text('Page 2', W - MARGIN, 285, { align: 'right' })
  setFill(doc, ORANGE)
  doc.rect(0, 295, W, 2, 'F')

  // ── Page 3: About / Why Us / Timeline ────────────────────────────────────
  doc.addPage()
  setFill(doc, DARK)
  doc.rect(0, 0, W, 297, 'F')
  setFill(doc, ORANGE)
  doc.rect(0, 0, W, 2, 'F')

  let pageY = 24

  const addSection = (heading, body, color = BLUE) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    setFont(doc, color)
    doc.text(heading, MARGIN, pageY)
    pageY += 7
    setFill(doc, DARK2)
    const lines = doc.splitTextToSize(body || 'Content coming soon.', W - MARGIN * 2 - 16)
    const boxH = lines.length * 5.5 + 12
    doc.roundedRect(MARGIN, pageY, W - MARGIN * 2, boxH, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    setFont(doc, WHITE)
    doc.text(lines, MARGIN + 8, pageY + 8)
    pageY += boxH + 10
  }

  if (proposal.ai_intro) addSection('Introduction', proposal.ai_intro, ORANGE)
  if (proposal.ai_why_us) addSection('Why StartWeb?', proposal.ai_why_us, BLUE)
  if (proposal.ai_timeline) addSection('Project Timeline', proposal.ai_timeline, BLUE)
  if (proposal.ai_closing) addSection('Next Steps', proposal.ai_closing, ORANGE)

  if (!proposal.ai_intro && !proposal.ai_why_us) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    setFont(doc, MUTED)
    doc.text('Generate AI content in Proposal Builder to populate this section.', MARGIN, 40)
  }

  // Footer page 3
  setFont(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${company.company_name || 'StartWeb'} · Proposal #${proposal.proposal_number || '—'}`, MARGIN, 285)
  doc.text('Page 3', W - MARGIN, 285, { align: 'right' })
  setFill(doc, ORANGE)
  doc.rect(0, 295, W, 2, 'F')

  // ── Page 4: Terms & Sign-off ─────────────────────────────────────────────
  doc.addPage()
  setFill(doc, DARK)
  doc.rect(0, 0, W, 297, 'F')
  setFill(doc, ORANGE)
  doc.rect(0, 0, W, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setFont(doc, WHITE)
  doc.text('Payment Terms', MARGIN, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setFont(doc, WHITE)
  const terms = proposal.payment_terms || '50% advance · 50% on delivery'
  const termsLines = doc.splitTextToSize(terms, W - MARGIN * 2 - 16)
  setFill(doc, DARK2)
  doc.roundedRect(MARGIN, 30, W - MARGIN * 2, termsLines.length * 6 + 12, 3, 3, 'F')
  doc.text(termsLines, MARGIN + 8, 39)

  // Validity
  const validY = 30 + termsLines.length * 6 + 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  setFont(doc, BLUE)
  doc.text('Proposal Validity', MARGIN, validY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setFont(doc, MUTED)
  const expires = proposal.expires_at ? new Date(proposal.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  doc.text(`This proposal is valid until ${expires}.`, MARGIN, validY + 8)

  // Signature block
  const sigY = validY + 30
  setFill(doc, DARK2)
  setDraw(doc, BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, sigY, (W - MARGIN * 2 - 8) / 2, 36, 3, 3, 'FD')
  doc.roundedRect(MARGIN + (W - MARGIN * 2 - 8) / 2 + 8, sigY, (W - MARGIN * 2 - 8) / 2, 36, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setFont(doc, ORANGE)
  doc.text(company.company_name || 'StartWeb', MARGIN + 8, sigY + 10)
  doc.text(lead?.business_name || 'Client', MARGIN + (W - MARGIN * 2 - 8) / 2 + 16, sigY + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setFont(doc, MUTED)
  doc.text('Authorized Signature', MARGIN + 8, sigY + 20)
  doc.text('Client Signature & Date', MARGIN + (W - MARGIN * 2 - 8) / 2 + 16, sigY + 20)

  // Contact strip
  const ctY = sigY + 50
  setFill(doc, DARK3)
  doc.rect(0, ctY, W, 30, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  setFont(doc, WHITE)
  doc.text('Ready to proceed? Contact us:', MARGIN, ctY + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setFont(doc, MUTED)
  doc.text(`${company.company_email || 'hello@startweb.cloud'}`, MARGIN, ctY + 20)
  doc.text(`${company.company_website || 'startweb.cloud'}`, W - MARGIN, ctY + 20, { align: 'right' })

  // Footer page 4
  setFont(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${company.company_name || 'StartWeb'} · Proposal #${proposal.proposal_number || '—'}`, MARGIN, 285)
  doc.text('Page 4', W - MARGIN, 285, { align: 'right' })
  setFill(doc, ORANGE)
  doc.rect(0, 295, W, 2, 'F')

  return doc
}

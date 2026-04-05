import jsPDF from 'jspdf'
import 'jspdf-autotable'

const ORANGE = [255, 107, 53]
const BLUE   = [14, 165, 233]
const GREEN  = [16, 185, 129]
const DARK   = [5, 6, 15]
const DARK2  = [17, 18, 38]
const DARK3  = [26, 26, 46]
const WHITE  = [240, 244, 255]
const MUTED  = [148, 163, 184]
const BORDER = [30, 32, 60]

function setFill(doc, rgb) { doc.setFillColor(...rgb) }
function setDraw(doc, rgb) { doc.setDrawColor(...rgb) }
function setFont(doc, rgb) { doc.setTextColor(...rgb) }

function inr(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0)
}

/**
 * Generate a dark-themed Invoice PDF.
 * @param {Object} invoice - invoice row from DB
 * @param {Object} company - company settings
 * @returns {jsPDF} document instance
 */
export function generateInvoicePDF(invoice, company = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const MARGIN = 16

  // ── Page 1: Invoice ──────────────────────────────────────────────────────
  setFill(doc, DARK)
  doc.rect(0, 0, W, 297, 'F')
  setFill(doc, BLUE)
  doc.rect(0, 0, W, 2, 'F')

  // Header row
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  setFont(doc, WHITE)
  doc.text(company.company_name || 'StartWeb', MARGIN, 24)

  // INVOICE badge top-right
  setFill(doc, DARK2)
  setDraw(doc, BLUE)
  doc.setLineWidth(0.5)
  doc.roundedRect(W - MARGIN - 54, 12, 46, 18, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setFont(doc, BLUE)
  doc.text('INVOICE', W - MARGIN - 8, 19, { align: 'right' })
  doc.setFontSize(13)
  setFont(doc, WHITE)
  doc.text('#' + (invoice.invoice_number || '—'), W - MARGIN - 8, 27, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setFont(doc, MUTED)
  doc.text(company.company_email || 'hello@startweb.cloud', MARGIN, 31)
  doc.text(company.company_website || 'startweb.cloud', MARGIN, 37)

  // Divider
  setDraw(doc, BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, 44, W - MARGIN, 44)

  // Bill from / Bill to
  const colW = (W - MARGIN * 2 - 8) / 2
  setFill(doc, DARK2)
  doc.roundedRect(MARGIN, 50, colW, 38, 3, 3, 'F')
  doc.roundedRect(MARGIN + colW + 8, 50, colW, 38, 3, 3, 'F')

  const billBox = (x, label, name, detail1, detail2) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setFont(doc, BLUE)
    doc.text(label, x + 8, 59)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setFont(doc, WHITE)
    doc.text(name || '—', x + 8, 68)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    setFont(doc, MUTED)
    if (detail1) doc.text(detail1, x + 8, 75)
    if (detail2) doc.text(detail2, x + 8, 81)
  }

  billBox(MARGIN, 'FROM', company.company_name || 'StartWeb', company.company_email, company.company_address || 'Panvel, Navi Mumbai')
  billBox(MARGIN + colW + 8, 'BILL TO', invoice.client_name || invoice.title || 'Client', invoice.client_email, invoice.client_phone)

  // Meta row: date, due, status
  const metaY = 97
  const metaW = (W - MARGIN * 2 - 16) / 3
  const metaItems = [
    { label: 'INVOICE DATE', value: invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IN') : '—' },
    { label: 'DUE DATE', value: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '—' },
    { label: 'STATUS', value: (invoice.status || 'draft').toUpperCase() },
  ]
  metaItems.forEach((m, i) => {
    const mx = MARGIN + i * (metaW + 8)
    setFill(doc, DARK3)
    doc.roundedRect(mx, metaY, metaW, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    setFont(doc, MUTED)
    doc.text(m.label, mx + 6, metaY + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setFont(doc, m.label === 'STATUS' ? (invoice.status === 'paid' ? GREEN : invoice.status === 'overdue' ? ORANGE : BLUE) : WHITE)
    doc.text(m.value, mx + 6, metaY + 13)
  })

  // Line items table
  const items = Array.isArray(invoice.line_items) ? invoice.line_items : (invoice.services || [])
  const tableRows = items.map((item, i) => [
    (i + 1).toString(),
    item.description || item.name || '—',
    String(item.qty ?? item.quantity ?? 1),
    inr(item.rate ?? item.unit_price ?? 0),
    inr((item.qty ?? item.quantity ?? 1) * (item.rate ?? item.unit_price ?? 0)),
  ])

  doc.autoTable({
    startY: 120,
    head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableRows,
    styles: { fillColor: DARK2, textColor: WHITE, lineColor: BORDER, lineWidth: 0.2, fontSize: 10 },
    headStyles: { fillColor: DARK3, textColor: BLUE, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [12, 14, 30] },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', textColor: WHITE },
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  const tY = doc.lastAutoTable.finalY + 6

  // Totals
  const totalsData = [
    ['Subtotal', inr(invoice.subtotal)],
    invoice.discount ? ['Discount', `- ${inr(invoice.discount)}`] : null,
    [`Tax (${invoice.tax_percent || 0}%)`, inr(invoice.tax_amount)],
  ].filter(Boolean)

  totalsData.forEach((row, i) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    setFont(doc, MUTED)
    doc.text(row[0], W - MARGIN - 70, tY + i * 8)
    setFont(doc, WHITE)
    doc.text(row[1], W - MARGIN, tY + i * 8, { align: 'right' })
  })

  const grandY = tY + totalsData.length * 8 + 4
  setFill(doc, DARK3)
  setDraw(doc, BLUE)
  doc.setLineWidth(0.5)
  doc.roundedRect(W - MARGIN - 72, grandY - 6, 64, 13, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  setFont(doc, BLUE)
  doc.text('TOTAL: ' + inr(invoice.total), W - MARGIN - 4, grandY + 3, { align: 'right' })

  // UPI / payment info
  const payY = grandY + 20
  if (invoice.upi_id || company.upi_id) {
    setFill(doc, DARK2)
    setDraw(doc, BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN, payY, W - MARGIN * 2, 22, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setFont(doc, ORANGE)
    doc.text('UPI PAYMENT', MARGIN + 8, payY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    setFont(doc, WHITE)
    doc.text(invoice.upi_id || company.upi_id, MARGIN + 8, payY + 16)
  }

  // Footer
  setFont(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${company.company_name || 'StartWeb'} · Thank you for your business!`, MARGIN, 285)
  doc.text('Page 1', W - MARGIN, 285, { align: 'right' })
  setFill(doc, BLUE)
  doc.rect(0, 295, W, 2, 'F')

  return doc
}

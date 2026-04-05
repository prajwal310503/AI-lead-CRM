const router = require('express').Router()
const { supabase, authMiddleware } = require('../middleware/auth')
const QRCode = require('qrcode')

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('invoices').select('*, clients(name, email, phone)').order('created_at', { ascending: false })
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/', async (req, res) => {
  const { data, error } = await supabase.from('invoices').insert({ ...req.body, created_by: req.user.id }).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.put('/:id', async (req, res) => {
  const { data, error } = await supabase.from('invoices').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST /api/payments/generate-qr
router.post('/generate-qr', async (req, res) => {
  const { invoiceId } = req.body
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  const { data: settings } = await supabase.from('app_settings').select('upi_id').eq('user_id', req.user.id).single()
  const upiId = invoice.upi_id || settings?.upi_id || ''
  if (!upiId) return res.status(400).json({ error: 'No UPI ID configured' })

  const upiUrl = `upi://pay?pa=${upiId}&am=${invoice.amount_due}&cu=INR&tn=Invoice ${invoice.invoice_number}`
  const qrDataUrl = await QRCode.toDataURL(upiUrl, { width: 300, margin: 2 })

  // Upload to Supabase Storage
  const buffer = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const path = `invoices/qr-${invoiceId}.png`
  const { error: uploadError } = await supabase.storage.from('invoices').upload(path, buffer, { contentType: 'image/png', upsert: true })
  if (uploadError) return res.json({ qrDataUrl })

  const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path)
  await supabase.from('invoices').update({ qr_code_url: urlData.publicUrl }).eq('id', invoiceId)

  res.json({ qrUrl: urlData.publicUrl, qrDataUrl })
})

// POST /api/payments/record
router.post('/record', async (req, res) => {
  const { invoiceId, amount, method, reference, notes } = req.body
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  await supabase.from('payments').insert({ invoice_id: invoiceId, client_id: invoice.client_id, amount, method, reference, notes, recorded_by: req.user.id, payment_date: new Date().toISOString().split('T')[0] })

  const newPaid = (invoice.amount_paid || 0) + amount
  const newDue = Math.max(0, invoice.total - newPaid)
  await supabase.from('invoices').update({ amount_paid: newPaid, amount_due: newDue, status: newDue <= 0 ? 'paid' : 'partial', paid_at: newDue <= 0 ? new Date().toISOString() : null }).eq('id', invoiceId)

  res.json({ success: true, amountPaid: newPaid, amountDue: newDue })
})

module.exports = router

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { supabase } from '../../../lib/supabase'
import useAuthStore from '../../../stores/useAuthStore'
import useSettingsStore from '../../../stores/useSettingsStore'
import { formatCurrency } from '../../../utils/format'
import toast from 'react-hot-toast'
import api from '../../../lib/api'

export default function InvoiceBuilder({ open, onClose, onCreated, clientId: defaultClientId }) {
  const { user } = useAuthStore()
  const settings = useSettingsStore()
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || '')
  const [items, setItems] = useState([{ description: '', qty: 1, unit_price: 0 }])
  const [discount, setDiscount] = useState(0)
  const [taxPercent, setTaxPercent] = useState(settings.defaultTax || 18)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      supabase.from('clients').select('id, name, email, phone').eq('is_active', true).then(({ data }) => setClients(data || []))
      setItems([{ description: '', qty: 1, unit_price: 0 }])
      setSelectedClientId(defaultClientId || '')
    }
  }, [open])

  const subtotal = items.reduce((s, i) => s + (i.qty * i.unit_price), 0)
  const afterDiscount = subtotal - discount
  const taxAmount = (afterDiscount * taxPercent) / 100
  const total = afterDiscount + taxAmount

  const addItem = () => setItems((prev) => [...prev, { description: '', qty: 1, unit_price: 0 }])
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i))
  const updateItem = (i, key, val) => setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  const handleCreate = async () => {
    if (!selectedClientId) { toast.error('Select a client'); return }
    if (!items[0].description) { toast.error('Add at least one item'); return }
    setSaving(true)
    try {
      // Get invoice counter
      const { data: settingsData } = await supabase.from('app_settings').select('invoice_counter, invoice_prefix').eq('user_id', user.id).single()
      const counter = (settingsData?.invoice_counter || 0) + 1
      const prefix = settingsData?.invoice_prefix || settings.invoicePrefix || 'SW'
      const year = new Date().getFullYear()
      const invoice_number = `${prefix}-${year}-${String(counter).padStart(3, '0')}`

      // Update counter
      await supabase.from('app_settings').update({ invoice_counter: counter }).eq('user_id', user.id)

      // Create invoice
      const { data: inv, error } = await supabase.from('invoices').insert({
        client_id: selectedClientId,
        created_by: user.id,
        invoice_number,
        status: 'draft',
        items: items.filter((i) => i.description),
        subtotal,
        discount,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        amount_due: total,
        currency: 'INR',
        payment_terms: settings.paymentTerms || 'Due on receipt',
        due_date: dueDate || null,
        upi_id: settings.upiId || null,
        notes,
      }).select().single()

      if (error) throw error

      // Generate QR via server
      try {
        await api.post('/api/payments/generate-qr', { invoiceId: inv.id })
      } catch {}

      toast.success('Invoice created!')
      onCreated?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Invoice" size="xl">
      <div className="space-y-4">
        {/* Client selector */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Client *</label>
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="input-glass">
            <option value="">Select client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Items</label>
            <button onClick={addItem} className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--blue)' }}>
              <Plus size={12} /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1">
              {['Description','Qty','Unit Price','Total'].map((h, i) => (
                <div key={h} className={`text-[10px] font-semibold uppercase tracking-wider ${i === 0 ? 'col-span-6' : 'col-span-2'}`} style={{ color: 'var(--text-muted)' }}>{h}</div>
              ))}
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Item description" className="input-glass col-span-6 text-sm" />
                <input type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} className="input-glass col-span-2 text-sm" min={1} />
                <input type="number" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="input-glass col-span-2 text-sm" min={0} />
                <div className="col-span-1 text-sm font-semibold" style={{ color: 'var(--emerald)' }}>{formatCurrency(item.qty * item.unit_price)}</div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="col-span-1 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                    <Trash2 size={13} style={{ color: 'var(--crimson)' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Discount (₹)</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="input-glass" min={0} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>GST %</label>
              <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)} className="input-glass" step={0.5} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-glass" />
            </div>
          </div>
          <div className="space-y-1 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Discount</span><span style={{ color: 'var(--crimson)' }}>- {formatCurrency(discount)}</span></div>}
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>GST ({taxPercent}%)</span><span>{formatCurrency(taxAmount)}</span></div>
            <div className="flex justify-between font-extrabold text-lg border-t pt-1" style={{ borderColor: 'var(--border)', color: 'var(--emerald)' }}>
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-glass resize-none" rows={2} />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Creating...' : 'Create Invoice'}</button>
        </div>
      </div>
    </Modal>
  )
}

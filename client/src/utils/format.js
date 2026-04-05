import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatNumber(n) {
  return new Intl.NumberFormat('en-IN').format(n || 0)
}

export function formatDate(date) {
  if (!date) return '—'
  const d = new Date(date)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd MMM yyyy')
}

export function formatDateTime(date) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy, hh:mm a')
}

export function timeAgo(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  return phone
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function truncate(str, n = 60) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '...' : str
}

export function scoreColor(score) {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#0EA5E9'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

export function scoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Average'
  return 'Poor'
}

export function priorityColor(priority) {
  const map = { urgent: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981' }
  return map[priority] || '#8892AA'
}

export function statusColor(status) {
  const map = {
    cold: '#64748B', contacted: '#3B82F6', warm: '#F59E0B', hot: '#F97316',
    proposal_sent: '#8B5CF6', negotiation: '#EAB308', converted: '#10B981', lost: '#EF4444',
    active: '#10B981', inactive: '#64748B', pending: '#F59E0B',
    draft: '#64748B', sent: '#3B82F6', viewed: '#8B5CF6', accepted: '#10B981',
    rejected: '#EF4444', paid: '#10B981', overdue: '#EF4444', partial: '#F59E0B',
    todo: '#64748B', in_progress: '#3B82F6', review: '#8B5CF6', done: '#10B981',
  }
  return map[status] || '#8892AA'
}

// ── Extract clean locality from a Google Maps address string ─────────────────
// "Shop No. 05, Karanjade, Panvel, Navi Mumbai, MH 410206" → "Karanjade, Panvel"
// "Anusaya Heights, Taluka Panvel, Navi Mumbai, MH"        → "Panvel, Navi Mumbai"
// "Vashi, Navi Mumbai, Maharashtra"                        → "Vashi, Navi Mumbai"
const _GEO_SKIP = new Set([
  'india','maharashtra','karnataka','gujarat','rajasthan','punjab','haryana',
  'uttar pradesh','madhya pradesh','tamil nadu','andhra pradesh','telangana',
  'kerala','west bengal','bihar','odisha','goa','himachal pradesh',
  'uttarakhand','jharkhand','assam','delhi','new delhi','chandigarh',
])
const _ADDR_PFX = /^(shop|unit|flat|door|house|plot|survey|s\.?no|bldg|building|floor|gala|office|room|block|near|opp|opposite|behind|beside|above|below|next\s+to)\b/i
const _BLDG_SFX = /\b(heights?|towers?|residency|residences?|complex|plaza|angaan|angana|chawl|chsl|enclave|estate|arcade|mansions?|apartments?|apts?)\b/i
const _ADMIN_PFX = /^(taluka|tehsil|tehseel|district|dist\.?|mandal|sub.?division|ward)\s+/i

export function getArea(lead, maxParts = 2) {
  const raw = (lead?.location || lead?.address || '').trim()
  if (raw) {
    const meaningful = raw
      .split(',')
      .map(p => p.trim().replace(_ADMIN_PFX, '').trim())  // "Taluka Panvel" → "Panvel"
      .filter(p => {
        if (!p) return false
        if (/^\d+$/.test(p)) return false              // pure pin code
        if (/\d{4,}/.test(p)) return false             // "MH 400001"
        if (_GEO_SKIP.has(p.toLowerCase())) return false
        if (_ADDR_PFX.test(p)) return false            // "Shop No. 05"
        if (_BLDG_SFX.test(p)) return false            // "Anusaya Heights"
        return true
      })
    if (meaningful.length >= 2) return meaningful.slice(0, maxParts).join(', ')
    if (meaningful.length === 1) return meaningful[0]
  }
  return lead?.city || '—'
}

// Returns just the city portion (e.g. "Navi Mumbai") for use on cards/compact views
export function getCityShort(lead) {
  if (lead?.city) return lead.city
  const full = getArea(lead, 4)
  if (!full || full === '—') return '—'
  const parts = full.split(', ')
  return parts[parts.length - 1]
}

export function calcInvoiceTotals(items = [], discountOrTax = 0, taxPercent = null) {
  // Supports two call signatures:
  //   calcInvoiceTotals(items, taxRate)              → { subtotal, tax, total }
  //   calcInvoiceTotals(items, discount, taxPercent) → { subtotal, discount, taxAmount, total }
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty ?? item.quantity ?? 1)
    const price = parseFloat(item.unit_price ?? item.rate ?? 0)
    return sum + qty * price
  }, 0)

  if (taxPercent === null) {
    // Two-arg form: (items, taxRate)
    const tax = subtotal * (parseFloat(discountOrTax) / 100)
    return { subtotal, tax, taxAmount: tax, total: subtotal + tax }
  }
  // Three-arg form: (items, discount, taxPercent)
  const discount = parseFloat(discountOrTax) || 0
  const discounted = subtotal - discount
  const taxAmount = discounted * (parseFloat(taxPercent) / 100)
  return { subtotal, discount, taxAmount, tax: taxAmount, total: discounted + taxAmount }
}

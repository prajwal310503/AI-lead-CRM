export function generateInvoiceNumber(prefix = 'SW', counter = 1) {
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${String(counter).padStart(3, '0')}`
}

export function generateProposalNumber(counter = 1) {
  const year = new Date().getFullYear()
  return `PROP-${year}-${String(counter).padStart(3, '0')}`
}

export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  }
  const el = document.createElement('textarea')
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export function openWhatsApp(phone, message = '') {
  const cleaned = phone?.replace(/\D/g, '') || ''
  const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

export function downloadFile(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export function calcInvoiceTotals(items, discountAmount = 0, taxPercent = 18) {
  const subtotal = items.reduce((sum, i) => sum + (i.qty * i.unit_price), 0)
  const afterDiscount = subtotal - discountAmount
  const taxAmount = (afterDiscount * taxPercent) / 100
  const total = afterDiscount + taxAmount
  return { subtotal, taxAmount, total, amountDue: total }
}

export function buildWaDeepLink(phone, message) {
  const cleaned = (phone || '').replace(/\D/g, '')
  const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function getFileIcon(type) {
  if (!type) return 'File'
  if (type.includes('image')) return 'Image'
  if (type.includes('pdf')) return 'FileText'
  if (type.includes('video')) return 'Video'
  if (type.includes('audio')) return 'Music'
  if (type.includes('zip') || type.includes('archive')) return 'Archive'
  if (type.includes('spreadsheet') || type.includes('excel')) return 'Table'
  if (type.includes('doc') || type.includes('word')) return 'FileText'
  return 'File'
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

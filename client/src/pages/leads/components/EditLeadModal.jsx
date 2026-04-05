import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  Loader, ChevronDown, ChevronUp, Plus,
  Instagram, Facebook, Linkedin, Youtube, Twitter, Globe,
  MapPin, Search, Building2, CheckCircle,
  Phone, Mail, User2,
} from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { supabase } from '../../../lib/supabase'
import api from '../../../lib/api'
import { GMB_INDUSTRIES } from '../../../lib/categories'
import toast from 'react-hot-toast'

const STAGE_OPTIONS = [
  { value: 'cold',          label: 'Cold' },
  { value: 'contacted',     label: 'Contacted' },
  { value: 'warm',          label: 'Warm' },
  { value: 'hot',           label: 'Hot' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation',   label: 'Negotiation' },
  { value: 'converted',     label: 'Converted' },
  { value: 'closed',        label: 'Closed' },
  { value: 'lost',          label: 'Lost' },
]

const GMB_STATUS_OPTIONS = [
  { value: '',           label: 'Unknown' },
  { value: 'claimed',    label: 'Claimed' },
  { value: 'unclaimed',  label: 'Unclaimed' },
  { value: 'missing',    label: 'Missing' },
]

// ── Custom portaled select dropdown (with search + optional manual add) ─────
function CustomSelect({ value, onChange, options, placeholder = 'Select...', allowCustom = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
      setSearch('')
      setShowCustom(false)
      setCustomVal('')
      setTimeout(() => searchRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    const h = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const selected = options.find((o) => (typeof o === 'string' ? o : o.value) === value)
  const displayLabel = selected ? (typeof selected === 'string' ? selected : selected.label) : (value || placeholder)

  const filtered = search.trim()
    ? options.filter((o) => { const lbl = typeof o === 'string' ? o : o.label; return lbl.toLowerCase().includes(search.toLowerCase()) })
    : options

  const maxH = 300
  const spaceBelow = rect ? window.innerHeight - rect.bottom - 8 : 999

  const addCustom = () => {
    const v = customVal.trim()
    if (v) { onChange(v); setOpen(false) }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="input-glass flex items-center justify-between text-left gap-2"
        style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)', userSelect: 'none' }}
      >
        <span className="flex-1 truncate text-sm">{displayLabel}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </motion.div>
      </button>

      {open && rect && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: rect.left,
            width: Math.max(rect.width, 220),
            zIndex: 99999,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            maxHeight: maxH,
            display: 'flex',
            flexDirection: 'column',
            top: spaceBelow >= maxH ? rect.bottom + 4 : undefined,
            bottom: spaceBelow < maxH ? window.innerHeight - rect.top + 4 : undefined,
          }}
        >
          {/* Search bar */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Search..."
                style={{
                  width: '100%', padding: '6px 8px 6px 26px', fontSize: 12,
                  border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No results</div>
            ) : filtered.map((o) => {
              const val = typeof o === 'string' ? o : o.value
              const lbl = typeof o === 'string' ? o : o.label
              const isSelected = val === value
              return (
                <button
                  key={val || '__empty'}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(val); setOpen(false) }}
                  style={{
                    width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? '#FF6B35' : 'var(--text-primary)',
                    background: isSelected ? 'rgba(255,107,53,0.08)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {lbl}
                  {isSelected && <CheckCircle size={12} style={{ color: '#FF6B35', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>

          {/* Add manually (industry only) */}
          {allowCustom && (
            <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 10px', flexShrink: 0 }}>
              {!showCustom ? (
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontSize: 12, color: '#FF6B35', borderRadius: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fff5f0' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Plus size={12} /> Add category manually
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addCustom() } }}
                    placeholder="Type category name..."
                    autoFocus
                    style={{
                      flex: 1, padding: '5px 8px', fontSize: 12,
                      border: '1px solid #FF6B35', borderRadius: 6, outline: 'none',
                      background: 'rgba(255,107,53,0.08)', color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    style={{
                      padding: '5px 10px', background: '#FF6B35', color: '#fff',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >Add</button>
                </div>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// ── GMB Autocomplete Dropdown (portaled) ────────────────────────────────────
function GmbDropdown({ inputRef, suggestions, loading, onSelect, onClose }) {
  const menuRef = useRef(null)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
  }, [suggestions, loading, inputRef])

  useEffect(() => {
    const h = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, inputRef])

  if (!rect) return null

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width,
        zIndex: 99999, background: '#ffffff', border: '1px solid #e5e7eb',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
      }}
    >
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-3">
          <Loader size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Searching Google Maps...</span>
        </div>
      ) : (
        <>
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s) }}
              type="button"
              style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fff5f0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Building2 size={15} style={{ color: '#FF6B35', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{s.name}</p>
                {s.address && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{s.address}</p>}
              </div>
            </button>
          ))}
          <button
            onMouseDown={(e) => { e.preventDefault(); onClose() }}
            type="button"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
              border: 'none', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add manually — no GMB listing</span>
          </button>
        </>
      )}
    </div>,
    document.body
  )
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function EditLeadModal({ open, onClose, lead, onUpdated }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [showSocial, setShowSocial] = useState(false)

  // GMB state
  const [gmbSuggestions, setGmbSuggestions] = useState([])
  const [gmbLoading, setGmbLoading] = useState(false)
  const [showGmb, setShowGmb] = useState(false)
  const [gmbFetching, setGmbFetching] = useState(false)

  const businessInputRef = useRef(null)
  const gmbTimerRef = useRef(null)

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['leads'] })
    qc.invalidateQueries({ queryKey: ['crm-leads'] })
    qc.invalidateQueries({ queryKey: ['leads-interested'] })
    qc.invalidateQueries({ queryKey: ['leads-lost'] })
    qc.invalidateQueries({ queryKey: ['leads-working'] })
    qc.invalidateQueries({ queryKey: ['leads-closed'] })
    qc.invalidateQueries({ queryKey: ['hot-leads-dash'] })
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }, [qc])

  useEffect(() => {
    if (lead) {
      setForm({
        business_name:        lead.business_name        || '',
        owner_name:           lead.owner_name           || '',
        phone:                lead.phone                || '',
        email:                lead.email                || '',
        website:              lead.website              || '',
        industry:             lead.industry             || '',
        city:                 lead.city                 || '',
        area:                 lead.area                 || '',
        location:             lead.location             || '',
        google_rating:        lead.google_rating        ?? '',
        google_reviews_count: lead.google_reviews_count ?? '',
        gmb_status:           lead.gmb_status           || '',
        status:               lead.status               || 'cold',
        is_priority:          lead.is_priority          || false,
        notes:                lead.notes                || '',
        instagram_url:        lead.instagram_url        || '',
        facebook_url:         lead.facebook_url         || '',
        linkedin_url:         lead.linkedin_url         || '',
        youtube_url:          lead.youtube_url          || '',
        twitter_url:          lead.twitter_url          || '',
        google_maps_url:      lead.google_maps_url      || '',
        revenue_estimate:     lead.revenue_estimate     || '',
      })
      // Auto-expand sections if they have data
      setShowExtra(!!(lead.area || lead.google_rating || lead.gmb_status || lead.revenue_estimate))
      setShowSocial(!!(lead.instagram_url || lead.facebook_url || lead.linkedin_url || lead.youtube_url || lead.twitter_url || lead.google_maps_url))
    }
  }, [lead])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // ── GMB Autocomplete ─────────────────────────────────────────────────────
  const handleBusinessNameChange = (val) => {
    set('business_name', val)
    clearTimeout(gmbTimerRef.current)
    if (val.trim().length < 3) { setShowGmb(false); setGmbSuggestions([]); return }
    setGmbLoading(true)
    setShowGmb(true)
    gmbTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/gmb/autocomplete', { params: { input: val.trim() } })
        setGmbSuggestions(data.predictions || [])
      } catch {
        setGmbSuggestions([])
      } finally {
        setGmbLoading(false)
      }
    }, 400)
  }

  const handleGmbSelect = async (suggestion) => {
    setShowGmb(false)
    set('business_name', suggestion.name)
    setGmbFetching(true)
    try {
      const { data } = await api.get('/gmb/details', { params: { place_id: suggestion.place_id } })
      if (data.result) {
        const r = data.result
        setForm((f) => ({
          ...f,
          business_name:        r.business_name        || f.business_name,
          phone:                r.phone                || f.phone,
          website:              r.website              || f.website,
          google_rating:        r.google_rating        || f.google_rating,
          google_reviews_count: r.google_reviews_count || f.google_reviews_count,
          city:                 r.city                 || f.city,
          area:                 r.area                 || f.area,
          location:             r.location             || f.location,
          google_maps_url:      r.google_maps_url      || f.google_maps_url,
          gmb_status:           r.gmb_status           || f.gmb_status,
        }))
        toast.success('Business details updated from GMB!')
      }
    } catch { /* non-critical */ }
    finally { setGmbFetching(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.business_name) { toast.error('Business name is required'); return }
    setSaving(true)
    try {
      const fullPayload = {
        business_name:        form.business_name.trim(),
        owner_name:           form.owner_name   || null,
        phone:                form.phone        || null,
        email:                form.email        || null,
        website:              form.website      || null,
        industry:             form.industry     || null,
        city:                 form.city         || null,
        area:                 form.area         || null,
        location:             form.location     || null,
        google_rating:        form.google_rating !== '' ? parseFloat(form.google_rating) : null,
        google_reviews_count: form.google_reviews_count !== '' ? parseInt(form.google_reviews_count) : 0,
        gmb_status:           form.gmb_status   || null,
        status:               form.status       || 'cold',
        is_priority:          form.is_priority  || false,
        notes:                form.notes        || null,
        instagram_url:        form.instagram_url || null,
        facebook_url:         form.facebook_url  || null,
        linkedin_url:         form.linkedin_url  || null,
        youtube_url:          form.youtube_url   || null,
        twitter_url:          form.twitter_url   || null,
        google_maps_url:      form.google_maps_url || null,
        revenue_estimate:     form.revenue_estimate || null,
        updated_at:           new Date().toISOString(),
      }

      let data
      try {
        const res = await api.put(`/api/leads/${lead.id}`, fullPayload)
        data = res.data
      } catch (apiErr) {
        const msg = apiErr.response?.data?.error || apiErr.message
        console.error('[EditLead] Save failed:', msg)
        toast.error('Save failed: ' + msg)
        return
      }

      toast.success('Lead updated!')
      invalidateAll()
      onUpdated?.(data)
      onClose()
    } catch (e) {
      console.error('[EditLead] Unexpected error:', e)
      toast.error('Unexpected error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const socialLinks = [
    { key: 'instagram_url',   label: 'Instagram',   icon: Instagram, color: '#E1306C', ph: 'https://instagram.com/...' },
    { key: 'facebook_url',    label: 'Facebook',    icon: Facebook,  color: '#1877F2', ph: 'https://facebook.com/...' },
    { key: 'linkedin_url',    label: 'LinkedIn',    icon: Linkedin,  color: '#0A66C2', ph: 'https://linkedin.com/...' },
    { key: 'youtube_url',     label: 'YouTube',     icon: Youtube,   color: '#FF0000', ph: 'https://youtube.com/...' },
    { key: 'twitter_url',     label: 'Twitter/X',   icon: Twitter,   color: '#1DA1F2', ph: 'https://twitter.com/...' },
    { key: 'google_maps_url', label: 'Google Maps', icon: Globe,     color: '#EA4335', ph: 'https://maps.google.com/...' },
  ]
  const socialCount = socialLinks.filter(({ key }) => form[key]).length

  return (
    <Modal open={open} onClose={onClose} title="Edit Lead" size="xl">
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* GMB fetching indicator */}
        <AnimatePresence>
          {gmbFetching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--orange-light)' }}>
              <Loader size={12} className="animate-spin" style={{ color: 'var(--orange)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--orange)' }}>Fetching business details from Google Maps...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Business Name (prominent + GMB search) ─────────────────── */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Business Name <span style={{ color: 'var(--orange)' }}>*</span>
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={businessInputRef}
              value={form.business_name || ''}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              onFocus={() => { if (gmbSuggestions.length > 0) setShowGmb(true) }}
              required
              className="input-glass pl-9 text-base font-semibold"
              placeholder="Business name (type to search GMB)"
              autoComplete="off"
            />
            {gmbLoading && (
              <Loader size={12} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          {showGmb && (gmbLoading || gmbSuggestions.length > 0) && (
            <GmbDropdown
              inputRef={businessInputRef}
              suggestions={gmbSuggestions}
              loading={gmbLoading}
              onSelect={handleGmbSelect}
              onClose={() => setShowGmb(false)}
            />
          )}
        </div>

        {/* ── Owner + Phone ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Owner Name</label>
            <div className="relative">
              <User2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={form.owner_name || ''} onChange={(e) => set('owner_name', e.target.value)} className="input-glass pl-9" placeholder="e.g. Dr. Ravi Sharma" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} className="input-glass pl-9" type="tel" />
            </div>
          </div>
        </div>

        {/* ── Email + Website ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={form.email || ''} onChange={(e) => set('email', e.target.value)} className="input-glass pl-9" type="email" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Website</label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={form.website || ''} onChange={(e) => set('website', e.target.value)} className="input-glass pl-9" placeholder="https://" />
            </div>
          </div>
        </div>

        {/* ── Industry + City ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Industry</label>
            <CustomSelect
              value={form.industry || ''}
              onChange={(v) => set('industry', v)}
              options={['', ...GMB_INDUSTRIES].map((i) => ({ value: i, label: i || 'Select industry' }))}
              placeholder="Select industry"
              allowCustom
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>City</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={form.city || ''} onChange={(e) => set('city', e.target.value)} className="input-glass pl-9" />
            </div>
          </div>
        </div>

        {/* ── Address (full width) ───────────────────────────────────── */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Address / Location</label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input value={form.location || ''} onChange={(e) => set('location', e.target.value)} className="input-glass pl-9" placeholder="Full address" />
          </div>
        </div>

        {/* ── Stage + Priority ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Stage</label>
            <CustomSelect
              value={form.status || 'cold'}
              onChange={(v) => set('status', v)}
              options={STAGE_OPTIONS}
              placeholder="Select stage"
            />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.is_priority} onChange={(e) => set('is_priority', e.target.checked)} className="w-4 h-4 accent-orange-500 rounded" />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mark as Priority</span>
            </label>
          </div>
        </div>

        {/* ── Notes ──────────────────────────────────────────────────── */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Notes</label>
          <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} className="input-glass resize-none" rows={1} />
        </div>

        {/* ── More Details (collapsible) ─────────────────────────────── */}
        <div>
          <button type="button" onClick={() => setShowExtra((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold w-full py-1.5 border-t"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            {showExtra ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            More Details
            {(form.area || form.google_rating || form.gmb_status || form.revenue_estimate) && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>filled</span>
            )}
          </button>
          <AnimatePresence>
            {showExtra && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Area</label>
                    <input value={form.area || ''} onChange={(e) => set('area', e.target.value)} className="input-glass" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Google Rating</label>
                    <input value={form.google_rating ?? ''} onChange={(e) => set('google_rating', e.target.value)} className="input-glass" type="number" step="0.1" min="1" max="5" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Reviews Count</label>
                    <input value={form.google_reviews_count ?? ''} onChange={(e) => set('google_reviews_count', e.target.value)} className="input-glass" type="number" min="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>GMB Status</label>
                    <CustomSelect
                      value={form.gmb_status || ''}
                      onChange={(v) => set('gmb_status', v)}
                      options={GMB_STATUS_OPTIONS}
                      placeholder="Unknown"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Revenue Estimate</label>
                    <input value={form.revenue_estimate || ''} onChange={(e) => set('revenue_estimate', e.target.value)} className="input-glass" placeholder="e.g. ₹2-5L/month" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Social & Digital Links (collapsible) ───────────────────── */}
        <div>
          <button type="button" onClick={() => setShowSocial((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold w-full py-1.5 border-t"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            {showSocial ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Social &amp; Digital Links
            {socialCount > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>
                {socialCount} added
              </span>
            )}
          </button>
          <AnimatePresence>
            {showSocial && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-2 gap-3 pt-3">
                  {socialLinks.map(({ key, label, icon: Icon, color, ph }) => (
                    <div key={key}>
                      <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color }}>
                        <Icon size={11} /> {label}
                      </label>
                      <input value={form[key] || ''} onChange={(e) => set(key, e.target.value)} className="input-glass" type="url" placeholder={ph} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Submit ─────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  )
}

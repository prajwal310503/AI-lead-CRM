import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader, Plus, MapPin, Star, Globe, Building2,
  ChevronDown, Zap, Phone, AlertTriangle, X, Filter, Check,
  Copy, SkipForward, PlayCircle, StopCircle, RefreshCw, Key,
  TrendingUp, Users, Target,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '../../../components/ui/Modal'
import useLeadsStore from '../../../stores/useLeadsStore'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { GMB_CATEGORY_GROUPS } from '../../../lib/categories'
import { searchIndiaLocations } from '../../../lib/indiaLocations'

const CATEGORY_GROUPS = GMB_CATEGORY_GROUPS

const LIMIT_PRESETS = [20, 50, 100, 200]

const TARGET_FILTERS = [
  { id: 'no_website',    label: 'No Website',    icon: Globe,         check: (r) => !r.website },
  { id: 'low_rating',    label: 'Rating < 4.0',  icon: Star,          check: (r) => r.google_rating && parseFloat(r.google_rating) < 4.0 },
  { id: 'unclaimed_gmb', label: 'Unclaimed GMB', icon: AlertTriangle, check: (r) => ['unclaimed', 'missing'].includes(r.gmb_status) },
  { id: 'no_phone',      label: 'No Phone',      icon: Phone,         check: (r) => !r.phone },
  { id: 'high_priority', label: 'Score ≥ 60',    icon: Zap,           check: (r) => (r._score || 0) >= 60 },
]
const VIEW_FILTERS = [
  { id: 'all',           label: 'All',          icon: null,          check: () => true },
  { id: 'no_website',    label: 'No Website',   icon: Globe,         check: (r) => !r.website },
  { id: 'low_rating',    label: 'Rating < 4',   icon: Star,          check: (r) => r.google_rating && parseFloat(r.google_rating) < 4.0 },
  { id: 'unclaimed_gmb', label: 'Unclaimed GMB',icon: AlertTriangle, check: (r) => ['unclaimed', 'missing'].includes(r.gmb_status) },
  { id: 'hot',           label: 'HOT ≥60',      icon: Zap,           check: (r) => (r._score || 0) >= 60 },
]

function calcScore(r) {
  let s = 0
  if (!r.website)                                              s += 40
  if (r.google_rating && parseFloat(r.google_rating) < 3.5)  s += 30
  if (['unclaimed', 'missing'].includes(r.gmb_status))        s += 20
  if (!r.phone)                                               s += 10
  return s
}

// ─── Shared dropdown hook ─────────────────────────────────────────────────────
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return { open, setOpen, ref }
}

// ─── Category Dropdown ────────────────────────────────────────────────────────
function CategoryDropdown({ selectedCategories, setSelectedCategories }) {
  const { open, setOpen, ref } = useDropdown()
  const [catSearch, setCatSearch]     = useState('')
  const [manualInput, setManualInput] = useState('')

  const filteredGroups = useMemo(() => {
    if (!catSearch.trim()) return CATEGORY_GROUPS
    const q = catSearch.toLowerCase()
    return CATEGORY_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => i.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0)
  }, [catSearch])

  const addManual = () => {
    const v = manualInput.trim()
    if (v && !selectedCategories.includes(v)) {
      setSelectedCategories(prev => [...prev, v])
      setManualInput('')
    }
  }

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
        Business Category
      </label>

      {/* trigger */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ background: 'var(--bg-glass)', border: `1.5px solid ${open ? 'var(--orange)' : 'var(--border)'}` }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 size={13} style={{ color: 'var(--orange)', flexShrink: 0 }} />
            {selectedCategories.length === 0
              ? <span style={{ color: 'var(--text-muted)' }}>Select categories...</span>
              : <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {selectedCategories.length === 1
                    ? selectedCategories[0]
                    : `${selectedCategories.length} categories selected`}
                </span>
            }
          </div>
          <ChevronDown size={13} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl shadow-2xl flex flex-col"
              style={{ background: 'var(--bg-card)', border: '1.5px solid var(--orange)', maxHeight: 360 }}>

              {/* search */}
              <div className="p-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                    placeholder="Search categories..."
                    className="input-glass w-full pl-8 text-xs"
                    style={{ padding: '6px 8px 6px 28px' }}
                    autoFocus
                  />
                </div>
              </div>

              {/* list */}
              <div className="overflow-y-auto flex-1" style={{ maxHeight: 240 }}>
                {filteredGroups.map(g => (
                  <div key={g.group}>
                    <p className="px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest sticky top-0"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                      {g.group}
                    </p>
                    {g.items.map(item => {
                      const checked = selectedCategories.includes(item)
                      return (
                        <button key={item} type="button"
                          onClick={() => setSelectedCategories(prev => checked ? prev.filter(x => x !== item) : [...prev, item])}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-all hover:opacity-75"
                          style={{ color: checked ? 'var(--orange)' : 'var(--text-secondary)' }}>
                          <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: checked ? 'var(--orange)' : 'var(--bg-glass)', border: `1.5px solid ${checked ? 'var(--orange)' : 'var(--border)'}` }}>
                            {checked && <Check size={8} className="text-white" />}
                          </span>
                          {item}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* manual + footer */}
              <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex gap-1.5 mb-2">
                  <input
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addManual()}
                    placeholder="Type custom category + Enter"
                    className="input-glass flex-1 text-xs"
                    style={{ padding: '5px 8px' }} />
                  <button type="button" onClick={addManual}
                    className="px-2.5 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ background: 'var(--orange)', color: '#fff' }}>
                    Add
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{selectedCategories.length} selected</span>
                  <button type="button" onClick={() => setOpen(false)}
                    className="text-xs font-semibold px-3 py-1 rounded-lg"
                    style={{ background: 'var(--orange)', color: '#fff' }}>
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedCategories.map(cat => (
            <span key={cat}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--orange)', border: '1px solid rgba(255,107,53,0.25)' }}>
              {cat}
              <button type="button" onClick={() => setSelectedCategories(prev => prev.filter(x => x !== cat))}>
                <X size={9} />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => setSelectedCategories([])}
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Location Search — Static India DB + Nominatim fallback ───────────────────
// Primary: instant offline search from curated India locations list (700+ entries)
// Fallback: Nominatim OSM for any location not found in the static list
// This gives Google Maps-like accuracy for Indian cities, suburbs, and sectors.

function parseNominatimItem(item) {
  const addr = item.address || {}
  const primaryName = item.name || item.display_name.split(',')[0].trim()
  const displayParts = (item.display_name || '').split(',').map(p => p.trim()).filter(Boolean)
  const breadcrumb = displayParts
    .slice(1)
    .filter(p => !/^\d+$/.test(p))
    .filter(p => p.toLowerCase() !== primaryName.toLowerCase())
    .filter((p, i, a) => a.indexOf(p) === i)
    .slice(0, 3)
    .join(' · ')
  const city = addr.city || addr.town || addr.city_district || addr.county || ''
  const value = (city && city.toLowerCase() !== primaryName.toLowerCase())
    ? `${primaryName}, ${city}`
    : primaryName
  const typeMap = {
    suburb: 'Suburb', neighbourhood: 'Locality', quarter: 'Locality',
    village: 'Village', hamlet: 'Village', city: 'City', town: 'Town',
    city_district: 'District', county: 'District', state: 'State',
  }
  const placeType = typeMap[item.type] || 'Place'
  return {
    primaryName, breadcrumb, value, placeType,
    dedupeKey: `osm-${item.place_id || value}`,
    source: 'osm',
  }
}

function staticToSuggestion(loc) {
  const value = (loc.city && loc.city !== loc.name) ? `${loc.name}, ${loc.city}` : loc.name
  const breadcrumb = loc.city !== loc.name ? `${loc.city} · ${loc.state}` : loc.state
  return {
    primaryName: loc.name,
    breadcrumb,
    value,
    placeType: loc.type,
    dedupeKey: `static-${loc.name.toLowerCase()}-${loc.city.toLowerCase()}`,
    source: 'static',
  }
}

function LocationSearchInput({ selectedLocations, setSelectedLocations }) {
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [fetching,    setFetching]    = useState(false)
  const [justAdded,   setJustAdded]   = useState(null)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)
  const { open, setOpen, ref } = useDropdown()

  const searchLocations = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setSuggestions([]); setOpen(false); return }

    // ── Step 1: Instant static search (no network, always fast & accurate) ──
    const staticResults = searchIndiaLocations(q, 8).map(staticToSuggestion)
    if (staticResults.length > 0) {
      setSuggestions(staticResults)
      setOpen(true)
    }

    // ── Step 2: If static gave < 4 results, also call Nominatim as supplement ──
    if (staticResults.length < 4) {
      setFetching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', India')}&format=json&addressdetails=1&limit=8&countrycodes=in`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'StartWebOS/1.0' } }
        )
        const data = await res.json()
        const osmItems = data.map(parseNominatimItem)
        // Merge: static first (higher priority), then OSM items not already covered
        const staticKeys = new Set(staticResults.map(s => s.primaryName.toLowerCase()))
        const newOsm = osmItems.filter(o => !staticKeys.has(o.primaryName.toLowerCase()))
        const merged = [...staticResults, ...newOsm].slice(0, 10)
        setSuggestions(merged)
        setOpen(merged.length > 0)
      } catch {
        // Nominatim failed — static results are still shown
      }
      setFetching(false)
    }
  }, [setOpen])

  const handleChange = (e) => {
    setQuery(e.target.value)
    setJustAdded(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchLocations(e.target.value), 300)
  }

  const addLocation = (loc) => {
    if (!selectedLocations.includes(loc.value)) {
      setSelectedLocations(prev => [...prev, loc.value])
      setJustAdded(loc.value)
      setTimeout(() => setJustAdded(null), 1500)
    }
    // Clear input but keep dropdown open so user can search another area immediately
    setQuery('')
    setSuggestions([])
    setOpen(false)
    // Re-focus input after a tiny delay so user can type the next area right away
    setTimeout(() => inputRef.current?.focus(), 60)
  }

  const removeLocation = (loc) => setSelectedLocations(prev => prev.filter(l => l !== loc))

  // Type badge color
  const typeColor = (t) => (
    t === 'Locality' || t === 'Suburb' || t === 'Area' ? 'var(--emerald)'
    : t === 'City' || t === 'Town' ? 'var(--blue)'
    : t === 'Village' ? 'var(--amber)'
    : 'var(--text-muted)'
  )

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
          Locations
          <span className="ml-1 normal-case font-normal" style={{ color: 'var(--text-muted)' }}>— type &amp; pick multiple areas</span>
        </label>
        {selectedLocations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(14,165,233,0.12)', color: 'var(--blue)', border: '1px solid rgba(14,165,233,0.25)' }}>
              {selectedLocations.length} selected
            </span>
            <button type="button" onClick={() => setSelectedLocations([])}
              className="text-[10px] font-semibold" style={{ color: '#EF4444' }}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Selected chips row */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 p-2 rounded-xl"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
          {selectedLocations.map(loc => (
            <motion.span key={loc}
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: justAdded === loc ? 'rgba(16,185,129,0.15)' : 'rgba(14,165,233,0.1)',
                color: justAdded === loc ? 'var(--emerald)' : 'var(--blue)',
                border: `1px solid ${justAdded === loc ? 'rgba(16,185,129,0.35)' : 'rgba(14,165,233,0.3)'}`,
              }}>
              <MapPin size={9} />
              {loc}
              <button type="button" onClick={() => removeLocation(loc)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                <X size={9} />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={ref} className="relative">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--blue)' }} />
          {fetching
            ? <Loader size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--orange)' }} />
            : query.length > 0
              ? <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setOpen(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              : null
          }
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' && suggestions.length > 0) addLocation(suggestions[0]) }}
            placeholder={selectedLocations.length > 0 ? 'Search another area or city...' : 'Search: Kamothe, Bandra, Indiranagar, Koramangala...'}
            className="input-glass w-full pl-9"
          />
        </div>

        <AnimatePresence>
          {open && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl shadow-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1.5px solid var(--blue)', maxHeight: 300, overflowY: 'auto' }}>

              {/* Header hint */}
              <div className="px-3 py-1.5 flex items-center gap-1.5"
                style={{ borderBottom: '1px solid var(--border)', background: 'rgba(14,165,233,0.04)' }}>
                <MapPin size={10} style={{ color: 'var(--blue)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Instant India search · click to add multiple areas
                </span>
              </div>

              {suggestions.map((s, i) => {
                const already = selectedLocations.includes(s.value)
                return (
                  <button key={s.dedupeKey} type="button" onClick={() => addLocation(s)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
                    style={{
                      borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                      background: already ? 'rgba(14,165,233,0.07)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!already) e.currentTarget.style.background = 'var(--bg-glass)' }}
                    onMouseLeave={e => { if (!already) e.currentTarget.style.background = 'transparent' }}>
                    <MapPin size={12} style={{ color: already ? 'var(--blue)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {s.primaryName}
                        </p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: `${typeColor(s.placeType)}18`,
                            color: typeColor(s.placeType),
                            border: `1px solid ${typeColor(s.placeType)}30`,
                          }}>
                          {s.placeType}
                        </span>
                      </div>
                      {s.breadcrumb && (
                        <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {s.breadcrumb}
                        </p>
                      )}
                    </div>
                    {already
                      ? <Check size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                      : <Plus size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }} />
                    }
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}

const APP_SETTINGS_SQL = `-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Create table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  active_provider TEXT DEFAULT 'claude',
  active_model TEXT DEFAULT 'claude-sonnet-4-6',
  api_keys JSONB DEFAULT '{}',
  serpapi_key TEXT,
  apify_token TEXT,
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_token TEXT,
  whatsapp_phone_id TEXT,
  smtp_host TEXT DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_from_name TEXT DEFAULT 'StartWebOS',
  company_name TEXT DEFAULT 'StartWeb',
  company_email TEXT,
  company_phone TEXT,
  company_website TEXT,
  company_city TEXT,
  company_address TEXT,
  company_logo_url TEXT,
  gst_number TEXT,
  upi_id TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  account_name TEXT,
  invoice_prefix TEXT DEFAULT 'SW',
  invoice_counter INTEGER DEFAULT 0,
  default_tax DECIMAL DEFAULT 18.00,
  default_location TEXT DEFAULT 'Navi Mumbai, Maharashtra',
  max_leads INTEGER DEFAULT 20,
  payment_terms TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 3. Grant access (REQUIRED — fixes "permission denied" error)
GRANT ALL ON TABLE app_settings TO anon, authenticated, service_role;

-- 4. RLS policy (WITH CHECK required for INSERT/UPDATE)
DROP POLICY IF EXISTS "Users manage own settings" ON app_settings;
CREATE POLICY "Users manage own settings" ON app_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`

// ─── No API Banner with live key checker ──────────────────────────────────────
function NoApiBanner() {
  const [status,   setStatus]   = useState(null)  // null | 'checking' | {has_apify, has_serpapi, has_google, row_found}
  const [checking, setChecking] = useState(false)
  const [showSql,  setShowSql]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  const checkKeys = async () => {
    setChecking(true)
    setStatus('checking')
    try {
      const { data } = await api.get('/api/leads/check-api')
      setStatus(data)
      if (data && (!data.row_found || !data.any_key)) setShowSql(true)
    } catch {
      setStatus({ error: true })
      setShowSql(true) // show SQL when server errors too
    }
    setChecking(false)
  }

  const copySql = () => {
    navigator.clipboard.writeText(APP_SETTINGS_SQL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('SQL copied — paste in Supabase SQL Editor')
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-4 rounded-xl space-y-3"
      style={{ background: 'rgba(239,68,68,0.06)', border: '2px solid rgba(239,68,68,0.3)' }}>

      <div className="flex items-start gap-3">
        <Key size={20} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm mb-1" style={{ color: '#EF4444' }}>No Scraping API Configured</p>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            Add one of these keys in <strong>Settings → AI Models → Lead Discovery</strong>, then click Save All:
          </p>
          <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--emerald)' }} />
              <strong style={{ color: 'var(--emerald)' }}>Apify Token</strong> — apify.com → Settings → Integrations → API Tokens
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--blue)' }} />
              <strong style={{ color: 'var(--blue)' }}>SerpAPI Key</strong> — serpapi.com (100 free/month)
            </div>
          </div>
        </div>
      </div>

      {/* Live key status checker */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={checkKeys}
          disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {checking
            ? <><Loader size={11} className="animate-spin" /> Checking...</>
            : <><RefreshCw size={11} /> Verify API Keys</>
          }
        </button>
        {status && status !== 'checking' && !status.error && (
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Apify',   ok: status.has_apify   },
              { label: 'SerpAPI', ok: status.has_serpapi  },
              { label: 'Google',  ok: status.has_google   },
            ].map(k => (
              <span key={k.label}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  background: k.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                  color: k.ok ? 'var(--emerald)' : '#EF4444',
                  border: `1px solid ${k.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                {k.ok ? <Check size={9} /> : <X size={9} />} {k.label}
              </span>
            ))}
            {!status.row_found && (
              <span className="text-[10px] font-semibold" style={{ color: '#F59E0B' }}>
                ⚠ No row found — run SQL &amp; save settings
              </span>
            )}
            {status.any_key && (
              <span className="text-[10px] font-semibold" style={{ color: 'var(--emerald)' }}>
                Key found — try scraping again ↑
              </span>
            )}
          </div>
        )}
        {status?.error && (
          <span className="text-[10px]" style={{ color: '#EF4444' }}>Could not reach server</span>
        )}
      </div>

      {/* SQL snippet when table is missing */}
      {showSql && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#F59E0B' }}>
              Step 1 — Run this SQL in Supabase Dashboard → SQL Editor
            </p>
            <button
              type="button"
              onClick={copySql}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-all"
              style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.1)', color: copied ? 'var(--emerald)' : '#F59E0B', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
              {copied ? <><Check size={9} /> Copied!</> : <><Copy size={9} /> Copy SQL</>}
            </button>
          </div>
          <pre className="text-[9px] p-2 rounded-lg overflow-auto max-h-28 leading-relaxed"
            style={{ background: 'rgba(0,0,0,0.3)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
            {APP_SETTINGS_SQL}
          </pre>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Step 2 — Go to <strong>Settings → Lead Discovery</strong>, enter your API key, click <strong>Save All</strong>
          </p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, source, done }) {
  // When scraping is complete, always show 100% — fewer leads than limit just means
  // that's all that's available in this area with the selected filters
  const pct = done ? 100 : (max > 0 ? Math.min(99, Math.round((value / max) * 100)) : 0)
  const color = source === 'apify' ? 'var(--emerald)'
              : source === 'serpapi' ? 'var(--blue)'
              : source === 'google_places' ? 'var(--indigo)'
              : 'var(--amber)'
  const label = done
    ? value >= max
      ? `${value} / ${max} (100%)`
      : `${value} found — all available in this area`
    : `${value} / ${max} (${pct}%)`
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          Scraping progress
        </span>
        <span className="text-[10px] font-bold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ analytics, limit, source }) {
  const stats = [
    { label: 'New Leads',  value: analytics.total_fetched    || 0, icon: Users,      color: 'var(--orange)' },
    { label: 'In CRM',     value: analytics.duplicates_skipped || 0, icon: Copy,     color: '#EF4444' },
    { label: 'Filtered',   value: analytics.target_filtered  || 0, icon: Filter,     color: 'var(--text-muted)' },
    { label: 'Remaining',  value: analytics.remaining        || 0, icon: Target,    color: 'var(--blue)' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl p-2.5 text-center"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
          <s.icon size={13} className="mx-auto mb-1" style={{ color: s.color }} />
          <p className="text-base font-extrabold leading-none" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadScraperModal({ open, onClose, onLeadsAdded }) {
  const { upsertLead } = useLeadsStore()
  const qc            = useQueryClient()

  // Form state
  const [selectedCategories, setSelectedCategories] = useState([])
  const [customQuery,         setCustomQuery]         = useState('')
  const [selectedLocations,   setSelectedLocations]   = useState([])
  const [targetFilters,       setTargetFilters]       = useState([])
  const [scrapeLimit,         setScrapeLimit]         = useState(50)
  const [customLimit,         setCustomLimit]         = useState('')

  // Results state
  const [results,         setResults]         = useState([])
  const [selected,        setSelected]        = useState([])
  const [activeFilter,    setActiveFilter]    = useState('all')
  const [showDuplicates,  setShowDuplicates]  = useState(false)

  // Scraping state
  const [loading,       setLoading]       = useState(false)
  const [stopped,       setStopped]       = useState(false)
  const [progressLines, setProgressLines] = useState([])
  const [isDone,        setIsDone]        = useState(false)
  const [noApiKey,      setNoApiKey]      = useState(false)

  // Session + analytics
  const [sessionId,   setSessionId]   = useState(null)
  const [analytics,   setAnalytics]   = useState({ total_fetched: 0, total_inserted: 0, duplicates_skipped: 0, remaining: 0 })
  const [hasMore,     setHasMore]     = useState(false)
  const [source,      setSource]      = useState(null)

  const stoppedRef  = useRef(false)
  const prevOpenRef = useRef(false)

  const effectiveLimit = customLimit
    ? Math.max(1, Math.min(500, parseInt(customLimit) || 50))
    : scrapeLimit

  const resetAll = useCallback(() => {
    setSelectedCategories([])
    setCustomQuery('')
    setSelectedLocations([])
    setTargetFilters([])
    setScrapeLimit(50)
    setCustomLimit('')
    setResults([])
    setSelected([])
    setLoading(false)
    setStopped(false)
    setProgressLines([])
    setActiveFilter('all')
    setShowDuplicates(false)
    setIsDone(false)
    setNoApiKey(false)
    setSessionId(null)
    setAnalytics({ total_fetched: 0, total_inserted: 0, duplicates_skipped: 0, remaining: 0 })
    setHasMore(false)
    setSource(null)
    stoppedRef.current = false
  }, [])

  const handleClose = () => { resetAll(); onClose() }

  // ── Reset all state whenever the modal is freshly opened ──────────────────
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      resetAll()
    }
    prevOpenRef.current = open
  }, [open, resetAll])

  // ── Computed ──
  const newResults = useMemo(() => results, [results])

  // Checks from selected Target Pain Point filters (applied as AND conditions)
  const targetChecks = useMemo(() =>
    TARGET_FILTERS.filter(tf => targetFilters.includes(tf.id)).map(tf => tf.check)
  , [targetFilters])

  const applyTargetFilters = useCallback((list) => {
    if (!targetChecks.length) return list
    return list.filter(r => targetChecks.every(c => c(r)))
  }, [targetChecks])

  const viewFiltered = useMemo(() => {
    const f = VIEW_FILTERS.find(f => f.id === activeFilter)
    const base = f ? results.filter(f.check) : results
    return applyTargetFilters(base)
  }, [results, activeFilter, applyTargetFilters])

  const filterCounts = useMemo(() => {
    const targeted = applyTargetFilters(results)
    return Object.fromEntries(
      VIEW_FILTERS.map(f => [f.id, targeted.filter(f.check).length])
    )
  }, [results, applyTargetFilters])

  const allVisibleSelected = viewFiltered.length > 0 && viewFiltered.every(r => selected.includes(r.id))
  const toggleSelect  = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleVisible = () => {
    const ids = viewFiltered.map(r => r.id)
    if (allVisibleSelected) {
      // "Deselect All" — clears the ENTIRE selection (not just visible)
      setSelected([])
    } else {
      // "Select All" — ADD visible leads to existing selection (accumulate across filters)
      // Only visible (target-filtered) leads are added to selection.
      setSelected(s => [...new Set([...s, ...ids])])
    }
  }

  // ── Scrape ──
  const runScrape = async (continueFromSession = false) => {
    const keywords = customQuery.trim()
      ? [customQuery.trim()]
      : selectedCategories.length > 0 ? [...selectedCategories] : []

    if (!keywords.length) {
      toast.error('Select at least one category or enter a custom search query')
      return
    }
    if (!selectedLocations.length) {
      toast.error('Search and select at least one location')
      return
    }

    stoppedRef.current = false
    setStopped(false)
    setLoading(true)
    setIsDone(false)
    setNoApiKey(false)

    if (!continueFromSession) {
      setResults([])
      setSelected([])
      setProgressLines([])
      setActiveFilter('all')
      setShowDuplicates(false)
      setSessionId(null)
      setAnalytics({ total_fetched: 0, total_inserted: 0, duplicates_skipped: 0, remaining: effectiveLimit })
      setHasMore(false)
      setSource(null)
    }

    const logLine = (msg) => setProgressLines(prev => [...prev, msg])

    try {
      logLine(`Connecting to scraper... (${keywords.length} keyword${keywords.length > 1 ? 's' : ''} × ${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''})`)

      const { data } = await api.post('/api/leads/scrape', {
        keywords,
        locations: selectedLocations,
        limit: effectiveLimit,
        sessionId: continueFromSession ? sessionId : null,
      }, { timeout: 300000 }) // 5 min — server loops multiple SerpAPI calls internally

      if (stoppedRef.current) {
        logLine('⏹ Scraping stopped by user.')
        setLoading(false)
        setIsDone(true)
        return
      }

      // No API key configured
      if (data.no_api) {
        setNoApiKey(true)
        setLoading(false)
        setIsDone(true)
        return
      }

      if (data.sessionId) setSessionId(data.sessionId)
      if (data.source)    setSource(data.source)
      setHasMore(data.has_more || false)

      const batch = (data.results || []).map(r => ({
        ...r,
        id: r.id || r.place_id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        _score:       calcScore(r),
        _isDuplicate: false,
      }))

      // Map duplicate results (already exist in CRM) with _isDuplicate flag
      const dupBatch = (data.duplicates || []).map(r => ({
        ...r,
        id: r.id || r.place_id || `tmp-dup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        _score:       calcScore(r),
        _isDuplicate: true,
      }))

      // Apply active target filters to batch AT SOURCE — not just display
      // This ensures results array only contains leads matching target pain points
      const activeTargetChecks = TARGET_FILTERS
        .filter(tf => targetFilters.includes(tf.id))
        .map(tf => tf.check)
      const targetedBatch = activeTargetChecks.length > 0
        ? batch.filter(r => activeTargetChecks.every(c => c(r)))
        : batch
      const targetFiltered = batch.length - targetedBatch.length

      // Duplicates (already in CRM) are skipped entirely — user only wants new leads
      const dupCount = dupBatch.length

      // Fix analytics: server counts pre-phone-filter; use to compute phone-skipped count
      const rawDelivered = batch.length + dupCount
      const serverFetched = data.analytics?.total_fetched || rawDelivered
      const phoneFiltered = Math.max(0, serverFetched - rawDelivered)

      const sorted = targetedBatch.sort((a, b) => b._score - a._score)

      // Enforce effectiveLimit: only take as many new results as slots remain
      const prevNewCount = results.length
      const slotsLeft = Math.max(0, effectiveLimit - prevNewCount)
      const trimmedSorted = sorted.slice(0, slotsLeft)
      const hitLimit = trimmedSorted.length < sorted.length

      const src = data.source === 'apify'         ? 'Apify Google Maps'
                : data.source === 'serpapi'       ? 'SerpAPI'
                : data.source === 'google_places' ? 'Google Places'
                : 'API'

      if (trimmedSorted.length > 0) {
        // Client-side dedup: remove leads already in results by name+phone
        // Safety net for when server-side place_id tracking misses a business
        const existingKeys = new Set(results.map(r =>
          `${(r.business_name || '').toLowerCase().trim()}::${r.phone || ''}`
        ))
        const toAdd = trimmedSorted.filter(r =>
          !existingKeys.has(`${(r.business_name || '').toLowerCase().trim()}::${r.phone || ''}`)
        )
        const clientDedupCount = trimmedSorted.length - toAdd.length

        // Update analytics with actual added count (after all filtering + dedup)
        if (data.analytics) {
          setAnalytics(prev => ({
            ...data.analytics,
            total_fetched:     (continueFromSession ? prev.total_fetched     : 0) + toAdd.length,
            target_filtered:   (continueFromSession ? prev.target_filtered   : 0) + targetFiltered,
            duplicates_skipped:(continueFromSession ? prev.duplicates_skipped: 0) + dupCount,
          }))
        }

        const nextResults = [...results, ...toAdd]
        setResults(nextResults)
        // Auto-select ALL results so visible count always matches selected count
        setSelected(nextResults.map(r => r.id))
        const skipParts = []
        if (dupCount > 0) skipParts.push(`${dupCount} already in CRM`)
        if (phoneFiltered > 0) skipParts.push(`${phoneFiltered} no phone`)
        if (targetFiltered > 0) skipParts.push(`${targetFiltered} don't match filter`)
        if (clientDedupCount > 0) skipParts.push(`${clientDedupCount} already in results`)
        const skipMsg = skipParts.length > 0 ? ` — skipped: ${skipParts.join(', ')}` : ''
        logLine(`✓ ${toAdd.length} new businesses found via ${src}${skipMsg}`)
        if (hitLimit) {
          logLine(`✓ Limit of ${effectiveLimit} reached — scraping stopped`)
          setHasMore(false)
        }
      } else {
        // Still update analytics counters even when no new leads found
        if (data.analytics) {
          setAnalytics(prev => ({
            ...data.analytics,
            total_fetched:     prev.total_fetched || 0,
            target_filtered:   (continueFromSession ? prev.target_filtered   : 0) + targetFiltered,
            duplicates_skipped:(continueFromSession ? prev.duplicates_skipped: 0) + dupCount,
          }))
        }
        const skipParts = []
        if (dupCount > 0) skipParts.push(`${dupCount} already in CRM`)
        if (phoneFiltered > 0) skipParts.push(`${phoneFiltered} no phone`)
        if (targetFiltered > 0) skipParts.push(`${targetFiltered} don't match filter`)
        logLine(`ℹ No new leads found${skipParts.length > 0 ? ` (skipped: ${skipParts.join(', ')})` : ''}`)
        setHasMore(false)
      }

    } catch (e) {
      const msg = e.response?.data?.error || e.message
      logLine(`✗ Error: ${msg}`)
      toast.error('Scraping failed: ' + msg)
    }

    setLoading(false)
    setIsDone(true)
  }

  const handleStop = () => {
    stoppedRef.current = true
    setStopped(true)
  }

  // ── Save leads ──
  const handleSave = async () => {
    const candidates = results.filter(r => selected.includes(r.id))
    if (!candidates.length) { toast.error('Select at least one lead'); return }

    const savingToast = toast.loading(`Saving ${candidates.length} lead${candidates.length !== 1 ? 's' : ''}…`)

    try {
      const leadsPayload = candidates.map(r => ({
        business_name:        r.business_name,
        phone:                r.phone   || null,
        email:                r.email   || null,
        website:              r.website || null,
        industry:             r.industry || null,
        location:             r.location || null,
        city:                 r.city    || null,
        area:                 r.area    || null,
        google_rating:        r.google_rating        ? parseFloat(r.google_rating)        : null,
        google_reviews_count: r.google_reviews_count ? parseInt(r.google_reviews_count)   : 0,
        gmb_status:           r.gmb_status           || 'unknown',
        google_maps_url:      r.google_maps_url      || null,
        source:               r._source || source    || 'scraper',
        status:               'cold',
      }))

      const { data } = await api.post('/api/leads/bulk', { leads: leadsPayload })

      toast.dismiss(savingToast)

      toast.success(`${candidates.length} lead${candidates.length !== 1 ? 's' : ''} added to Client Hunter!`)

      // Update session inserted count
      if (sessionId) {
        api.patch(`/api/leads/scrape-sessions/${sessionId}/inserted`, {
          count: (analytics.total_inserted || 0) + (data?.length || candidates.length),
        }).catch(() => {})
      }

      // Update Zustand + invalidate caches for instant UI update
      if (Array.isArray(data)) data.forEach(lead => upsertLead(lead))
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['crm-leads'] })
      qc.invalidateQueries({ queryKey: ['leads-interested'] })
      qc.invalidateQueries({ queryKey: ['leads-lost'] })
      qc.invalidateQueries({ queryKey: ['hot-leads-dash'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['recent-activity'] })

      onLeadsAdded?.(data)
      resetAll()
      onClose()
    } catch (err) {
      toast.dismiss(savingToast)
      toast.error('Save failed: ' + (err?.response?.data?.error || err.message || 'Unknown error'))
    }
  }

  const dupCount   = analytics.duplicates_skipped || 0
  const canSearch  = (selectedCategories.length > 0 || customQuery.trim()) && selectedLocations.length > 0
  const sourceLabel = source === 'apify'         ? 'Apify Google Maps'
                    : source === 'serpapi'       ? 'SerpAPI'
                    : source === 'google_places' ? 'Google Places'
                    : source === 'demo'          ? 'Demo'
                    : null

  return (
    <Modal open={open} onClose={handleClose} title="Lead Discovery — Google Maps Scraper" size="xl">
      <div className="space-y-4">

        {/* ── Category ── */}
        <CategoryDropdown
          selectedCategories={selectedCategories}
          setSelectedCategories={(cats) => { setSelectedCategories(cats); if (cats.length) setCustomQuery('') }}
        />

        {/* ── Location ── */}
        <LocationSearchInput
          selectedLocations={selectedLocations}
          setSelectedLocations={setSelectedLocations}
        />

        {/* ── Limit + Custom Query row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Leads limit */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Total leads to fetch
            </label>
            <div className="grid grid-cols-4 gap-1 mb-1">
              {LIMIT_PRESETS.map(n => (
                <button key={n} type="button" onClick={() => { setScrapeLimit(n); setCustomLimit('') }}
                  className="py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: scrapeLimit === n && !customLimit ? 'var(--orange)' : 'var(--bg-glass)',
                    color:      scrapeLimit === n && !customLimit ? '#fff' : 'var(--text-muted)',
                    border:    `1.5px solid ${scrapeLimit === n && !customLimit ? 'var(--orange)' : 'var(--border)'}`,
                  }}>
                  {n}
                </button>
              ))}
            </div>
            <input
              type="number" min={1} max={500}
              value={customLimit}
              onChange={e => { setCustomLimit(e.target.value); setScrapeLimit(0) }}
              placeholder="Custom (max 500)..."
              className="input-glass text-xs w-full"
              style={{ padding: '5px 10px' }}
            />
          </div>

          {/* Custom query */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Custom Search Query
              <span className="ml-1 normal-case font-normal" style={{ color: 'var(--text-muted)' }}>(overrides categories)</span>
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={customQuery}
                onChange={e => { setCustomQuery(e.target.value); if (e.target.value) setSelectedCategories([]) }}
                onKeyDown={e => e.key === 'Enter' && canSearch && runScrape()}
                placeholder="e.g. bridal makeup artist..."
                className="input-glass w-full pl-9" />
              {customQuery && (
                <button type="button" onClick={() => setCustomQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={13} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Pain Points ── */}
        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Filter size={12} style={{ color: 'var(--orange)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Target Pain Points</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>— filter results to these issues</span>
            {targetFilters.length > 0 && (
              <button type="button" onClick={() => setTargetFilters([])} className="ml-auto text-[10px] font-semibold" style={{ color: '#EF4444' }}>Clear</button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_FILTERS.map(f => {
              const active = targetFilters.includes(f.id)
              return (
                <button key={f.id} type="button"
                  onClick={() => setTargetFilters(s => s.includes(f.id) ? s.filter(x => x !== f.id) : [...s, f.id])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'var(--orange-light)' : 'var(--bg-card)',
                    color:      active ? 'var(--orange)' : 'var(--text-muted)',
                    border:    `1.5px solid ${active ? 'var(--orange)' : 'var(--border)'}`,
                  }}>
                  <f.icon size={11} />
                  {f.label}
                  {active && <X size={9} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Summary pill ── */}
        {canSearch && !loading && !isDone && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.18)' }}>
            <Zap size={12} style={{ color: 'var(--orange)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Will search{' '}
              <strong style={{ color: 'var(--orange)' }}>
                {customQuery ? '1 custom query' : `${selectedCategories.length} categor${selectedCategories.length !== 1 ? 'ies' : 'y'}`}
              </strong>
              {' '}×{' '}
              <strong style={{ color: 'var(--blue)' }}>
                {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''}
              </strong>
              {' '}— up to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{effectiveLimit} results</strong>
            </span>
          </div>
        )}

        {/* ── No API key banner ── */}
        <AnimatePresence>
          {noApiKey && (
            <NoApiBanner />
          )}
        </AnimatePresence>

        {/* ── Progress section (while loading OR after done) ── */}
        <AnimatePresence>
          {(loading || isDone) && !noApiKey && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>

              {/* Source badge */}
              {sourceLabel && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: source === 'apify'         ? 'rgba(16,185,129,0.1)'
                               : source === 'serpapi'       ? 'rgba(14,165,233,0.1)'
                               : source === 'google_places' ? 'rgba(99,102,241,0.1)'
                               : 'rgba(245,158,11,0.1)',
                      color: source === 'apify'         ? 'var(--emerald)'
                           : source === 'serpapi'       ? 'var(--blue)'
                           : source === 'google_places' ? 'var(--indigo)'
                           : 'var(--amber)',
                      border: '1px solid currentColor',
                    }}>
                    {sourceLabel}
                  </span>
                  {loading && <Loader size={11} className="animate-spin" style={{ color: 'var(--orange)' }} />}
                  {isDone && !loading && (
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--emerald)' }}>Complete</span>
                  )}
                </div>
              )}

              {/* Progress bar */}
              <ProgressBar value={analytics.total_fetched || 0} max={effectiveLimit} source={source} done={isDone && !loading} />

              {/* Stats */}
              <StatsRow analytics={analytics} limit={effectiveLimit} source={source} />

              {/* Log */}
              {progressLines.length > 0 && (
                <div className="rounded-lg p-2 max-h-20 overflow-y-auto space-y-0.5"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {progressLines.map((line, i) => (
                    <p key={i} className="text-[10px] font-mono leading-relaxed"
                      style={{ color: line.startsWith('✓') ? 'var(--emerald)' : line.startsWith('✗') ? '#EF4444' : line.startsWith('⏹') ? 'var(--amber)' : 'var(--text-muted)' }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Continue / Stop buttons */}
              {loading && (
                <button type="button" onClick={handleStop}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1.5px solid rgba(239,68,68,0.25)' }}>
                  <StopCircle size={15} />
                  Stop Scraping
                </button>
              )}
              {isDone && !loading && hasMore && newResults.length < effectiveLimit && (
                <button type="button" onClick={() => runScrape(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--emerald)', border: '1.5px solid rgba(16,185,129,0.3)' }}>
                  <RefreshCw size={14} />
                  Continue Scraping ({analytics.remaining || 0} remaining)
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Start Search button ── */}
        {!loading && (!isDone || noApiKey) && (
          <button type="button" onClick={() => runScrape(false)}
            disabled={!canSearch}
            className="btn-primary w-full justify-center"
            style={{ opacity: canSearch ? 1 : 0.45 }}>
            <PlayCircle size={15} />
            Start Scraping
          </button>
        )}


        {/* ── Results ── */}
        {results.length > 0 && (
          <>
            <div className="h-px" style={{ background: 'var(--border)' }} />

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {VIEW_FILTERS.map(f => {
                const cnt = filterCounts[f.id]
                return (
                  <button key={f.id} type="button" onClick={() => setActiveFilter(f.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: activeFilter === f.id ? 'var(--orange)' : 'var(--bg-glass)',
                      color:      activeFilter === f.id ? 'white' : 'var(--text-muted)',
                      border:    `1px solid ${activeFilter === f.id ? 'var(--orange)' : 'var(--border)'}`,
                    }}>
                    {f.icon && <f.icon size={10} />}
                    {f.label}
                    {cnt > 0 && (
                      <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                        style={{
                          background: activeFilter === f.id ? 'rgba(255,255,255,0.25)' : 'var(--orange-light)',
                          color:      activeFilter === f.id ? 'white' : 'var(--orange)',
                        }}>
                        {cnt}
                      </span>
                    )}
                  </button>
                )
              })}
              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.length} selected</span>
                <button type="button" onClick={toggleVisible} className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>
                  {allVisibleSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {viewFiltered.map((r, idx) => {
                const isSelected = selected.includes(r.id)
                const score      = r._score || 0
                const lowRating  = r.google_rating && parseFloat(r.google_rating) < 4.0
                return (
                  <motion.button key={r.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.012, 0.3) }}
                    type="button"
                    onClick={() => toggleSelect(r.id)}
                    className="flex items-start gap-2.5 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--orange-light)' : 'var(--bg-glass)',
                      border: `1px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: isSelected ? 'var(--orange)' : 'var(--border)', borderRadius: 3 }}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {r.business_name}
                        </p>
                        {score >= 60 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold flex-shrink-0"
                            style={{ background: 'var(--crimson-light)', color: 'var(--crimson)' }}>HOT</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {r.city && (
                          <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                            <MapPin size={9} />{r.area ? `${r.area}, ${r.city}` : r.city}
                          </span>
                        )}
                        {r.google_rating && (
                          <span className="text-[10px] flex items-center gap-0.5 font-semibold"
                            style={{ color: lowRating ? 'var(--crimson)' : 'var(--amber)' }}>
                            <Star size={9} />{r.google_rating}
                            {r.google_reviews_count > 0 && (
                              <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({r.google_reviews_count})</span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {!r.website && <span className="text-[10px] font-semibold" style={{ color: 'var(--crimson)' }}>No Website</span>}
                        {r.website  && <span className="text-[10px]"              style={{ color: 'var(--emerald)' }}>Has Website</span>}
                        {r.gmb_status === 'unclaimed' && <span className="text-[10px]" style={{ color: 'var(--amber)' }}>Unclaimed GMB</span>}
                        {r.gmb_status === 'missing'   && <span className="text-[10px]" style={{ color: 'var(--crimson)' }}>No GMB</span>}
                      </div>
                    </div>

                    {score > 0 && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-extrabold leading-none"
                          style={{ color: score >= 60 ? 'var(--crimson)' : score >= 30 ? 'var(--amber)' : 'var(--text-muted)' }}>
                          {score}
                        </p>
                        <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>score</p>
                      </div>
                    )}
                  </motion.button>
                )
              })}

              {viewFiltered.length === 0 && (
                <div className="col-span-2 text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <Filter size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No leads match this filter</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={handleClose} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="button" onClick={handleSave}
                disabled={!selected.length}
                className="btn-primary flex-1 justify-center"
                style={{ opacity: selected.length ? 1 : 0.45 }}>
                <Plus size={15} />
                {`Save ${selected.length} Lead${selected.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

      </div>
    </Modal>
  )
}

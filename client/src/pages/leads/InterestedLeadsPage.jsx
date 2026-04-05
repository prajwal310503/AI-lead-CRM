import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Heart, MessageSquare, FileText, Search, Flame, Thermometer,
  LayoutGrid, Table, Filter, XCircle, ChevronDown, Check, Building2,
  MapPin, Star, AlertCircle, BarChart2,
  CheckSquare, Square, Trash2, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import api from '../../lib/api'
import { GMB_INDUSTRIES } from '../../lib/categories'
import useLeadsStore from '../../stores/useLeadsStore'
import LeadDetailPanel from './components/LeadDetailPanel'
import WhatsAppModal from './components/WhatsAppModal'
import ScoreBadge from '../../components/ui/ScoreBadge'
import { scoreColor, getCityShort, timeAgo } from '../../utils/format'
import toast from 'react-hot-toast'

const STAGE_CONFIG = {
  cold:          { label: 'New Lead',    color: '#64748B' },
  contacted:     { label: 'Contacted',   color: '#3B82F6' },
  warm:          { label: 'Interested',  color: '#F59E0B' },
  hot:           { label: 'Hot',         color: '#F97316' },
  proposal_sent: { label: 'Proposal',    color: '#8B5CF6' },
  negotiation:   { label: 'Negotiation', color: '#EAB308' },
  converted:     { label: 'Converted',   color: '#10B981' },
  closed:        { label: 'Closed',      color: '#6366F1' },
  lost:          { label: 'Lost',        color: '#EF4444' },
}
const STAGES = Object.keys(STAGE_CONFIG)

function HeatBadge({ score }) {
  if (score >= 70) return (
    <span className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full font-bold flex-shrink-0"
      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
      <Flame size={9} /> Hot
    </span>
  )
  if (score >= 40) return (
    <span className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full font-bold flex-shrink-0"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
      <Thermometer size={9} /> Warm
    </span>
  )
  return null
}

const PAGE_SIZE = 20

// ── Main Page ──────────────────────────────────────────────────────────────
export default function InterestedLeadsPage() {
  const qc = useQueryClient()
  const { openDetail, selectedLead, detailPanelOpen, closeDetail } = useLeadsStore()

  const [view,           setView]       = useState('grid')
  const [search,         setSearch]     = useState('')
  const [filterStage,    setFS]         = useState('')
  const [filterIndustry, setFI]         = useState('')
  const [filterCity,     setFC]         = useState('')
  const [sortBy,         setSortBy]     = useState('updated_at')
  const [showFilters,    setShowFilters]= useState(true)
  const [currentPage,    setCurrentPage]= useState(1)
  const [selectedIds,    setSelectedIds]= useState(new Set())
  const [waLead,         setWaLead]     = useState(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { data: allLeads = [], isLoading } = useQuery({
    queryKey: ['leads-interested'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('is_interested', true)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('interested-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        qc.invalidateQueries({ queryKey: ['leads-interested'] })
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [qc])

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteLead = async (id) => {
    const prev = qc.getQueryData(['leads-interested'])
    qc.setQueryData(['leads-interested'], (old) => (old || []).filter(l => l.id !== id))
    setSelectedIds(p => { const n = new Set(p); n.delete(id); return n })
    try {
      await api.delete(`/api/leads/${id}`)
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['crm-leads'] })
    } catch {
      qc.setQueryData(['leads-interested'], prev)
      toast.error('Delete failed')
    }
  }

  const bulkDelete = async () => {
    const ids = [...selectedIds]
    const prev = qc.getQueryData(['leads-interested'])
    qc.setQueryData(['leads-interested'], (old) => (old || []).filter(l => !ids.includes(l.id)))
    setSelectedIds(new Set())
    try {
      await Promise.all(ids.map(id => api.delete(`/api/leads/${id}`)))
      toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} deleted`)
    } catch {
      qc.setQueryData(['leads-interested'], prev)
      toast.error('Bulk delete failed')
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id, e) => {
    e?.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allLeads.filter(l => {
      const q = `${l.business_name || ''} ${l.owner_name || ''} ${l.city || ''}`.toLowerCase()
      if (search && !q.includes(search.toLowerCase())) return false
      if (filterStage && l.status !== filterStage) return false
      if (filterIndustry && l.industry !== filterIndustry) return false
      if (filterCity && !l.city?.toLowerCase().includes(filterCity.toLowerCase())) return false
      return true
    }).sort((a, b) => {
      if (sortBy === 'health_score')  return (b.health_score || 0) - (a.health_score || 0)
      if (sortBy === 'business_name') return (a.business_name || '').localeCompare(b.business_name || '')
      if (sortBy === 'deal_probability') return (b.deal_probability || 0) - (a.deal_probability || 0)
      return new Date(b.updated_at) - new Date(a.updated_at)
    })
  }, [allLeads, search, filterStage, filterIndustry, filterCity, sortBy])

  const hasFilters = !!(search || filterStage || filterIndustry || filterCity)
  const clearFilters = () => { setSearch(''); setFS(''); setFI(''); setFC('') }

  useEffect(() => { setCurrentPage(1) }, [search, filterStage, filterIndustry, filterCity, sortBy])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginatedLeads = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  )
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages])

  const isAllSelected  = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))
  const isPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id))
  const selectAll      = () => isAllSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(l => l.id)))
  const selectPageOnly = () => {
    if (isPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); paginatedLeads.forEach(l => n.delete(l.id)); return n })
    } else {
      setSelectedIds(prev => new Set([...prev, ...paginatedLeads.map(l => l.id)]))
    }
  }

  // Stats
  const hotCount  = allLeads.filter(l => (l.health_score || 0) >= 70).length
  const warmCount = allLeads.filter(l => (l.health_score || 0) >= 40 && (l.health_score || 0) < 70).length
  const coldCount = allLeads.filter(l => (l.health_score || 0) < 40).length

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: '100%' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <Heart size={18} style={{ color: '#10B981' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Interested Leads</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {allLeads.length} total ·{' '}
                <span style={{ color: '#EF4444' }}>{hotCount} hot</span> ·{' '}
                <span style={{ color: '#F59E0B' }}>{warmCount} warm</span> ·{' '}
                <span style={{ color: '#0EA5E9' }}>{coldCount} cold</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Select All */}
            <button onClick={selectAll}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all"
              style={{
                background:  isAllSelected ? 'var(--orange-light)' : 'transparent',
                color:       isAllSelected ? 'var(--orange)'       : 'var(--text-muted)',
                borderColor: isAllSelected ? 'var(--orange)'       : 'var(--border)',
              }}>
              {isAllSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              {isAllSelected ? `Deselect All (${filtered.length})` : `Select All (${filtered.length})`}
            </button>

            <div className="w-px h-6" style={{ background: 'var(--border)' }} />

            {/* Sort */}
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort:</span>
              {[['updated_at','Recent'],['health_score','Score'],['deal_probability','Deal %'],['business_name','Name']].map(([val, label]) => (
                <button key={val} onClick={() => setSortBy(val)}
                  className="text-xs px-2.5 py-1 rounded-lg border transition-all"
                  style={{
                    background:  sortBy === val ? 'var(--orange)' : 'transparent',
                    color:       sortBy === val ? '#fff'          : 'var(--text-muted)',
                    borderColor: sortBy === val ? 'var(--orange)' : 'var(--border)',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-6" style={{ background: 'var(--border)' }} />

            {/* View toggle */}
            <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {[{ id: 'grid', icon: LayoutGrid }, { id: 'table', icon: Table }].map(({ id, icon: Icon }) => (
                <button key={id} onClick={() => setView(id)} title={id}
                  className="w-8 h-8 flex items-center justify-center transition-colors"
                  style={{ background: view === id ? 'var(--orange)' : 'transparent', color: view === id ? '#fff' : 'var(--text-muted)' }}>
                  <Icon size={13} />
                </button>
              ))}
            </div>

            <button onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-1.5 btn-ghost text-sm"
              style={showFilters ? { background: 'var(--orange-light)', color: 'var(--orange)' } : {}}>
              <Filter size={13} />
              Filters
              {hasFilters && <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: 'var(--orange)' }}>!</span>}
            </button>
          </div>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div key="filters"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search business / city…"
                    className="input-glass pl-8 text-xs" style={{ width: 200 }} />
                </div>

                <FilterDropdown value={filterStage} onChange={setFS} placeholder="All Stages" width={148}
                  options={[{ value: '', label: 'All Stages' }, ...STAGES.map(s => ({ value: s, label: STAGE_CONFIG[s].label, dot: STAGE_CONFIG[s].color }))]} />

                <FilterDropdown value={filterIndustry} onChange={setFI} placeholder="All Industries" width={158}
                  options={[{ value: '', label: 'All Industries' }, ...GMB_INDUSTRIES.map(i => ({ value: i, label: i }))]} />

                <input value={filterCity} onChange={e => setFC(e.target.value)}
                  placeholder="City…" className="input-glass text-xs" style={{ width: 110 }} />

                {hasFilters && (
                  <button onClick={clearFilters} className="flex items-center gap-1 btn-ghost text-xs" style={{ color: 'var(--crimson)' }}>
                    <XCircle size={11} /> Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Pagination Bar ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={selectPageOnly}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0"
          style={{
            background:  isPageSelected ? 'var(--orange-light)' : 'transparent',
            color:       isPageSelected ? 'var(--orange)'       : 'var(--text-muted)',
            borderColor: isPageSelected ? 'var(--orange)'       : 'var(--border)',
          }}>
          {isPageSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          {isPageSelected ? 'Page Deselect' : 'Select Page'}
        </button>
        <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />
        <PaginationBar
          current={currentPage} total={totalPages} onChange={setCurrentPage}
          from={(currentPage - 1) * PAGE_SIZE + 1}
          to={Math.min(currentPage * PAGE_SIZE, filtered.length)}
          total_count={filtered.length} allCount={allLeads.length} hasFilters={hasFilters}
        />
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading interested leads…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">

          {/* ── GRID VIEW ──────────────────────────────────────────── */}
          {view === 'grid' && (
            <>
              {filtered.length === 0 ? (
                <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {paginatedLeads.map((lead, i) => (
                    <InterestedGridCard
                      key={lead.id} lead={lead} delay={i * 0.02}
                      onClick={() => openDetail(lead)}
                      onDelete={deleteLead}
                      onWA={() => setWaLead(lead)}
                      selected={selectedIds.has(lead.id)}
                      onSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── TABLE VIEW ─────────────────────────────────────────── */}
          {view === 'table' && (
            <>
              {filtered.length === 0 ? (
                <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
              ) : (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                        <th className="px-3 py-2.5 w-8">
                          <button onClick={selectAll} className="flex items-center justify-center w-full">
                            {isAllSelected
                              ? <CheckSquare size={14} style={{ color: 'var(--orange)' }} />
                              : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                          </button>
                        </th>
                        {['Business', 'Industry', 'City', 'Stage', 'Heat', 'Score', 'Deal %', 'Phone', 'Interested', 'Actions'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.68rem' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeads.map((lead, i) => (
                        <InterestedTableRow
                          key={lead.id} lead={lead} idx={i}
                          onClick={() => openDetail(lead)}
                          onDelete={deleteLead}
                          onWA={() => setWaLead(lead)}
                          selected={selectedIds.has(lead.id)}
                          onSelect={toggleSelect}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Lead Detail Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {detailPanelOpen && selectedLead && (
          <>
            <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={closeDetail} />
            <LeadDetailPanel lead={selectedLead} onClose={() => { closeDetail(); qc.invalidateQueries({ queryKey: ['leads-interested'] }) }} />
          </>
        )}
      </AnimatePresence>

      {/* ── Bulk Action Bar ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar count={selectedIds.size} onDelete={bulkDelete} onClear={() => setSelectedIds(new Set())} />
        )}
      </AnimatePresence>

      {waLead && <WhatsAppModal open={!!waLead} onClose={() => setWaLead(null)} lead={waLead} />}
    </div>
  )
}

// ── Pagination Bar ─────────────────────────────────────────────────────────
function PaginationBar({ current, total, onChange, from, to, total_count, allCount, hasFilters }) {
  const pages = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  const navBtn = (disabled, onClick, label) => (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: '1px solid var(--border)',
        background: disabled ? 'var(--bg-secondary)' : 'var(--bg-card)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = '#10B981' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--border)' }}
    >{label}</button>
  )

  const pageBtn = (p, i) => p === '...'
    ? <span key={`e${i}`} style={{ width: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', userSelect: 'none' }}>…</span>
    : (
      <button key={p} onClick={() => onChange(p)}
        style={{
          width: 30, height: 30, borderRadius: 8, fontSize: 13,
          fontWeight: p === current ? 700 : 400,
          border: `1.5px solid ${p === current ? '#10B981' : 'var(--border)'}`,
          background: p === current ? '#10B981' : 'transparent',
          color: p === current ? '#fff' : 'var(--text-muted)',
          cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => { if (p !== current) { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' } }}
        onMouseLeave={e => { if (p !== current) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' } }}
      >{p}</button>
    )

  return (
    <div className="flex items-center gap-2 w-full">
      {navBtn(current === 1, () => onChange(current - 1), '‹ Previous')}
      <div className="flex items-center gap-1">{pages.map((p, i) => pageBtn(p, i))}</div>
      {navBtn(current === total || total === 0, () => onChange(current + 1), 'Next ›')}
      <span className="ml-auto text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {total_count === 0
          ? 'No leads found'
          : `Showing ${from}–${to} of ${total_count.toLocaleString()} results${hasFilters ? ` (${allCount.toLocaleString()} total)` : ''}`}
      </span>
    </div>
  )
}

// ── Bulk Action Bar ─────────────────────────────────────────────────────────
function BulkActionBar({ count, onDelete, onClear }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
      style={{
        transform: 'translateX(-50%)',
        background: 'var(--bg-card)', border: '1.5px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)', minWidth: 280,
      }}>
      <span className="flex items-center gap-1.5 font-bold text-sm" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: '#10B981' }}>
          {count}
        </span>
        selected
      </span>
      <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--border)' }} />
      <AnimatePresence mode="wait">
        {confirmDelete ? (
          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2">
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#EF4444' }}>Delete {count} lead{count !== 1 ? 's' : ''}?</span>
            <button onClick={() => { onDelete(); setConfirmDelete(false) }}
              className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: '#EF4444', color: '#fff' }}>
              Yes, Delete
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
          </motion.div>
        ) : (
          <motion.button key="delete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Trash2 size={12} /> Delete
          </motion.button>
        )}
      </AnimatePresence>
      <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--border)' }} />
      <button onClick={onClear} title="Clear"
        className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
        <X size={14} />
      </button>
    </motion.div>
  )
}

// ── Grid Card ───────────────────────────────────────────────────────────────
function InterestedGridCard({ lead, delay, onClick, onDelete, onWA, selected, onSelect }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const stageColor = STAGE_CONFIG[lead.status]?.color || '#64748B'
  const score = lead.health_score || 0

  useEffect(() => {
    if (!confirmDel) return
    const t = setTimeout(() => setConfirmDel(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDel])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.2 }}
      className="glass rounded-xl p-4 cursor-pointer group transition-all hover:shadow-lg relative"
      style={{
        borderLeft: `3px solid ${selected ? '#10B981' : stageColor}`,
        boxShadow: selected ? '0 0 0 2px #10B981, 0 2px 12px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.15)',
        background: selected ? 'rgba(16,185,129,0.04)' : undefined,
      }}
      whileHover={{ y: -2, boxShadow: selected ? `0 0 0 2px #10B981, 0 8px 28px ${stageColor}30` : `0 8px 28px ${stageColor}30` }}
      onClick={onClick}
    >
      {/* Checkbox */}
      <button onClick={e => onSelect(lead.id, e)}
        className="absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded flex items-center justify-center transition-all"
        style={{
          opacity: selected ? 1 : 0,
          background: selected ? '#10B981' : 'var(--bg-secondary)',
          border: `1.5px solid ${selected ? '#10B981' : 'var(--border)'}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = '0' }}>
        {selected && <Check size={10} color="#fff" strokeWidth={3} />}
      </button>

      {/* Interested badge — top right area */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
          ❤ Interested
        </span>
        <ScoreBadge score={lead.health_score} size={36} />
      </div>

      {/* Stage */}
      <div className="flex items-center gap-1.5 mb-2.5 pl-6">
        <span className="w-2 h-2 rounded-full" style={{ background: stageColor }} />
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: stageColor }}>
          {STAGE_CONFIG[lead.status]?.label || lead.status}
        </span>
        <HeatBadge score={score} />
      </div>

      {/* Business name */}
      <h4 className="text-sm font-semibold mb-1 leading-tight pr-20 line-clamp-1 pl-1" style={{ color: 'var(--text-primary)' }}>
        <Building2 size={12} className="inline mr-1 opacity-50" />
        {lead.business_name}
      </h4>

      {/* Location */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <MapPin size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{getCityShort(lead)}</span>
        {lead.industry && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            {lead.industry}
          </span>
        )}
      </div>

      {/* Website + Rating */}
      <div className="flex items-center gap-2.5 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
        {!lead.website && (
          <span className="flex items-center gap-1" style={{ color: 'var(--amber)' }}>
            <AlertCircle size={11} /> No website
          </span>
        )}
        {lead.google_rating && (
          <span className="flex items-center gap-1">
            <Star size={11} style={{ color: '#F59E0B' }} /> {lead.google_rating}
          </span>
        )}
        {lead.deal_probability != null && (
          <span className="flex items-center gap-1 ml-auto font-semibold" style={{ color: scoreColor(lead.deal_probability) }}>
            {lead.deal_probability}% deal
          </span>
        )}
      </div>

      {/* Interested time */}
      <p className="text-[10px] mb-2.5 pl-1" style={{ color: 'var(--text-muted)' }}>
        Interested {timeAgo(lead.updated_at)}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        {lead.phone && (
          <button onClick={onWA}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: '#25D36618', border: '1px solid #25D36630' }} title="WhatsApp">
            <MessageSquare size={13} style={{ color: '#25D366' }} />
          </button>
        )}
        <button onClick={onClick}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'var(--blue-light)', border: '1px solid var(--blue)30' }} title="View Detail">
          <BarChart2 size={13} style={{ color: 'var(--blue)' }} />
        </button>
        <button onClick={onClick}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }} title="Proposal">
          <FileText size={13} style={{ color: '#8B5CF6' }} />
        </button>
        {confirmDel ? (
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => onDelete(lead.id)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: '#EF4444', color: '#fff' }}>
              Confirm
            </button>
            <button onClick={() => setConfirmDel(false)}
              className="px-1.5 py-1 rounded-lg text-[10px]" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              <X size={10} />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 ml-auto"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }} title="Delete">
            <Trash2 size={12} style={{ color: '#EF4444' }} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Table Row ───────────────────────────────────────────────────────────────
function InterestedTableRow({ lead, idx, onClick, onDelete, onWA, selected, onSelect }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const stageColor = STAGE_CONFIG[lead.status]?.color || '#64748B'
  const score = lead.health_score || 0

  useEffect(() => {
    if (!confirmDel) return
    const t = setTimeout(() => setConfirmDel(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDel])

  return (
    <tr className="border-t cursor-pointer transition-colors hover:bg-white/5"
      style={{
        borderColor: 'var(--border)',
        background: selected ? 'rgba(16,185,129,0.06)' : idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
        outline: selected ? '1px solid rgba(16,185,129,0.25)' : 'none',
        outlineOffset: -1,
      }}>
      {/* Checkbox */}
      <td className="px-3 py-2.5 w-8" onClick={e => onSelect(lead.id, e)}>
        <div className="flex items-center justify-center">
          {selected
            ? <CheckSquare size={14} style={{ color: '#10B981' }} />
            : <Square size={14} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
        </div>
      </td>

      {/* Business */}
      <td className="px-3 py-2.5" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{lead.business_name}</span>
        </div>
        {lead.owner_name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{lead.owner_name}</p>}
      </td>

      {/* Industry */}
      <td className="px-3 py-2.5" onClick={onClick} style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {lead.industry || '—'}
      </td>

      {/* City */}
      <td className="px-3 py-2.5" onClick={onClick} style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {getCityShort(lead)}
      </td>

      {/* Stage */}
      <td className="px-3 py-2.5" onClick={onClick}>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
          style={{ background: `${stageColor}20`, color: stageColor }}>
          {STAGE_CONFIG[lead.status]?.label || lead.status || '—'}
        </span>
      </td>

      {/* Heat */}
      <td className="px-3 py-2.5" onClick={onClick}>
        <HeatBadge score={score} />
      </td>

      {/* Score */}
      <td className="px-3 py-2.5" onClick={onClick}>
        {lead.health_score != null
          ? <span className="font-bold text-[11px]" style={{ color: scoreColor(lead.health_score) }}>{lead.health_score}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>

      {/* Deal % */}
      <td className="px-3 py-2.5" onClick={onClick}>
        {lead.deal_probability != null
          ? <span className="font-bold text-[11px]" style={{ color: scoreColor(lead.deal_probability) }}>{lead.deal_probability}%</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>

      {/* Phone */}
      <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {lead.phone || '—'}
      </td>

      {/* Interested time */}
      <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {timeAgo(lead.updated_at)}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={onClick}
            className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
            View
          </button>
          {lead.phone && (
            <button onClick={onWA}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
              style={{ background: '#25D36618', color: '#25D366' }}>
              WA
            </button>
          )}
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(lead.id)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: '#EF4444', color: '#fff' }}>
                Delete?
              </button>
              <button onClick={() => setConfirmDel(false)}
                className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <X size={9} />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Filter Dropdown ─────────────────────────────────────────────────────────
function FilterDropdown({ value, onChange, placeholder, options, width = 148 }) {
  const [open, setOpen]         = useState(false)
  const [search, setSearch]     = useState('')
  const [menuRect, setMenuRect] = useState(null)
  const triggerRef = useRef(null)
  const menuRef    = useRef(null)
  const searchRef  = useRef(null)
  const selected   = options.find(o => o.value === value)

  const toggle = () => {
    if (!open && triggerRef.current) { setMenuRect(triggerRef.current.getBoundingClientRect()); setSearch('') }
    setOpen(v => !v)
  }

  useEffect(() => { if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50) }, [open])
  useEffect(() => {
    if (!open) return
    const h = e => {
      if (menuRef.current && !menuRef.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target))
        { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const q = search.toLowerCase()
  const filtered = options.filter(o => !q || o.label.toLowerCase().includes(q))

  return (
    <>
      <div style={{ width }}>
        <button ref={triggerRef} onClick={toggle}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
          style={{
            background: open ? 'var(--bg-card)' : 'var(--bg-secondary)',
            border: `1px solid ${open ? '#10B981' : 'var(--border)'}`,
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: open ? '0 0 0 2px rgba(16,185,129,0.15)' : 'none', height: 32,
          }}>
          <span className="flex items-center gap-1.5 truncate">
            {selected?.dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selected.dot }} />}
            {selected?.label || placeholder}
          </span>
          <ChevronDown size={11} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {open && menuRect && (
            <motion.div ref={menuRef}
              initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              style={{
                position: 'fixed', top: menuRect.bottom + 6, left: menuRect.left,
                zIndex: 99999, minWidth: Math.max(width, menuRect.width, 200), width: Math.max(width, 200),
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', maxHeight: '60vh',
              }}>
              <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search..." onClick={e => e.stopPropagation()}
                    style={{ width: '100%', paddingLeft: 26, paddingRight: 8, paddingTop: 5, paddingBottom: 5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 11, outline: 'none' }} />
                </div>
              </div>
              <div style={{ overflowY: 'auto', padding: 6, flex: 1 }}>
                {filtered.length === 0
                  ? <p style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>No results</p>
                  : filtered.map(opt => {
                    const isActive = opt.value === value
                    return (
                      <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setSearch('') }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-left"
                        style={{ background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent', color: isActive ? '#10B981' : 'var(--text-primary)', transition: 'background 0.12s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                        {opt.dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.dot }} />}
                        <span className="flex-1">{opt.label}</span>
                        {isActive && <Check size={11} style={{ color: '#10B981', flexShrink: 0 }} />}
                      </button>
                    )
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(16,185,129,0.1)' }}>
        <Heart size={26} style={{ color: '#10B981', opacity: 0.6 }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {hasFilters ? 'No leads match this filter' : 'No interested leads yet'}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {hasFilters ? 'Try adjusting the filters' : 'Mark leads as interested from the CRM Pipeline to see them here'}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="mt-3 btn-ghost text-xs" style={{ color: '#10B981' }}>
          Clear filters
        </button>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  Target, Plus, Search, CheckSquare, MessageSquare, ArrowRight, X,
  TrendingUp, Flame, Brain, Star, Phone
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import useLeadsStore from '../../stores/useLeadsStore'
import KanbanColumn from './components/KanbanColumn'
import LeadCard from './components/LeadCard'
import LeadDetailPanel from './components/LeadDetailPanel'
import AddLeadModal from './components/AddLeadModal'
import LeadScraperModal from './components/LeadScraperModal'
import WhatsAppModal from './components/WhatsAppModal'
import ScoreBadge from '../../components/ui/ScoreBadge'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LeadCardSkeleton } from '../../components/ui/Skeleton'
import { scoreColor, timeAgo, getArea } from '../../utils/format'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const STAGES = ['cold','contacted','warm','hot','proposal_sent','negotiation','converted','closed','lost']
const STAGE_LABELS = {
  cold: 'Cold', contacted: 'Contacted', warm: 'Warm', hot: 'Hot',
  proposal_sent: 'Proposal Sent', negotiation: 'Negotiation', converted: 'Converted',
  closed: 'Closed', lost: 'Lost'
}
const STAGE_COLORS = {
  cold: '#64748B', contacted: '#3B82F6', warm: '#F59E0B', hot: '#F97316',
  proposal_sent: '#8B5CF6', negotiation: '#EAB308', converted: '#10B981', lost: '#EF4444'
}

export default function LeadsPage() {
  const { user } = useAuthStore()
  const { leads, setLeads, upsertLead, removeLead, moveLeadStage, selectedLead, detailPanelOpen, openDetail, closeDetail } = useLeadsStore()
  const qc = useQueryClient()

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
  const [view, setView] = useState('kanban') // kanban | grid | table
  const [addOpen, setAddOpen] = useState(false)
  const [scraperOpen, setScraperOpen] = useState(false)
  const [waLead, setWaLead] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkMoveTo, setBulkMoveTo] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [sortBy, setSortBy] = useState('created_at')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const { isLoading, data: leadsData } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/api/leads')
      return data || []
    },
    enabled: !!user,
    staleTime: 30_000,
  })

  // Sync query data → Zustand whenever it arrives/refreshes
  useEffect(() => { if (leadsData) setLeads(leadsData) }, [leadsData])

  // Always display from Zustand — mutations update it immediately (optimistic), query syncs in background
  const displayLeads = leads

  // Real-time subscription — updates Zustand + invalidates all lead query keys
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('leads-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') upsertLead(payload.new)
        if (payload.eventType === 'DELETE') removeLead(payload.old?.id)
        invalidateAll()
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, invalidateAll, removeLead])

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const newStage = STAGES.includes(over.id) ? over.id : null
    if (!newStage) return
    const lead = leads.find((l) => l.id === active.id)
    if (!lead || lead.status === newStage) return
    const prevStage = lead.status

    moveLeadStage(active.id, newStage)

    try {
      await api.put(`/api/leads/${active.id}/stage`, { stage: newStage, prev_stage: prevStage })
      invalidateAll()
      // In-app notification for admin
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'stage_changed',
        title: `Lead moved to ${STAGE_LABELS[newStage]}`,
        message: `${lead.business_name} → ${STAGE_LABELS[newStage]}`,
        read: false,
      }).catch(() => {})
    } catch {
      toast.error('Failed to move lead')
      moveLeadStage(active.id, prevStage)
    }
    setActiveId(null)
  }

  const filteredLeads = displayLeads.filter((l) => {
    const matchSearch = !search || l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.city?.toLowerCase().includes(search.toLowerCase()) || l.industry?.toLowerCase().includes(search.toLowerCase())
    const matchStage = !filterStage || l.status === filterStage
    return matchSearch && matchStage
  }).sort((a, b) => {
    if (sortBy === 'health_score') return (b.health_score || 0) - (a.health_score || 0)
    if (sortBy === 'deal_probability') return (b.deal_probability || 0) - (a.deal_probability || 0)
    if (sortBy === 'business_name') return (a.business_name || '').localeCompare(b.business_name || '')
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const getColumnLeads = (stage) => filteredLeads.filter((l) => l.status === stage)
  const activeLead = activeId ? displayLeads.find((l) => l.id === activeId) : null

  const toggleSelect = (id) => setSelectedIds((p) => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const clearSelection = () => setSelectedIds([])

  // ── 3-dot card actions ────────────────────────────────────────────────────
  const handleCardMove = async (leadId, newStage) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStage) return
    moveLeadStage(leadId, newStage)
    try {
      await api.put(`/api/leads/${leadId}/stage`, { stage: newStage, prev_stage: lead.status })
      invalidateAll()
      toast.success(`Moved to ${STAGE_LABELS[newStage] || newStage}`)
    } catch {
      toast.error('Failed to move lead')
      moveLeadStage(leadId, lead.status)
    }
  }

  const handleCardDelete = async (leadId) => {
    const lead = leads.find(l => l.id === leadId)
    removeLead(leadId) // instant UI removal
    try {
      await api.delete(`/api/leads/${leadId}`)
      invalidateAll()
      toast.success('Lead deleted')
    } catch {
      if (lead) upsertLead(lead) // rollback
      toast.error('Delete failed')
    }
  }

  const bulkMoveStage = async () => {
    if (!bulkMoveTo || !selectedIds.length) return
    setBulkLoading(true)
    try {
      await Promise.all(selectedIds.map(id => api.put(`/api/leads/${id}/stage`, { stage: bulkMoveTo })))
      selectedIds.forEach(id => moveLeadStage(id, bulkMoveTo))
      invalidateAll()
      toast.success(`${selectedIds.length} leads moved to ${STAGE_LABELS[bulkMoveTo]}`)
      clearSelection(); setBulkMoveTo('')
    } catch {
      toast.error('Failed to move some leads')
    }
    setBulkLoading(false)
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--orange-light)' }}>
            <Target size={18} style={{ color: 'var(--orange)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Client Hunter</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {displayLeads.length} total · {displayLeads.filter(l => l.status === 'hot').length} hot · {displayLeads.filter(l => l.deal_probability >= 70).length} high probability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="input-glass pl-9 text-sm" style={{ width: 180 }} />
          </div>

          {/* Stage filter (grid/table only) */}
          {view !== 'kanban' && (
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="input-glass text-xs" style={{ width: 130 }}>
              <option value="">All stages</option>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          )}


          <button onClick={() => setScraperOpen(true)} className="btn-ghost text-sm">
            <Search size={14} /> Discover
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* ── Bulk Action Bar ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-5 py-2 flex-shrink-0 border-b overflow-hidden"
            style={{ background: 'var(--orange-light)', borderColor: 'var(--orange)' }}
          >
            <CheckSquare size={15} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--orange)' }}>{selectedIds.length} selected</span>
            <select value={bulkMoveTo} onChange={(e) => setBulkMoveTo(e.target.value)} className="text-xs px-2 py-1 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value="">Move to stage...</option>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <button onClick={bulkMoveStage} disabled={!bulkMoveTo || bulkLoading} className="btn-primary text-xs py-1 px-2.5">
              <ArrowRight size={13} /> {bulkLoading ? 'Moving...' : 'Move'}
            </button>
            <button onClick={() => { const lead = leads.find(l => l.id === selectedIds[0]); if (lead) setWaLead(lead) }} className="btn-ghost text-xs py-1 px-2.5">
              <MessageSquare size={13} /> WhatsApp
            </button>
            <button onClick={clearSelection} className="ml-auto" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KANBAN VIEW ───────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div className="flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div className="kanban-scroll h-full px-4 py-4">
              <div className="flex gap-3 h-full" style={{ width: 'max-content' }}>
                {STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage} stage={stage} leads={getColumnLeads(stage)}
                    onLeadClick={openDetail} onAddLead={() => setAddOpen(true)}
                    onAnalyze={openDetail} onWhatsApp={(l) => setWaLead(l)} onReport={openDetail}
                    selectedIds={selectedIds} onToggleSelect={toggleSelect}
                    onMove={handleCardMove} onDelete={handleCardDelete}
                  />
                ))}
              </div>
            </div>
            <DragOverlay>{activeLead && <LeadCard lead={activeLead} />}</DragOverlay>
          </DndContext>
        </div>
      )}

      {/* ── GRID VIEW ─────────────────────────────────────────────── */}
      {view === 'grid' && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Sort bar */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort by:</span>
            {[['created_at','Newest'],['health_score','Score'],['deal_probability','Deal %'],['business_name','Name']].map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)} className="text-xs px-2.5 py-1 rounded-lg border transition-all"
                style={{ background: sortBy === val ? 'var(--orange)' : 'transparent', color: sortBy === val ? '#fff' : 'var(--text-muted)', borderColor: sortBy === val ? 'var(--orange)' : 'var(--border)' }}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{filteredLeads.length} leads</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array(8).fill(0).map((_, i) => <LeadCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredLeads.map((lead) => (
                <GridLeadCard
                  key={lead.id} lead={lead}
                  selected={selectedIds.includes(lead.id)}
                  onSelect={() => toggleSelect(lead.id)}
                  onClick={() => openDetail(lead)}
                  onWhatsApp={() => setWaLead(lead)}
                  onAnalyze={() => openDetail(lead)}
                />
              ))}
              {filteredLeads.length === 0 && (
                <div className="col-span-full text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  No leads found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ────────────────────────────────────────────── */}
      {view === 'table' && (
        <div className="flex-1 overflow-auto p-4">
          {/* Sort bar */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort by:</span>
            {[['created_at','Newest'],['health_score','Score'],['deal_probability','Deal %'],['business_name','Name']].map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)} className="text-xs px-2.5 py-1 rounded-lg border transition-all"
                style={{ background: sortBy === val ? 'var(--orange)' : 'transparent', color: sortBy === val ? '#fff' : 'var(--text-muted)', borderColor: sortBy === val ? 'var(--orange)' : 'var(--border)' }}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{filteredLeads.length} leads</span>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th className="text-left px-3 py-2.5 font-semibold w-6">
                    <input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedIds(filteredLeads.map(l => l.id)); else clearSelection() }} className="w-3.5 h-3.5" />
                  </th>
                  {['Business', 'Industry', 'City', 'Stage', 'Score', 'Deal %', 'Phone', 'GMB', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, i) => (
                  <TableLeadRow
                    key={lead.id} lead={lead} idx={i}
                    selected={selectedIds.includes(lead.id)}
                    onSelect={() => toggleSelect(lead.id)}
                    onClick={() => openDetail(lead)}
                    onWhatsApp={() => setWaLead(lead)}
                  />
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No leads found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {detailPanelOpen && selectedLead && (
          <>
            <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={closeDetail} />
            <LeadDetailPanel lead={selectedLead} onClose={closeDetail} />
          </>
        )}
      </AnimatePresence>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={(l) => upsertLead(l)} />
      <LeadScraperModal open={scraperOpen} onClose={() => setScraperOpen(false)} onLeadsAdded={(ls) => ls.forEach(upsertLead)} />
      {waLead && <WhatsAppModal open={!!waLead} onClose={() => setWaLead(null)} lead={waLead} />}
    </div>
  )
}

// ── Grid Card Component ────────────────────────────────────────────────────
function GridLeadCard({ lead, selected, onSelect, onClick, onWhatsApp, onAnalyze }) {
  const sc = scoreColor(lead.health_score)
  const stageColor = STAGE_COLORS[lead.status] || '#64748B'
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
      className="glass-card rounded-2xl p-4 cursor-pointer relative"
      onClick={onClick}
    >
      {/* Select checkbox */}
      <div className="absolute top-3 left-3" onClick={(e) => { e.stopPropagation(); onSelect() }}>
        <input type="checkbox" checked={selected} onChange={() => {}} className="w-3.5 h-3.5" />
      </div>

      {/* Stage dot */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: stageColor }} />
        <span className="text-[9px] font-bold uppercase" style={{ color: stageColor }}>{STAGE_LABELS[lead.status]}</span>
      </div>

      <div className="flex items-start gap-3 mt-3">
        <ScoreBadge score={lead.health_score} size={44} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{lead.business_name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{lead.industry} · {getArea(lead)}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5 mt-3">
        {lead.google_rating && (
          <div className="text-center p-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Rating</p>
            <p className="text-xs font-bold" style={{ color: 'var(--amber)' }}>{lead.google_rating}★</p>
          </div>
        )}
        {lead.deal_probability != null && (
          <div className="text-center p-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Deal %</p>
            <p className="text-xs font-bold" style={{ color: scoreColor(lead.deal_probability) }}>{lead.deal_probability}%</p>
          </div>
        )}
        {lead.urgency_level && (
          <div className="text-center p-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Urgency</p>
            <p className="text-[10px] font-bold capitalize" style={{ color: lead.urgency_level === 'critical' ? 'var(--crimson)' : lead.urgency_level === 'high' ? 'var(--amber)' : 'var(--blue)' }}>{lead.urgency_level}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
        {lead.phone && (
          <button onClick={onWhatsApp} title="WhatsApp" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80" style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36640' }}>
            <MessageSquare size={11} /> WA
          </button>
        )}
        <button onClick={onAnalyze} title="AI Analyze" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80" style={{ background: 'var(--orange-light)', color: 'var(--orange)', border: '1px solid var(--orange)40' }}>
          <Brain size={11} /> {lead.is_analysed ? 'View' : 'Analyze'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Table Row Component ────────────────────────────────────────────────────
function TableLeadRow({ lead, idx, selected, onSelect, onClick, onWhatsApp }) {
  const stageColor = STAGE_COLORS[lead.status] || '#64748B'
  return (
    <tr
      className="border-t cursor-pointer transition-colors hover:bg-white/5"
      style={{ borderColor: 'var(--border)', background: selected ? 'var(--orange-light)' : idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}
    >
      <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); onSelect() }}>
        <input type="checkbox" checked={selected} onChange={() => {}} className="w-3.5 h-3.5" />
      </td>
      <td className="px-3 py-2.5" onClick={onClick}>
        <div className="flex items-center gap-2">
          {lead.is_priority && <Flame size={11} style={{ color: 'var(--crimson)', flexShrink: 0 }} />}
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{lead.business_name}</span>
          {lead.is_analysed && <Brain size={10} style={{ color: 'var(--purple)' }} />}
        </div>
      </td>
      <td className="px-3 py-2.5" onClick={onClick} style={{ color: 'var(--text-muted)' }}>{lead.industry || '—'}</td>
      <td className="px-3 py-2.5" onClick={onClick} style={{ color: 'var(--text-muted)' }}>{getArea(lead)}</td>
      <td className="px-3 py-2.5" onClick={onClick}>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${stageColor}20`, color: stageColor }}>{STAGE_LABELS[lead.status]}</span>
      </td>
      <td className="px-3 py-2.5" onClick={onClick}>
        {lead.health_score != null
          ? <span className="font-bold text-[11px]" style={{ color: scoreColor(lead.health_score) }}>{lead.health_score}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td className="px-3 py-2.5" onClick={onClick}>
        {lead.deal_probability != null
          ? <span className="font-bold text-[11px]" style={{ color: scoreColor(lead.deal_probability) }}>{lead.deal_probability}%</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{lead.phone || '—'}</td>
      <td className="px-3 py-2.5">
        {lead.gmb_status && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{
            background: lead.gmb_status === 'claimed' ? 'var(--emerald-light, #d1fae5)' : 'var(--crimson-light)',
            color: lead.gmb_status === 'claimed' ? 'var(--emerald)' : 'var(--crimson)',
          }}>{lead.gmb_status}</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClick} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>View</button>
          {lead.phone && (
            <button onClick={onWhatsApp} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: '#25D36615', color: '#25D366' }}>WA</button>
          )}
        </div>
      </td>
    </tr>
  )
}

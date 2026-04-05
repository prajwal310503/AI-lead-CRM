import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, MapPin, Calendar, MessageSquare, BarChart2, FileText, Check, Star, AlertCircle, MoreVertical, ArrowRight, Trash2, X } from 'lucide-react'
import ScoreBadge from '../../../components/ui/ScoreBadge'
import { scoreColor, formatDate } from '../../../utils/format'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const CARD_STAGES = {
  cold:          { label: 'Cold',          color: '#64748B' },
  contacted:     { label: 'Contacted',     color: '#3B82F6' },
  warm:          { label: 'Warm',          color: '#F59E0B' },
  hot:           { label: 'Hot',           color: '#F97316' },
  proposal_sent: { label: 'Proposal Sent', color: '#8B5CF6' },
  negotiation:   { label: 'Negotiation',   color: '#EAB308' },
  converted:     { label: 'Converted',     color: '#10B981' },
  closed:        { label: 'Closed',        color: '#6366F1' },
  lost:          { label: 'Lost',          color: '#EF4444' },
}

// ── Portaled 3-dot dropdown ────────────────────────────────────────────────
function CardDropdown({ triggerRef, open, onClose, currentStage, onMove, onDelete }) {
  const menuRef = useRef(null)
  const [rect, setRect] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
  }, [open, triggerRef])

  useEffect(() => {
    if (!open) { setConfirmDel(false); return }
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose, triggerRef])

  if (!open || !rect) return null

  const PADDING = 8
  const menuH = 260  // fixed short height — always scrollable

  const spaceBelow = window.innerHeight - rect.bottom - PADDING
  const top = spaceBelow >= menuH
    ? rect.bottom + 4
    : Math.max(PADDING, rect.top - menuH - 4)

  const left = Math.max(PADDING, Math.min(rect.right - 170, window.innerWidth - 178))

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.94, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'fixed', top, left, zIndex: 99999, width: 180,
            maxHeight: menuH, overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 14, padding: 6,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* Stage section */}
          <p className="text-[9px] font-bold px-2.5 py-1.5 uppercase tracking-wider"
            style={{ color: '#9ca3af', borderBottom: '1px solid #f3f4f6', marginBottom: 3 }}>
            Move to Stage
          </p>
          {Object.entries(CARD_STAGES).map(([key, cfg]) => {
            const isCurrent = key === currentStage
            return (
              <button key={key}
                onClick={() => { if (!isCurrent) { onMove(key); onClose() } }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-left transition-all"
                style={{
                  color: isCurrent ? '#9ca3af' : cfg.color,
                  background: isCurrent ? '#f9fafb' : 'transparent',
                  cursor: isCurrent ? 'default' : 'pointer',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${cfg.color}15` }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isCurrent ? '#9ca3af' : cfg.color }} />
                {cfg.label}
                {isCurrent && <span className="ml-auto text-[9px]" style={{ color: '#9ca3af' }}>current</span>}
              </button>
            )
          })}

          {/* Delete section */}
          <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 4, paddingTop: 4 }}>
            {confirmDel ? (
              <div className="flex items-center gap-1.5 px-1.5 py-1">
                <span className="text-[10px] flex-1" style={{ color: '#6b7280' }}>Sure?</span>
                <button
                  onClick={() => { onDelete(); onClose() }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: '#EF4444', color: '#fff' }}>
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: '#f3f4f6', color: '#6b7280' }}>
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all"
                style={{ color: '#EF4444' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={12} /> Delete Lead
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Main Card ──────────────────────────────────────────────────────────────
export default function LeadCard({ lead, onClick, onAnalyze, onWhatsApp, onReport, isSelected, onToggleSelect, onMove, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtnRef = useRef(null)
  const wasDragging = useRef(false)
  const suppressNextClick = useRef(false)

  // Track drag so we can ignore the synthetic click that fires after drag-end
  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

  const handleClick = useCallback(() => {
    if (wasDragging.current) { wasDragging.current = false; return }
    if (suppressNextClick.current) { suppressNextClick.current = false; return }
    onClick?.(lead)
  }, [onClick, lead])

  const handleMenuClose = useCallback(() => {
    setMenuOpen(false)
    // Suppress the card click that fires when the portal disappears under the cursor
    suppressNextClick.current = true
    setTimeout(() => { suppressNextClick.current = false }, 300)
  }, [])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  }

  const scoreCol = scoreColor(lead.health_score)
  const isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date()

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: `3px solid ${isSelected ? 'var(--orange)' : scoreCol}`,
        boxShadow: isSelected ? '0 0 0 2px var(--orange)' : undefined,
      }}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 cursor-grab active:cursor-grabbing group transition-all hover:shadow-lg relative"
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(lead.id) }}
          className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center transition-all z-10"
          style={{
            background: isSelected ? 'var(--orange)' : 'var(--bg-secondary)',
            border: `1.5px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
            opacity: isSelected ? 1 : 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.opacity = '0' }}
        >
          {isSelected && <Check size={10} color="white" />}
        </button>
      )}

      {/* Row 1: Score */}
      <div className="flex items-start justify-between mb-2.5">
        <div />
        <ScoreBadge score={lead.health_score} size={40} />
      </div>

      {/* Business name */}
      <h4 className="text-sm font-semibold mb-1 leading-tight line-clamp-1" style={{ color: 'var(--text-primary)' }}>
        <Building2 size={12} className="inline mr-1 opacity-50" />
        {lead.business_name}
      </h4>

      {/* Location + Industry */}
      <div className="flex items-center gap-1.5 mb-1">
        <MapPin size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{lead.city || lead.location}</span>
        {lead.industry && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            {lead.industry}
          </span>
        )}
      </div>

      {/* Website + Rating */}
      <div className="flex items-center gap-3 text-xs mb-2.5" style={{ color: 'var(--text-muted)' }}>
        {!lead.website && (
          <span className="flex items-center gap-1" style={{ color: 'var(--amber)' }}>
            <AlertCircle size={11} /> No website
          </span>
        )}
        {lead.google_rating && (
          <span className="flex items-center gap-1">
            <Star size={11} style={{ color: '#F59E0B' }} />
            {lead.google_rating}
          </span>
        )}
      </div>

      {/* Follow-up */}
      {lead.next_followup_date && (
        <div className="flex items-center gap-1 text-xs mb-2" style={{ color: isOverdue ? 'var(--crimson)' : 'var(--text-muted)' }}>
          <Calendar size={11} />
          <span>Follow-up: {formatDate(lead.next_followup_date)}</span>
        </div>
      )}

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {[
          { icon: MessageSquare, label: 'WhatsApp', fn: onWhatsApp, color: '#25D366' },
          { icon: BarChart2,     label: 'Analyze',  fn: onAnalyze,  color: 'var(--blue)' },
          { icon: FileText,      label: 'Report',   fn: onReport,   color: 'var(--purple)' },
        ].map(({ icon: Icon, label, fn, color }) => (
          <button
            key={label}
            onClick={(e) => { e.stopPropagation(); fn?.(lead) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            title={label}
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon size={13} style={{ color }} />
          </button>
        ))}

        {/* 3-dot menu */}
        <button
          ref={menuBtnRef}
          onClick={(e) => { e.stopPropagation(); menuOpen ? handleMenuClose() : setMenuOpen(true) }}
          className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto transition-all hover:scale-110"
          style={{ background: 'var(--bg-secondary)' }}
          title="More options"
        >
          <MoreVertical size={13} style={{ color: 'var(--text-muted)' }} />
        </button>

        <CardDropdown
          triggerRef={menuBtnRef}
          open={menuOpen}
          onClose={handleMenuClose}
          currentStage={lead.status}
          onMove={(stage) => onMove?.(lead.id, stage)}
          onDelete={() => onDelete?.(lead.id)}
        />
      </div>
    </motion.div>
  )
}

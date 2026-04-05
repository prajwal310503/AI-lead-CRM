import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import LeadCard from './LeadCard'

const STAGE_CONFIG = {
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

export default function KanbanColumn({ stage, leads, onLeadClick, onAddLead, onAnalyze, onWhatsApp, onReport, selectedIds = [], onToggleSelect, onMove, onDelete }) {
  const config = STAGE_CONFIG[stage] || { label: stage, color: '#64748B' }
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col flex-shrink-0 rounded-2xl transition-all"
      style={{
        width: 280,
        background: isOver ? `${config.color}12` : 'var(--bg-glass)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${isOver ? config.color + '40' : 'var(--border-white)'}`,
        boxShadow: isOver ? `0 0 0 2px ${config.color}30` : 'var(--shadow-glass)',
        transform: isOver ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.2s ease',
        maxHeight: 'calc(100vh - 160px)',
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-2xl flex-shrink-0"
        style={{ background: `${config.color}15`, borderBottom: `1px solid ${config.color}20` }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: config.color }} />
          <h3 className="text-sm font-bold" style={{ color: config.color }}>{config.label}</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: `${config.color}20`, color: config.color }}
          >
            {leads.length}
          </span>
        </div>
        <button
          onClick={() => onAddLead?.(stage)}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: `${config.color}20`, color: config.color }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={onLeadClick}
              onAnalyze={onAnalyze}
              onWhatsApp={onWhatsApp}
              onReport={onReport}
              isSelected={selectedIds.includes(lead.id)}
              onToggleSelect={onToggleSelect}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed" style={{ borderColor: `${config.color}30` }}>
            <p className="text-xs" style={{ color: `${config.color}60` }}>Drop leads here</p>
          </div>
        )}
      </div>
    </div>
  )
}

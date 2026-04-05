import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, MessageSquare, CheckCircle2, Search, Calendar, AlertCircle, ArrowRight, Edit2, Check, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import useLeadsStore from '../../stores/useLeadsStore'
import ScoreBadge from '../../components/ui/ScoreBadge'
import LeadDetailPanel from '../leads/components/LeadDetailPanel'
import WhatsAppModal from '../leads/components/WhatsAppModal'
import { timeAgo, formatDate } from '../../utils/format'
import toast from 'react-hot-toast'

// Inline deadline editor
function DeadlineEditor({ lead, onSave }) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(lead.next_followup_date?.slice(0, 10) || '')

  const isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date()
  const isDueSoon = !isOverdue && lead.next_followup_date &&
    (new Date(lead.next_followup_date) - new Date()) < 3 * 24 * 60 * 60 * 1000

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-glass text-xs px-2 py-1 rounded-lg"
          style={{ width: 130 }}
          autoFocus
        />
        <button
          onClick={() => { onSave(date); setEditing(false) }}
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}
        >
          <Check size={11} />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
        >
          <X size={11} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:bg-white/10 group"
      title="Set project deadline"
    >
      <Calendar size={12} style={{ color: isOverdue ? '#EF4444' : isDueSoon ? '#F59E0B' : 'var(--text-muted)' }} />
      <span
        className="text-xs"
        style={{ color: isOverdue ? '#EF4444' : isDueSoon ? '#F59E0B' : 'var(--text-muted)' }}
      >
        {lead.next_followup_date
          ? formatDate(lead.next_followup_date)
          : <span className="opacity-50 group-hover:opacity-100">Set deadline</span>
        }
      </span>
      {isOverdue && <AlertCircle size={10} style={{ color: '#EF4444' }} />}
      <Edit2 size={10} className="opacity-0 group-hover:opacity-50" style={{ color: 'var(--text-muted)' }} />
    </button>
  )
}

export default function WorkingClientsPage() {
  const { user } = useAuthStore()
  const { upsertLead, selectedLead, detailPanelOpen, openDetail, closeDetail } = useLeadsStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [waLead, setWaLead] = useState(null)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-working'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'converted')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  // Realtime
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('leads-working-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads-working'] })
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, queryClient])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['leads-working'] })
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] })
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    queryClient.invalidateQueries({ queryKey: ['leads-closed'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  // Mark as closed
  const closeMutation = useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      upsertLead(data)
      invalidateAll()
      toast.success('Moved to Closed Clients')
    },
    onError: (e) => toast.error(e.message),
  })

  // Save deadline
  const deadlineMutation = useMutation({
    mutationFn: async ({ id, date }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ next_followup_date: date || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      upsertLead(data)
      queryClient.invalidateQueries({ queryKey: ['leads-working'] })
      toast.success('Deadline saved')
    },
    onError: (e) => toast.error(e.message),
  })

  const filtered = leads.filter((l) =>
    !search || l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.city?.toLowerCase().includes(search.toLowerCase())
  )

  const overdue = leads.filter((l) => l.next_followup_date && new Date(l.next_followup_date) < new Date()).length
  const noDeadline = leads.filter((l) => !l.next_followup_date).length

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Briefcase size={18} style={{ color: '#10B981' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Converted Clients</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} active · {overdue > 0 ? `${overdue} overdue · ` : ''}{noDeadline} no deadline</p>
          </div>
        </div>
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="input-glass pl-9 text-sm"
            style={{ width: 200 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No converted clients</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Move a lead to "Converted" in the CRM to track it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-2xl cursor-pointer group"
                onClick={() => openDetail(lead)}
              >
                <div className="flex items-start gap-4">
                  <ScoreBadge score={lead.health_score} size={44} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{lead.business_name}</p>
                      {lead.priority && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase"
                          style={{
                            background: lead.priority === 'urgent' ? 'rgba(239,68,68,0.15)' :
                                        lead.priority === 'high'   ? 'rgba(249,115,22,0.15)' :
                                        'rgba(100,116,139,0.15)',
                            color: lead.priority === 'urgent' ? '#EF4444' :
                                   lead.priority === 'high'   ? '#F97316' :
                                   'var(--text-muted)',
                          }}
                        >
                          {lead.priority}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.city || lead.location}</p>
                      {lead.industry && <>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.industry}</p>
                      </>}
                    </div>

                    {/* Deadline row */}
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <DeadlineEditor
                        lead={lead}
                        onSave={(date) => deadlineMutation.mutate({ id: lead.id, date })}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setWaLead(lead) }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                      title="WhatsApp"
                    >
                      <MessageSquare size={14} style={{ color: '#25D366' }} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); closeMutation.mutate(lead.id) }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                      title="Mark as Closed"
                    >
                      <CheckCircle2 size={14} style={{ color: '#6366F1' }} />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] mt-2 pl-14" style={{ color: 'var(--text-muted)' }}>
                  Converted {timeAgo(lead.updated_at)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {detailPanelOpen && selectedLead && (
          <>
            <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={closeDetail} />
            <LeadDetailPanel lead={selectedLead} onClose={closeDetail} />
          </>
        )}
      </AnimatePresence>
      {waLead && <WhatsAppModal open={!!waLead} onClose={() => setWaLead(null)} lead={waLead} />}
    </div>
  )
}

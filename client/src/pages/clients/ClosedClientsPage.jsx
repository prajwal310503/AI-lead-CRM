import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, MessageSquare, RotateCcw, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import useLeadsStore from '../../stores/useLeadsStore'
import ScoreBadge from '../../components/ui/ScoreBadge'
import LeadDetailPanel from '../leads/components/LeadDetailPanel'
import WhatsAppModal from '../leads/components/WhatsAppModal'
import { timeAgo } from '../../utils/format'
import toast from 'react-hot-toast'

export default function ClosedClientsPage() {
  const { user } = useAuthStore()
  const { upsertLead, selectedLead, detailPanelOpen, openDetail, closeDetail } = useLeadsStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [waLead, setWaLead] = useState(null)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-closed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'closed')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  // Realtime
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('leads-closed-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads-closed'] })
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, queryClient])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['leads-closed'] })
    queryClient.invalidateQueries({ queryKey: ['leads-working'] })
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] })
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  // Reactivate — move back to working
  const reactivateMutation = useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status: 'converted', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      upsertLead(data)
      invalidateAll()
      toast.success('Moved back to Converted Clients')
    },
    onError: (e) => toast.error(e.message),
  })

  const filtered = leads.filter((l) =>
    !search || l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <CheckCircle2 size={18} style={{ color: '#6366F1' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Closed Clients</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} clients closed</p>
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
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No closed clients</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Mark a Working Client as Closed to archive it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-2xl flex items-center gap-4 group cursor-pointer"
                onClick={() => openDetail(lead)}
              >
                <ScoreBadge score={lead.health_score} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{lead.business_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.city || lead.location}</p>
                    {lead.industry && <>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.industry}</p>
                    </>}
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Closed {timeAgo(lead.updated_at)}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setWaLead(lead) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                    title="WhatsApp"
                  >
                    <MessageSquare size={14} style={{ color: '#25D366' }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); reactivateMutation.mutate(lead.id) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                    title="Reactivate to Working"
                  >
                    <RotateCcw size={14} style={{ color: 'var(--orange)' }} />
                  </button>
                </div>
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

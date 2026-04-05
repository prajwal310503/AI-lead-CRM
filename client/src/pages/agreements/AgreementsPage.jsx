import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ScrollText, Plus, PenTool, CheckSquare, Clock, FileText,
  Trash2, Eye, Send, Filter, Search, Download, Edit2
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { formatDate } from '../../utils/format'
import CreateAgreementModal from './components/CreateAgreementModal'
import AgreementDetailModal from './components/AgreementDetailModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const STATUS_CONFIG = {
  draft:            { label: 'Draft',            color: 'var(--text-muted)',   bg: 'var(--bg-secondary)' },
  sent:             { label: 'Sent',             color: 'var(--blue)',          bg: 'var(--blue-light)' },
  partially_signed: { label: 'Partial Signature', color: 'var(--amber)',        bg: 'var(--amber-light)' },
  fully_signed:     { label: 'Fully Signed',     color: 'var(--emerald)',       bg: 'var(--emerald-light)' },
  expired:          { label: 'Expired',          color: 'var(--crimson)',       bg: 'var(--crimson-light)' },
  cancelled:        { label: 'Cancelled',        color: 'var(--text-muted)',    bg: 'var(--bg-secondary)' },
}

export default function AgreementsPage() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAgreement, setSelectedAgreement] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // agreement object

  // Determine filter from route
  const routeFilter = location.pathname.includes('/pending')
    ? 'partially_signed,sent'
    : location.pathname.includes('/signed')
    ? 'fully_signed'
    : null

  const pageTitle = location.pathname.includes('/pending')
    ? 'Pending Signatures'
    : location.pathname.includes('/signed')
    ? 'Signed Agreements'
    : 'All Agreements'

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['agreements', routeFilter],
    queryFn: async () => {
      if (routeFilter) {
        // Handle multi-status filter
        const statuses = routeFilter.split(',')
        const results = await Promise.all(
          statuses.map((s) => api.get(`/api/agreements?status=${s}`).then((r) => r.data))
        )
        return results.flat()
      }
      const { data } = await api.get('/api/agreements')
      return data
    },
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/agreements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement deleted')
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  })

  const filtered = agreements.filter((a) =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.client_name?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: agreements.length,
    pending: agreements.filter((a) => a.status === 'partially_signed' || a.status === 'sent').length,
    signed: agreements.filter((a) => a.status === 'fully_signed').length,
    draft: agreements.filter((a) => a.status === 'draft').length,
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <ScrollText size={18} style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{pageTitle}</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} agreements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agreements..."
              className="input-glass pl-9 text-sm"
              style={{ width: 200 }}
            />
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary text-sm">
            <Plus size={15} /> New Agreement
          </button>
        </div>
      </div>

      {/* Stats row */}
      {!routeFilter && (
        <div className="flex gap-3 px-5 py-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
            { label: 'Draft', value: stats.draft, color: 'var(--text-muted)' },
            { label: 'Pending Signature', value: stats.pending, color: 'var(--amber)' },
            { label: 'Fully Signed', value: stats.signed, color: 'var(--emerald)' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center px-4 py-2 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No agreements yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create your first client agreement to get started</p>
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus size={15} /> Create Agreement
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((agreement) => (
              <AgreementCard
                key={agreement.id}
                agreement={agreement}
                onView={() => setSelectedAgreement(agreement)}
                onDelete={() => setConfirmDelete(agreement)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateAgreementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['agreements'] })
          setCreateOpen(false)
        }}
      />

      <AnimatePresence>
        {selectedAgreement && (
          <AgreementDetailModal
            agreement={selectedAgreement}
            onClose={() => setSelectedAgreement(null)}
            onUpdated={(updated) => {
              setSelectedAgreement(updated)
              queryClient.invalidateQueries({ queryKey: ['agreements'] })
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Agreement?"
        message={confirmDelete ? `"${confirmDelete.title}" will be permanently deleted and cannot be recovered.` : ''}
        confirmLabel="Delete Agreement"
        loading={deleteMutation.isPending}
        onConfirm={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

function AgreementCard({ agreement, onView, onDelete }) {
  const sc = STATUS_CONFIG[agreement.status] || STATUS_CONFIG.draft
  const agencySigned = !!agreement.your_signed_at
  const clientSigned = !!agreement.client_signed_at

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 rounded-2xl flex items-center gap-4 group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.1)' }}>
        <ScrollText size={18} style={{ color: '#8B5CF6' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{agreement.title}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ background: sc.bg, color: sc.color }}>
            {sc.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{agreement.client_name || 'No client'}</p>
          {agreement.total_amount && (
            <p className="text-xs font-semibold" style={{ color: 'var(--emerald)' }}>
              ₹{parseFloat(agreement.total_amount).toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(agreement.created_at)}</p>
        </div>
        {/* Signature indicators */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] flex items-center gap-1" style={{ color: agencySigned ? 'var(--emerald)' : 'var(--text-muted)' }}>
            <CheckSquare size={10} /> Agency {agencySigned ? 'Signed' : 'Pending'}
          </span>
          <span className="text-[10px] flex items-center gap-1" style={{ color: clientSigned ? 'var(--emerald)' : 'var(--text-muted)' }}>
            <CheckSquare size={10} /> Client {clientSigned ? 'Signed' : 'Pending'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onView} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" title="View">
          <Eye size={14} style={{ color: 'var(--blue)' }} />
        </button>
        <button onClick={onDelete} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" title="Delete">
          <Trash2 size={14} style={{ color: 'var(--crimson)' }} />
        </button>
      </div>
    </motion.div>
  )
}

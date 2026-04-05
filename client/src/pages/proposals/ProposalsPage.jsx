import { useState } from 'react'
import {
  FileText, Plus, Download, Search, CheckCircle,
  TrendingDown, Eye, Clock, Send
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import useSettingsStore from '../../stores/useSettingsStore'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, timeAgo } from '../../utils/format'
import ProposalBuilder from './components/ProposalBuilder'
import NegotiationSimulator from './components/NegotiationSimulator'
import ProposalAcceptModal from './components/ProposalAcceptModal'
import { generateProposalPDF } from '../../utils/generateProposalPDF'
import toast from 'react-hot-toast'
import EmptyState from '../../components/ui/EmptyState'

const STATUS_FILTER_OPTIONS = ['all', 'draft', 'sent', 'viewed', 'negotiating', 'accepted', 'rejected']

export default function ProposalsPage() {
  const { user }    = useAuthStore()
  const settings    = useSettingsStore()

  const [builderOpen, setBuilderOpen]     = useState(false)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [downloadingId, setDownloadingId] = useState(null)

  // Negotiate
  const [negotiateProposal, setNegotiateProposal] = useState(null)
  const [negotiateLead, setNegotiateLead]         = useState(null)

  // Accept
  const [acceptProposal, setAcceptProposal] = useState(null)
  const [acceptLead, setAcceptLead]         = useState(null)

  const { data: proposals = [], isLoading, refetch } = useQuery({
    queryKey: ['proposals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, leads(id, business_name, owner_name, email, phone, city, industry, health_score, deal_probability), clients(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
    staleTime: 30_000,
  })

  const handleDownloadPDF = async (p) => {
    setDownloadingId(p.id)
    try {
      const lead = p.leads || {}
      const company = {
        company_name:    settings.companyName,
        company_email:   settings.companyEmail,
        company_website: settings.companyWebsite,
        company_address: settings.companyAddress,
      }
      const doc = generateProposalPDF(p, lead, company)
      doc.save(`${p.proposal_number || 'proposal'}.pdf`)
    } catch {
      toast.error('PDF generation failed')
    } finally {
      setDownloadingId(null)
    }
  }

  const openNegotiate = (p) => {
    setNegotiateProposal(p)
    setNegotiateLead(p.leads || null)
  }

  const openAccept = (p) => {
    setAcceptProposal(p)
    setAcceptLead(p.leads || null)
  }

  const filtered = proposals.filter((p) => {
    const matchSearch =
      !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.leads?.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.proposal_number?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total:       proposals.length,
    sent:        proposals.filter((p) => ['sent', 'viewed', 'negotiating'].includes(p.status)).length,
    negotiating: proposals.filter((p) => p.status === 'negotiating').length,
    accepted:    proposals.filter((p) => p.status === 'accepted').length,
    value:       proposals.filter((p) => p.status === 'accepted').reduce((s, p) => s + (p.total || 0), 0),
  }

  const statusColor = {
    draft:       'var(--text-muted)',
    sent:        'var(--blue)',
    viewed:      'var(--purple)',
    negotiating: 'var(--amber)',
    accepted:    'var(--emerald)',
    rejected:    '#EF4444',
  }

  return (
    <div className="p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Proposals</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Build, negotiate and close deals</p>
        </div>
        <button onClick={() => setBuilderOpen(true)} className="btn-primary">
          <Plus size={16} /> New Proposal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5 stagger">
        {[
          { label: 'Total',       value: stats.total,             color: 'var(--blue)' },
          { label: 'Active',      value: stats.sent,              color: 'var(--purple)' },
          { label: 'Negotiating', value: stats.negotiating,       color: 'var(--amber)' },
          { label: 'Accepted',    value: stats.accepted,          color: 'var(--emerald)' },
          { label: 'Revenue',     value: formatCurrency(stats.value), color: 'var(--orange)' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proposals..." className="input-glass pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTER_OPTIONS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: statusFilter === s ? 'var(--orange-light)' : 'var(--bg-secondary)',
                color:      statusFilter === s ? 'var(--orange)' : 'var(--text-muted)',
                border:     `1px solid ${statusFilter === s ? 'var(--orange)' : 'var(--border)'}`,
              }}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals found"
          description={statusFilter !== 'all' ? `No ${statusFilter} proposals` : 'Create your first proposal to start closing deals'}
          action={<button onClick={() => setBuilderOpen(true)} className="btn-primary">Create Proposal</button>}
        />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {['Proposal', 'Client', 'Value', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="transition-all hover:bg-white/5"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.proposal_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {p.leads?.business_name || p.clients?.name || '—'}
                    </p>
                    {p.leads?.deal_probability != null && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.leads.deal_probability}% deal chance
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--emerald)' }}>{formatCurrency(p.total)}</p>
                    {p.discount > 0 && (
                      <p className="text-[10px]" style={{ color: '#EF4444' }}>- {formatCurrency(p.discount)} disc.</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                      style={{
                        background: `${statusColor[p.status] || 'var(--text-muted)'}20`,
                        color:      statusColor[p.status] || 'var(--text-muted)',
                      }}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(p.created_at)}
                    {p.expires_at && new Date(p.expires_at) < new Date() && p.status === 'sent' && (
                      <p className="text-[9px] mt-0.5" style={{ color: '#EF4444' }}>Expired</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Download PDF */}
                      <button
                        onClick={() => handleDownloadPDF(p)}
                        disabled={downloadingId === p.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10"
                        title="Download PDF"
                      >
                        <Download size={13} style={{ color: downloadingId === p.id ? 'var(--text-muted)' : 'var(--blue)' }} />
                      </button>

                      {/* Negotiate button — show for sent/viewed/negotiating */}
                      {['sent', 'viewed', 'negotiating', 'draft'].includes(p.status) && (
                        <button
                          onClick={() => openNegotiate(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10"
                          title="Negotiate"
                        >
                          <TrendingDown size={13} style={{ color: 'var(--amber)' }} />
                        </button>
                      )}

                      {/* Accept button — show for sent/viewed/negotiating */}
                      {['sent', 'viewed', 'negotiating'].includes(p.status) && (
                        <button
                          onClick={() => openAccept(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10"
                          title="Mark Accepted"
                        >
                          <CheckCircle size={13} style={{ color: 'var(--emerald)' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <ProposalBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={() => { refetch(); setBuilderOpen(false) }}
      />

      {negotiateProposal && (
        <NegotiationSimulator
          open={!!negotiateProposal}
          onClose={() => { setNegotiateProposal(null); setNegotiateLead(null); refetch() }}
          proposal={negotiateProposal}
          lead={negotiateLead}
        />
      )}

      {acceptProposal && (
        <ProposalAcceptModal
          open={!!acceptProposal}
          onClose={() => { setAcceptProposal(null); setAcceptLead(null) }}
          proposal={acceptProposal}
          lead={acceptLead}
          onAccepted={() => { refetch(); setAcceptProposal(null); setAcceptLead(null) }}
        />
      )}
    </div>
  )
}

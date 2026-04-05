import { useState, useEffect } from 'react'
import { FileText, ScrollText, ChevronDown, Loader, Check } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import api from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import { formatCurrency } from '../../../utils/format'
import toast from 'react-hot-toast'

// ── 7 agreement sections ──────────────────────────────────────────────────
const SECTION_DEFS = [
  {
    key:   'scope',
    label: 'Scope of Work',
    color: 'var(--orange)',
    placeholder: 'Describe all services and deliverables in detail...',
    rows: 4,
  },
  {
    key:   'deliverables',
    label: 'Deliverables',
    color: 'var(--emerald)',
    placeholder: 'List each specific deliverable (website, SEO report, social templates, etc.)...',
    rows: 3,
  },
  {
    key:   'timeline',
    label: 'Timeline',
    color: 'var(--blue)',
    placeholder: 'e.g. Project starts within 3 working days of agreement signing. Website delivery in 4 weeks...',
    rows: 3,
  },
  {
    key:   'payment_terms',
    label: 'Payment Terms',
    color: 'var(--purple)',
    placeholder: 'e.g. 50% advance on signing, 50% on final delivery. Invoice due within 7 days...',
    rows: 3,
  },
  {
    key:   'ip_ownership',
    label: 'IP Ownership',
    color: 'var(--amber)',
    placeholder: 'e.g. Upon receipt of full payment, all creative work and code transfers to the client...',
    rows: 3,
  },
  {
    key:   'confidentiality',
    label: 'Confidentiality',
    color: '#0EA5E9',
    placeholder: 'Both parties agree to keep all shared information confidential and not disclose to third parties...',
    rows: 2,
  },
  {
    key:   'termination',
    label: 'Termination',
    color: '#EF4444',
    placeholder: 'Either party may terminate with 14 days written notice. All completed work is billable...',
    rows: 2,
  },
]

const DEFAULT_SECTIONS = {
  scope:           '',
  deliverables:    '',
  timeline:        '',
  payment_terms:   '50% advance on signing, 50% on delivery. Invoice due within 7 days of issue. Late payments attract 2% per month interest.',
  ip_ownership:    'Upon receipt of full payment, all intellectual property, source code, designs, and content created for this project transfer exclusively to the Client. The Agency retains the right to showcase completed work in its portfolio unless instructed otherwise.',
  confidentiality: 'Both parties agree to maintain strict confidentiality of all shared business information, client data, pricing, and proprietary processes. This obligation continues for 2 years after project completion.',
  termination:     'Either party may terminate this agreement with 14 days written notice. All work completed up to the termination date will be billed at the agreed rate. Any advance paid for undelivered work will be refunded pro-rata.',
}

function buildSectionsFromProposal(proposal, lead) {
  const services = (proposal.services || [])
  const serviceNames = services.map(s => `• ${s.name}: ${formatCurrency(s.price)}`).join('\n')
  const deliverables = proposal.ai_content?.deliverables?.filter(Boolean).map(d => `• ${d}`).join('\n') || serviceNames
  const phases = (proposal.ai_content?.implementation_phases || [])
  const timelineText = phases.length
    ? phases.map(p => `${p.phase} — ${p.duration}`).join('\n')
    : `Project commences within 3 working days of agreement signing.\nEstimated completion: ${proposal.validity_days || 30} days.`

  return {
    scope: proposal.ai_content?.strategy
      ? proposal.ai_content.strategy.slice(0, 500)
      : `StartWeb will deliver the following services for ${lead?.business_name || 'the Client'}:\n\n${serviceNames}`,
    deliverables,
    timeline: timelineText,
    payment_terms: proposal.payment_terms
      ? `Payment Plan: ${proposal.payment_terms}\nTotal Investment: ${formatCurrency(proposal.total)}\nInvoices are due within 7 days. Late payments attract 2% per month.`
      : DEFAULT_SECTIONS.payment_terms,
    ip_ownership:    DEFAULT_SECTIONS.ip_ownership,
    confidentiality: DEFAULT_SECTIONS.confidentiality,
    termination:     DEFAULT_SECTIONS.termination,
  }
}

export default function CreateAgreementModal({ open, onClose, onCreated, prefillProposalId }) {
  const [tab, setTab] = useState('proposal') // 'proposal' | 'manual'
  const [proposals, setProposals] = useState([])
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [loadingProposals, setLoadingProposals] = useState(false)

  const [title, setTitle]           = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [sections, setSections]     = useState(DEFAULT_SECTIONS)
  const [sendNow, setSendNow]       = useState(false)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (open) {
      fetchProposals()
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setSelectedProposal(null)
    setTitle('')
    setClientName('')
    setClientEmail('')
    setTotalAmount('')
    setSections(DEFAULT_SECTIONS)
    setSendNow(false)
  }

  const fetchProposals = async () => {
    setLoadingProposals(true)
    try {
      const { data } = await supabase
        .from('proposals')
        .select('*, leads(id, business_name, owner_name, email, city)')
        .in('status', ['accepted', 'sent', 'viewed', 'negotiating', 'draft'])
        .order('created_at', { ascending: false })
        .limit(40)
      setProposals(data || [])

      // Pre-select if prefillProposalId passed
      if (prefillProposalId) {
        const match = (data || []).find(p => p.id === prefillProposalId)
        if (match) applyProposal(match)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingProposals(false)
    }
  }

  const applyProposal = (proposal) => {
    const lead = proposal.leads
    setSelectedProposal(proposal)
    setTitle(`Agreement — ${proposal.title}`)
    setClientName(lead?.business_name || proposal.client_name || '')
    setClientEmail(lead?.email || proposal.client_email || '')
    setTotalAmount(String(proposal.total || ''))
    setSections(buildSectionsFromProposal(proposal, lead))
  }

  const updateSection = (key, value) => {
    setSections(s => ({ ...s, [key]: value }))
  }

  const handleCreate = async () => {
    if (!title.trim() || !clientName.trim()) {
      toast.error('Title and client name are required')
      return
    }
    setSaving(true)
    try {
      const agNumber = `AGR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      const payload = {
        agreement_number: agNumber,
        title,
        client_name:  clientName,
        client_email: clientEmail,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        total_value:  totalAmount ? parseFloat(totalAmount) : null,
        lead_id:      selectedProposal?.lead_id || selectedProposal?.leads?.id || null,
        proposal_id:  selectedProposal?.id || null,
        sections,
        // flat compat fields
        scope:          sections.scope,
        timeline:       sections.timeline,
        payment_terms:  sections.payment_terms,
        terms_content:  Object.entries(sections)
          .map(([k, v]) => `${SECTION_DEFS.find(s => s.key === k)?.label?.toUpperCase() || k.toUpperCase()}\n${v}`)
          .join('\n\n---\n\n'),
        status: sendNow ? 'sent' : 'draft',
      }
      const { data } = await api.post('/api/agreements', payload)
      toast.success(sendNow ? 'Agreement created & sent!' : 'Agreement saved as draft!')
      onCreated?.(data)
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Agreement" size="2xl" noPadding>
      <div className="flex flex-col" style={{ height: '80vh' }}>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {[
            { id: 'proposal', label: 'From Proposal', icon: FileText },
            { id: 'manual',   label: 'Manual Entry',  icon: ScrollText },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === id ? 'var(--orange-light)' : 'transparent',
                color:      tab === id ? 'var(--orange)' : 'var(--text-muted)',
              }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 min-h-0">

          {/* Left — Proposal selector (only in proposal tab) */}
          {tab === 'proposal' && (
            <div className="w-60 flex-shrink-0 border-r overflow-y-auto p-3 space-y-1"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider px-1 mb-2" style={{ color: 'var(--text-muted)' }}>
                Select Proposal
              </p>
              {loadingProposals ? (
                <div className="flex justify-center py-4"><Loader size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
              ) : proposals.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No proposals found</p>
              ) : (
                proposals.map(p => (
                  <button key={p.id} onClick={() => applyProposal(p)}
                    className="w-full text-left p-2.5 rounded-xl transition-all"
                    style={{
                      background: selectedProposal?.id === p.id ? 'var(--orange-light)' : 'transparent',
                      border: `1px solid ${selectedProposal?.id === p.id ? 'var(--orange)' : 'transparent'}`,
                    }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: selectedProposal?.id === p.id ? 'var(--orange)' : 'var(--text-primary)' }}>
                          {p.leads?.business_name || p.title}
                        </p>
                        <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{p.title}</p>
                        <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--emerald)' }}>
                          {formatCurrency(p.total)}
                        </p>
                      </div>
                      {selectedProposal?.id === p.id && <Check size={12} style={{ color: 'var(--orange)' }} />}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Right — Form */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {tab === 'proposal' && !selectedProposal && (
              <div className="flex flex-col items-center justify-center h-full opacity-40">
                <FileText size={40} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Select a proposal to auto-populate</p>
              </div>
            )}

            {(tab === 'manual' || selectedProposal) && (
              <>
                {/* Header fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Agreement Title *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="input-glass" placeholder="Service Agreement — Website + SEO" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Client Name *</label>
                    <input value={clientName} onChange={e => setClientName(e.target.value)} className="input-glass" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Client Email</label>
                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="input-glass" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Value (₹)</label>
                    <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="input-glass" />
                  </div>
                </div>

                {/* 7 sections */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Agreement Sections</p>
                  {SECTION_DEFS.map(def => (
                    <div key={def.key}>
                      <label className="block text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: def.color }}>
                        {def.label}
                      </label>
                      <textarea
                        value={sections[def.key] || ''}
                        onChange={e => updateSection(def.key, e.target.value)}
                        rows={def.rows}
                        className="input-glass resize-none text-sm"
                        placeholder={def.placeholder}
                      />
                    </div>
                  ))}
                </div>

                {/* Send toggle */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Send for signature now</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Status will be set to "Sent" and client notified</p>
                  </div>
                  <button onClick={() => setSendNow(s => !s)}
                    className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                    style={{ background: sendNow ? 'var(--emerald)' : 'var(--border)' }}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: sendNow ? '22px' : '2px' }} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim()}
            className="btn-primary flex-1 justify-center gap-2"
            style={{ opacity: !title.trim() ? 0.5 : 1 }}
          >
            {saving ? <Loader size={14} className="animate-spin" /> : <ScrollText size={14} />}
            {saving ? 'Creating...' : sendNow ? 'Create & Send' : 'Save Draft'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle, Loader, FileText, FolderKanban, DollarSign,
  Bell, ChevronRight, Sparkles
} from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import api from '../../../lib/api'
import { formatCurrency } from '../../../utils/format'
import toast from 'react-hot-toast'

export default function ProposalAcceptModal({ open, onClose, proposal, lead, onAccepted }) {
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null) // { agreement, project, invoice }

  const handleAccept = async () => {
    if (!proposal?.id) return
    setLoading(true)
    try {
      const { data } = await api.post(`/api/proposals/${proposal.id}/accept`)
      setResult(data)
      onAccepted?.()
      toast.success('Proposal accepted! Agreement, Project & Invoice created.')
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Accept Proposal" size="md">
      {!result ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{proposal?.title}</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {lead?.business_name} · {lead?.city}
            </p>
            <div className="space-y-1">
              {(proposal?.services || []).map((s, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(s.price)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-sm pt-2 border-t mt-2"
              style={{ borderColor: 'var(--border)', color: 'var(--emerald)' }}>
              <span>Total Investment</span>
              <span>{formatCurrency(proposal?.total)}</span>
            </div>
          </div>

          {/* What happens on accept */}
          <div className="p-3 rounded-xl" style={{ background: 'var(--orange-light)', border: '1px solid var(--orange)30' }}>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--orange)' }}>What happens when you click Accept:</p>
            <div className="space-y-2">
              {[
                { icon: FileText,    color: 'var(--blue)',   text: 'Agreement auto-drafted and saved' },
                { icon: FolderKanban, color: 'var(--purple)', text: 'Project created in the pipeline' },
                { icon: DollarSign,  color: 'var(--emerald)', text: 'Invoice generated automatically' },
                { icon: Bell,        color: 'var(--amber)',   text: 'Admin & team notified instantly' },
              ].map(({ icon: Icon, color, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon size={13} style={{ color }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button onClick={handleAccept} disabled={loading} className="btn-primary flex-1 justify-center gap-2"
              style={{ background: 'var(--emerald)' }}>
              {loading ? <Loader size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {loading ? 'Processing...' : 'Accept & Proceed'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Success state ── */
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: '#10B98120' }}>
              <CheckCircle size={28} style={{ color: '#10B981' }} />
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Proposal Accepted!</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Everything has been set up automatically</p>
          </div>

          <div className="space-y-2">
            {result.agreement && (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#0EA5E915', border: '1px solid #0EA5E930' }}>
                <FileText size={16} style={{ color: '#0EA5E9' }} />
                <div className="flex-1">
                  <p className="text-xs font-bold" style={{ color: '#0EA5E9' }}>Agreement Created</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{result.agreement.agreement_number}</p>
                </div>
                <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            {result.project && (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#8B5CF615', border: '1px solid #8B5CF630' }}>
                <FolderKanban size={16} style={{ color: '#8B5CF6' }} />
                <div className="flex-1">
                  <p className="text-xs font-bold" style={{ color: '#8B5CF6' }}>Project Created</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{result.project.name}</p>
                </div>
                <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            {result.invoice && (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#10B98115', border: '1px solid #10B98130' }}>
                <DollarSign size={16} style={{ color: '#10B981' }} />
                <div className="flex-1">
                  <p className="text-xs font-bold" style={{ color: '#10B981' }}>Invoice Generated</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {result.invoice.invoice_number} · {formatCurrency(result.invoice.total)}
                  </p>
                </div>
                <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
          </div>

          <button onClick={onClose} className="btn-primary w-full justify-center gap-2">
            <Sparkles size={14} /> Done
          </button>
        </motion.div>
      )}
    </Modal>
  )
}

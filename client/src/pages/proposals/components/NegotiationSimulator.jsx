import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingDown, Brain, Loader, AlertTriangle, CheckCircle,
  DollarSign, BarChart2, Target, Zap, RefreshCw
} from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { callAI, parseJSONResponse, buildNegotiationPrompt } from '../../../lib/ai'
import { formatCurrency } from '../../../utils/format'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const PAYMENT_PLANS = [
  { value: 'full',     label: 'Full Upfront' },
  { value: '50-50',    label: '50/50 Split' },
  { value: '30-40-30', label: '30/40/30 Milestones' },
  { value: 'monthly',  label: 'Monthly Retainer' },
  { value: 'custom',   label: 'Custom Terms' },
]

const OBJECTION_LABELS = {
  pricing:    { label: 'Pricing Objection',  color: '#EF4444', icon: '💰' },
  value_gap:  { label: 'Value Gap',          color: '#F59E0B', icon: '📊' },
  cash_flow:  { label: 'Cash Flow Issue',    color: '#8B5CF6', icon: '💳' },
  authority:  { label: 'Not Decision Maker', color: '#6B7280', icon: '👤' },
  comparison: { label: 'Comparing Vendors',  color: '#0EA5E9', icon: '⚖️' },
  urgency:    { label: 'No Urgency',         color: '#F97316', icon: '⏰' },
}

export default function NegotiationSimulator({ open, onClose, proposal, lead }) {
  const [discountPct, setDiscountPct] = useState(0)
  const [paymentPlan, setPaymentPlan] = useState(proposal?.payment_terms || '50-50')
  const [aiResult, setAiResult]       = useState(null)
  const [loading, setLoading]         = useState(false)
  const [applying, setApplying]       = useState(false)

  const originalTotal  = proposal?.total || 0
  const discountAmount = Math.round(originalTotal * discountPct / 100)
  const revisedTotal   = originalTotal - discountAmount
  const estimatedMargin = Math.max(0, 65 - discountPct * 0.8) // rough margin estimate

  const runNegotiation = async () => {
    if (!lead || !proposal) { toast.error('Missing lead or proposal data'); return }
    setLoading(true)
    setAiResult(null)
    try {
      const services = proposal.services || []
      const prompt = buildNegotiationPrompt(lead, services, originalTotal, discountPct, paymentPlan)
      const response = await callAI(prompt)
      const parsed = parseJSONResponse(response)
      if (parsed) {
        setAiResult(parsed)
      } else {
        toast.error('Could not parse AI negotiation advice — try again')
      }
    } catch (e) {
      toast.error('AI failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const applyTerms = async () => {
    if (!proposal?.id) return
    setApplying(true)
    try {
      const { error } = await supabase.from('proposals').update({
        total:         revisedTotal,
        discount:      (proposal.discount || 0) + discountAmount,
        payment_terms: paymentPlan,
        status:        'negotiating',
        updated_at:    new Date().toISOString(),
      }).eq('id', proposal.id)
      if (error) throw error
      await supabase.from('lead_activities').insert({
        lead_id:     lead?.id,
        type:        'negotiation',
        title:       `Negotiation — ${discountPct}% discount applied`,
        description: `Revised total: ${formatCurrency(revisedTotal)} | Plan: ${paymentPlan}`,
      }).catch(() => {})
      toast.success('Negotiated terms applied to proposal!')
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setApplying(false)
    }
  }

  const objectionInfo = aiResult?.objection_type ? OBJECTION_LABELS[aiResult.objection_type] : null

  return (
    <Modal open={open} onClose={onClose} title="Negotiation Simulator" size="lg">
      <div className="space-y-5">

        {/* Proposal summary */}
        <div className="p-3 rounded-xl flex items-center justify-between"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{proposal?.title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{lead?.business_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Original Total</p>
            <p className="text-lg font-extrabold" style={{ color: 'var(--emerald)' }}>{formatCurrency(originalTotal)}</p>
          </div>
        </div>

        {/* Discount Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Discount %
            </label>
            <span className="text-sm font-bold" style={{ color: discountPct > 20 ? '#EF4444' : discountPct > 10 ? '#F59E0B' : 'var(--emerald)' }}>
              {discountPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={discountPct}
            onChange={(e) => setDiscountPct(parseInt(e.target.value))}
            className="w-full accent-orange-500"
            style={{ height: 6 }}
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            <span>0% (No discount)</span>
            <span>40% (Risky)</span>
          </div>
        </div>

        {/* Payment Plan */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Payment Plan
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_PLANS.map((p) => (
              <button key={p.value} onClick={() => setPaymentPlan(p.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: paymentPlan === p.value ? 'var(--orange-light)' : 'var(--bg-secondary)',
                  color: paymentPlan === p.value ? 'var(--orange)' : 'var(--text-muted)',
                  border: `1px solid ${paymentPlan === p.value ? 'var(--orange)' : 'var(--border)'}`,
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Impact Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl text-center" style={{ background: '#EF444415', border: '1px solid #EF444430' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#EF4444' }}>Discount</p>
            <p className="text-base font-extrabold" style={{ color: '#EF4444' }}>- {formatCurrency(discountAmount)}</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: '#10B98115', border: '1px solid #10B98130' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10B981' }}>Revised Total</p>
            <p className="text-base font-extrabold" style={{ color: '#10B981' }}>{formatCurrency(revisedTotal)}</p>
          </div>
          <div className="p-3 rounded-xl text-center"
            style={{ background: estimatedMargin < 40 ? '#EF444415' : '#6366F115', border: `1px solid ${estimatedMargin < 40 ? '#EF444430' : '#6366F130'}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: estimatedMargin < 40 ? '#EF4444' : '#6366F1' }}>Est. Margin</p>
            <p className="text-base font-extrabold" style={{ color: estimatedMargin < 40 ? '#EF4444' : '#6366F1' }}>{Math.round(estimatedMargin)}%</p>
          </div>
        </div>

        {discountPct > 20 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#EF444415' }}>
            <AlertTriangle size={13} style={{ color: '#EF4444' }} />
            <p className="text-xs" style={{ color: '#EF4444' }}>Discount &gt;20% severely impacts profitability. AI will show counter strategy.</p>
          </div>
        )}

        {/* AI Analyse button */}
        <button onClick={runNegotiation} disabled={loading} className="btn-primary w-full justify-center gap-2">
          {loading ? <Loader size={15} className="animate-spin" /> : <Brain size={15} />}
          {loading ? 'Analysing negotiation...' : 'Get AI Negotiation Advice'}
        </button>

        {/* AI Result */}
        <AnimatePresence>
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Objection type */}
              {objectionInfo && (
                <div className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: `${objectionInfo.color}15`, border: `1px solid ${objectionInfo.color}30` }}>
                  <span className="text-lg">{objectionInfo.icon}</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: objectionInfo.color }}>{objectionInfo.label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Detected negotiation pattern</p>
                  </div>
                </div>
              )}

              {/* Counter strategy */}
              {aiResult.counter_strategy && (
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--orange)' }}>
                    Counter Strategy
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {aiResult.counter_strategy}
                  </p>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <BarChart2 size={12} style={{ color: '#6366F1' }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Revised Margin</p>
                  </div>
                  <p className="text-xl font-extrabold" style={{ color: aiResult.revised_margin < 40 ? '#EF4444' : '#6366F1' }}>
                    {aiResult.revised_margin}%
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={12} style={{ color: '#10B981' }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deal Probability</p>
                  </div>
                  <p className="text-xl font-extrabold" style={{ color: '#10B981' }}>
                    {aiResult.probability_after_revision}%
                  </p>
                </div>
              </div>

              {/* Apply terms */}
              <div className="flex gap-3 pt-1">
                <button onClick={runNegotiation} disabled={loading} className="btn-ghost flex-1 justify-center gap-1.5 text-sm">
                  <RefreshCw size={13} /> Recalculate
                </button>
                <button onClick={applyTerms} disabled={applying} className="btn-primary flex-1 justify-center gap-1.5 text-sm">
                  {applying ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  {applying ? 'Applying...' : 'Apply These Terms'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}

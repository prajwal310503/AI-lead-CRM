import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, ChevronRight, Loader, FileText, Send, Brain, Search,
  Plus, Trash2, TrendingUp, DollarSign, Package, Target, Zap,
  BarChart2, Edit2, RefreshCw, CheckCircle, X
} from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { supabase } from '../../../lib/supabase'
import useAuthStore from '../../../stores/useAuthStore'
import useSettingsStore from '../../../stores/useSettingsStore'
import { callAI, parseJSONResponse, buildProposalAIPrompt } from '../../../lib/ai'
import { formatCurrency, calcInvoiceTotals } from '../../../utils/format'
import { generateProposalNumber } from '../../../utils/helpers'
import toast from 'react-hot-toast'
import api from '../../../lib/api'

const STEPS = ['Select Lead', 'Services', 'AI Strategy', 'Edit Content', 'Preview & Send']

const PAYMENT_PLANS = [
  { value: 'full',     label: 'Full Upfront',      description: '100% before start' },
  { value: '50-50',    label: '50/50 Split',        description: '50% upfront, 50% on delivery' },
  { value: '30-40-30', label: '30/40/30 Milestone', description: 'Milestone-based payments' },
  { value: 'monthly',  label: 'Monthly Retainer',   description: 'Monthly recurring' },
  { value: 'custom',   label: 'Custom Terms',       description: 'Negotiate custom plan' },
]

const DEFAULT_CONTENT = {
  intro: '',
  strategy: '',
  implementation_phases: [
    { phase: 'Phase 1: Discovery & Strategy', duration: 'Week 1-2', tasks: ['Competitor analysis', 'Current presence audit', 'Goal definition'] },
    { phase: 'Phase 2: Build & Create',       duration: 'Week 3-6', tasks: ['Design mockups', 'Development', 'Content creation'] },
    { phase: 'Phase 3: Launch & Grow',        duration: 'Week 7-8', tasks: ['Go-live', 'SEO setup', 'Analytics configuration'] },
    { phase: 'Phase 4: Optimise & Report',    duration: 'Ongoing',  tasks: ['Monthly reports', 'Continuous improvements', 'Support'] },
  ],
  deliverables: ['', '', '', ''],
  roi_projection: '',
  pricing_explanation: '',
  closing_statement: '',
}

function ScoreBadge({ score, size = 'sm' }) {
  if (score == null) return null
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'
  const fontSize = size === 'xs' ? '9px' : '10px'
  return (
    <span className="px-1.5 py-0.5 rounded-full font-bold"
      style={{ background: `${color}20`, color, fontSize, border: `1px solid ${color}40` }}>
      {score}
    </span>
  )
}

export default function ProposalBuilder({ open, onClose, onCreated }) {
  const { user } = useAuthStore()
  const settings = useSettingsStore()

  const [step, setStep]                     = useState(0)
  const [leads, setLeads]                   = useState([])
  const [services, setServices]             = useState([])
  const [leadSearch, setLeadSearch]         = useState('')
  const [selectedLead, setSelectedLead]     = useState(null)
  const [selectedServices, setSelectedServices] = useState([])

  // Pricing
  const [discount, setDiscount]         = useState(0)
  const [taxPercent, setTaxPercent]     = useState(settings.defaultTax || 18)
  const [validityDays, setValidityDays] = useState(30)
  const [paymentPlan, setPaymentPlan]   = useState('50-50')
  const [title, setTitle]               = useState('')

  // AI
  const [aiContent, setAiContent]       = useState(DEFAULT_CONTENT)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiGenerated, setAiGenerated]   = useState(false)

  // Save
  const [saving, setSaving] = useState(false)

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep(0)
      setLeadSearch('')
      setSelectedLead(null)
      setSelectedServices([])
      setDiscount(0)
      setTaxPercent(settings.defaultTax || 18)
      setValidityDays(30)
      setPaymentPlan('50-50')
      setTitle('')
      setAiContent(DEFAULT_CONTENT)
      setAiGenerated(false)
      fetchLeads()
      fetchServices()
    }
  }, [open])

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, business_name, owner_name, industry, city, health_score, deal_probability, website, google_rating, pain_points, opportunities')
      .or('is_active.is.null,is_active.eq.true')
      .order('created_at', { ascending: false })
      .limit(80)
    setLeads(data || [])
  }

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').eq('is_active', true).order('sort_order')
    setServices(data || [])
  }

  // ── Services helpers ──────────────────────────────────────────────────────
  const toggleService = (svc) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === svc.id)
      if (exists) return prev.filter((s) => s.id !== svc.id)
      return [...prev, { ...svc, override_price: null }]
    })
  }

  const updatePrice = (id, price) => {
    setSelectedServices((prev) =>
      prev.map((s) => s.id === id ? { ...s, override_price: parseFloat(price) || null } : s)
    )
  }

  const totals = (() => {
    const items = selectedServices.map((s) => ({ qty: 1, unit_price: s.override_price ?? s.base_price }))
    return calcInvoiceTotals ? calcInvoiceTotals(items, discount, taxPercent) : { subtotal: 0, taxAmount: 0, total: 0 }
  })()

  // ── AI generation ─────────────────────────────────────────────────────────
  const generateAI = async () => {
    if (!selectedLead || !selectedServices.length) {
      toast.error('Select a lead and services first')
      return
    }
    setGeneratingAI(true)
    try {
      const prompt = buildProposalAIPrompt(selectedLead, selectedServices, totals)
      const response = await callAI(prompt)
      const parsed = parseJSONResponse(response)
      if (parsed) {
        setAiContent({
          ...DEFAULT_CONTENT,
          ...parsed,
          implementation_phases: parsed.implementation_phases?.length
            ? parsed.implementation_phases
            : DEFAULT_CONTENT.implementation_phases,
          deliverables: parsed.deliverables?.length
            ? parsed.deliverables
            : DEFAULT_CONTENT.deliverables,
        })
        setAiGenerated(true)
        toast.success('AI Strategy generated!')
      } else {
        toast.error('Could not parse AI response — try again')
      }
    } catch (e) {
      toast.error('AI failed: ' + e.message)
    } finally {
      setGeneratingAI(false)
    }
  }

  // ── Proposal payload builder ──────────────────────────────────────────────
  const buildPayload = (status) => {
    const counter = Math.floor(Math.random() * 900) + 100
    const proposalNumber = generateProposalNumber(counter)
    const expiresAt = new Date(Date.now() + validityDays * 86400000).toISOString()
    return {
      lead_id:         selectedLead.id,
      created_by:      user.id,
      proposal_number: proposalNumber,
      title:           title || `Proposal for ${selectedLead.business_name}`,
      status,
      services: selectedServices.map((s) => ({
        id:         s.id,
        name:       s.name,
        price:      s.override_price ?? s.base_price,
        price_type: s.price_type,
      })),
      subtotal:      totals.subtotal,
      discount,
      tax_percent:   taxPercent,
      tax_amount:    totals.taxAmount,
      total:         totals.total,
      validity_days: validityDays,
      payment_terms: paymentPlan,
      expires_at:    expiresAt,
      ai_content:    aiContent,
      // Legacy flat fields for PDF backward compat
      ai_intro:      aiContent.intro,
      ai_why_us:     aiContent.strategy,
      ai_timeline:   aiContent.implementation_phases?.map(p => `${p.phase} (${p.duration})`).join('\n'),
      ai_closing:    aiContent.closing_statement,
      ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedLead) { toast.error('Select a lead/client'); return }
    if (!selectedServices.length) { toast.error('Select at least one service'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('proposals').insert(buildPayload('draft')).select().single()
      if (error) throw error
      toast.success('Proposal saved as draft!')
      onCreated?.()
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    if (!selectedLead) { toast.error('Select a lead/client'); return }
    if (!selectedServices.length) { toast.error('Select at least one service'); return }
    setSaving(true)
    try {
      const payload = buildPayload('sent')
      const { data: proposal, error } = await supabase.from('proposals').insert(payload).select().single()
      if (error) throw error

      // Non-fatal backend notify
      try {
        await api.post('/proposals/send', {
          proposalId:   proposal.id,
          leadId:       selectedLead.id,
          email:        selectedLead.email,
          phone:        selectedLead.phone,
          clientName:   selectedLead.owner_name || selectedLead.business_name,
          projectTitle: proposal.title,
          total:        totals.total,
          validUntil:   new Date(Date.now() + validityDays * 86400000).toLocaleDateString('en-IN'),
          proposalNumber: payload.proposal_number,
        })
      } catch { /* ignore */ }

      toast.success('Proposal sent!')
      onCreated?.()
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Phase editor helpers ──────────────────────────────────────────────────
  const updatePhase = (i, field, value) => {
    setAiContent((c) => {
      const phases = [...(c.implementation_phases || [])]
      phases[i] = { ...phases[i], [field]: value }
      return { ...c, implementation_phases: phases }
    })
  }

  const addPhaseTask = (i) => {
    setAiContent((c) => {
      const phases = [...(c.implementation_phases || [])]
      phases[i] = { ...phases[i], tasks: [...(phases[i].tasks || []), ''] }
      return { ...c, implementation_phases: phases }
    })
  }

  const updatePhaseTask = (i, j, value) => {
    setAiContent((c) => {
      const phases = [...(c.implementation_phases || [])]
      const tasks = [...(phases[i].tasks || [])]
      tasks[j] = value
      phases[i] = { ...phases[i], tasks }
      return { ...c, implementation_phases: phases }
    })
  }

  const removePhaseTask = (i, j) => {
    setAiContent((c) => {
      const phases = [...(c.implementation_phases || [])]
      const tasks = (phases[i].tasks || []).filter((_, k) => k !== j)
      phases[i] = { ...phases[i], tasks }
      return { ...c, implementation_phases: phases }
    })
  }

  const updateDeliverable = (i, value) => {
    setAiContent((c) => {
      const d = [...(c.deliverables || [])]
      d[i] = value
      return { ...c, deliverables: d }
    })
  }

  const addDeliverable = () => {
    setAiContent((c) => ({ ...c, deliverables: [...(c.deliverables || []), ''] }))
  }

  const removeDeliverable = (i) => {
    setAiContent((c) => ({ ...c, deliverables: (c.deliverables || []).filter((_, k) => k !== i) }))
  }

  // ── Filtered leads ────────────────────────────────────────────────────────
  const filteredLeads = leads.filter((l) =>
    !leadSearch ||
    l.business_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.owner_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.city?.toLowerCase().includes(leadSearch.toLowerCase())
  )

  // ── Can advance? ──────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return !!selectedLead
    if (step === 1) return selectedServices.length > 0
    return true
  }

  return (
    <Modal open={open} onClose={onClose} title="Proposal Builder" size="2xl" noPadding>
      <div className="flex flex-col" style={{ height: '82vh' }}>

        {/* ── Step header ── */}
        <div className="flex items-center gap-0 px-5 pt-4 pb-0 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1' : 'none' }}>
              <button
                onClick={() => i < step && setStep(i)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
                style={{ cursor: i < step ? 'pointer' : 'default' }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                  style={{
                    background: i < step ? 'var(--emerald)' : i === step ? 'var(--orange)' : 'var(--border)',
                    color: 'white',
                  }}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className="text-[9px] font-semibold whitespace-nowrap hidden sm:block"
                  style={{ color: i === step ? 'var(--orange)' : i < step ? 'var(--emerald)' : 'var(--text-muted)' }}>
                  {s}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mt-[-14px]"
                  style={{ background: i < step ? 'var(--emerald)' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.18 }}>

              {/* ── Step 0: Select Lead ── */}
              {step === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-1">
                    <Target size={18} style={{ color: 'var(--orange)' }} />
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Select Lead / Client</h3>
                  </div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Proposal title (optional — auto-generated)"
                    className="input-glass"
                  />
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Search leads..."
                      className="input-glass pl-8"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
                    {filteredLeads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setSelectedLead(l)}
                        className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                        style={{
                          background: selectedLead?.id === l.id ? 'var(--orange-light)' : 'var(--bg-secondary)',
                          border: `1px solid ${selectedLead?.id === l.id ? 'var(--orange)' : 'var(--border)'}`,
                        }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: selectedLead?.id === l.id ? 'var(--orange)' : 'var(--text-muted)' }}>
                          {l.business_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{l.business_name}</p>
                            {l.health_score != null && <ScoreBadge score={l.health_score} size="xs" />}
                          </div>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {[l.owner_name, l.industry, l.city].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {l.deal_probability != null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: '#6366F120', color: '#6366F1' }}>
                              {l.deal_probability}% deal
                            </span>
                          )}
                          {selectedLead?.id === l.id && <Check size={14} style={{ color: 'var(--orange)' }} />}
                        </div>
                      </button>
                    ))}
                    {filteredLeads.length === 0 && (
                      <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No leads found</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 1: Services ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-1">
                    <Package size={18} style={{ color: 'var(--orange)' }} />
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Select Services & Pricing</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                    {services.map((svc) => {
                      const sel = selectedServices.find((s) => s.id === svc.id)
                      const isSelected = !!sel
                      return (
                        <div key={svc.id} className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                          onClick={() => toggleService(svc)}
                          style={{
                            background: isSelected ? 'var(--orange-light)' : 'var(--bg-secondary)',
                            border: `1px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                          }}>
                          <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: isSelected ? 'var(--orange)' : 'var(--border)' }}>
                            {isSelected && <Check size={10} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{svc.name}</p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{svc.price_type}</p>
                          </div>
                          {isSelected ? (
                            <input
                              type="number"
                              value={sel.override_price ?? svc.base_price}
                              onChange={(e) => { e.stopPropagation(); updatePrice(svc.id, e.target.value) }}
                              onClick={(e) => e.stopPropagation()}
                              className="input-glass w-28 text-sm text-right"
                            />
                          ) : (
                            <span className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--emerald)' }}>
                              {formatCurrency(svc.base_price)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Pricing panel */}
                  <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>PRICING DETAILS</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Discount (₹)</label>
                        <input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="input-glass text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>GST %</label>
                        <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 18)} className="input-glass text-sm" step={0.5} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Validity (days)</label>
                        <input type="number" value={validityDays} onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)} className="input-glass text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Payment Plan</label>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {PAYMENT_PLANS.map((p) => (
                          <button key={p.value} onClick={() => setPaymentPlan(p.value)}
                            className="text-left p-2 rounded-lg text-xs transition-all"
                            style={{
                              background: paymentPlan === p.value ? 'var(--orange-light)' : 'var(--bg-glass)',
                              border: `1px solid ${paymentPlan === p.value ? 'var(--orange)' : 'var(--border)'}`,
                              color: paymentPlan === p.value ? 'var(--orange)' : 'var(--text-muted)',
                            }}>
                            <p className="font-semibold">{p.label}</p>
                            <p className="text-[9px] opacity-70">{p.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Totals */}
                    <div className="border-t pt-2 space-y-1" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span style={{ color: 'var(--text-primary)' }}>{formatCurrency(totals.subtotal)}</span></div>
                      {discount > 0 && <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Discount</span><span style={{ color: '#EF4444' }}>- {formatCurrency(discount)}</span></div>}
                      <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>GST ({taxPercent}%)</span><span style={{ color: 'var(--text-primary)' }}>{formatCurrency(totals.taxAmount)}</span></div>
                      <div className="flex justify-between font-bold text-sm pt-1 border-t" style={{ borderColor: 'var(--border)', color: 'var(--emerald)' }}>
                        <span>Total Investment</span><span>{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: AI Strategy ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain size={18} style={{ color: 'var(--orange)' }} />
                      <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>AI Proposal Strategy</h3>
                    </div>
                    <button onClick={generateAI} disabled={generatingAI} className="btn-primary text-sm gap-1.5">
                      {generatingAI ? <Loader size={13} className="animate-spin" /> : <Zap size={13} />}
                      {generatingAI ? 'Generating...' : aiGenerated ? 'Regenerate' : 'Generate with AI'}
                    </button>
                  </div>

                  {!aiGenerated && !generatingAI && (
                    <div className="p-5 rounded-xl text-center" style={{ background: 'var(--bg-secondary)', border: '2px dashed var(--border)' }}>
                      <Brain size={36} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--orange)' }} />
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Ready to generate</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        AI will create a personalised strategy for {selectedLead?.business_name} covering intro, implementation phases, deliverables and ROI projection
                      </p>
                    </div>
                  )}

                  {generatingAI && (
                    <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg-secondary)' }}>
                      <Loader size={28} className="animate-spin mx-auto mb-2" style={{ color: 'var(--orange)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Crafting your proposal strategy...</p>
                    </div>
                  )}

                  {aiGenerated && !generatingAI && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#10B98120' }}>
                        <CheckCircle size={14} style={{ color: '#10B981' }} />
                        <span className="text-xs font-semibold" style={{ color: '#10B981' }}>AI strategy generated — review in Edit Content step</span>
                      </div>

                      {/* Preview cards */}
                      {aiContent.intro && (
                        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--orange)' }}>Introduction</p>
                          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{aiContent.intro}</p>
                        </div>
                      )}
                      {aiContent.strategy && (
                        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--blue)' }}>Strategy</p>
                          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{aiContent.strategy}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {aiContent.roi_projection && (
                          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--emerald)' }}>ROI Projection</p>
                            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{aiContent.roi_projection}</p>
                          </div>
                        )}
                        {aiContent.closing_statement && (
                          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--purple)' }}>Closing</p>
                            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{aiContent.closing_statement}</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--amber)' }}>Implementation Phases</p>
                        <div className="space-y-1">
                          {(aiContent.implementation_phases || []).map((ph, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
                              <span style={{ color: 'var(--text-primary)' }}>{ph.phase}</span>
                              <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>{ph.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3: Edit Content ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Edit2 size={18} style={{ color: 'var(--orange)' }} />
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Edit Proposal Content</h3>
                  </div>

                  {/* Introduction */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--orange)' }}>Introduction</label>
                    <textarea value={aiContent.intro || ''} onChange={(e) => setAiContent((c) => ({ ...c, intro: e.target.value }))}
                      rows={3} className="input-glass resize-none text-sm" placeholder="Opening paragraph personalised to the client..." />
                  </div>

                  {/* Strategy */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--blue)' }}>Strategic Approach</label>
                    <textarea value={aiContent.strategy || ''} onChange={(e) => setAiContent((c) => ({ ...c, strategy: e.target.value }))}
                      rows={4} className="input-glass resize-none text-sm" placeholder="How services solve their specific problems..." />
                  </div>

                  {/* Implementation Phases */}
                  <div>
                    <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--amber)' }}>Implementation Phases</label>
                    <div className="space-y-3">
                      {(aiContent.implementation_phases || []).map((phase, i) => (
                        <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <div className="flex gap-2 mb-2">
                            <input value={phase.phase} onChange={(e) => updatePhase(i, 'phase', e.target.value)}
                              className="input-glass flex-1 text-xs font-semibold" placeholder="Phase name" />
                            <input value={phase.duration} onChange={(e) => updatePhase(i, 'duration', e.target.value)}
                              className="input-glass w-28 text-xs" placeholder="Duration" />
                          </div>
                          <div className="space-y-1">
                            {(phase.tasks || []).map((task, j) => (
                              <div key={j} className="flex gap-1.5 items-center">
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>•</span>
                                <input value={task} onChange={(e) => updatePhaseTask(i, j, e.target.value)}
                                  className="input-glass flex-1 text-xs py-1" placeholder="Task..." />
                                <button onClick={() => removePhaseTask(i, j)} className="p-1 rounded hover:bg-red-500/10">
                                  <X size={10} style={{ color: '#EF4444' }} />
                                </button>
                              </div>
                            ))}
                            <button onClick={() => addPhaseTask(i)} className="flex items-center gap-1 text-[10px] mt-1" style={{ color: 'var(--orange)' }}>
                              <Plus size={10} /> Add task
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--emerald)' }}>Deliverables</label>
                    <div className="flex flex-wrap gap-2">
                      {(aiContent.deliverables || []).map((d, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <input value={d} onChange={(e) => updateDeliverable(i, e.target.value)}
                            className="text-xs bg-transparent outline-none w-32" style={{ color: 'var(--text-primary)' }} placeholder="Deliverable..." />
                          <button onClick={() => removeDeliverable(i)}>
                            <X size={9} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </div>
                      ))}
                      <button onClick={addDeliverable} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                        style={{ background: 'var(--orange-light)', color: 'var(--orange)', border: '1px dashed var(--orange)' }}>
                        <Plus size={10} /> Add
                      </button>
                    </div>
                  </div>

                  {/* ROI Projection */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#10B981' }}>ROI Projection</label>
                    <textarea value={aiContent.roi_projection || ''} onChange={(e) => setAiContent((c) => ({ ...c, roi_projection: e.target.value }))}
                      rows={2} className="input-glass resize-none text-sm" placeholder="Specific quantified ROI with numbers and timeframes..." />
                  </div>

                  {/* Pricing Explanation */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--indigo)' }}>Investment Justification</label>
                    <textarea value={aiContent.pricing_explanation || ''} onChange={(e) => setAiContent((c) => ({ ...c, pricing_explanation: e.target.value }))}
                      rows={2} className="input-glass resize-none text-sm" placeholder="Compare to in-house hiring cost, lost revenue, competitor spend..." />
                  </div>

                  {/* Closing Statement */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--purple)' }}>Closing Statement</label>
                    <textarea value={aiContent.closing_statement || ''} onChange={(e) => setAiContent((c) => ({ ...c, closing_statement: e.target.value }))}
                      rows={3} className="input-glass resize-none text-sm" placeholder="Compelling close with urgency and clear next steps..." />
                  </div>
                </div>
              )}

              {/* ── Step 4: Preview & Send ── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart2 size={18} style={{ color: 'var(--orange)' }} />
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Preview & Send</h3>
                  </div>

                  {/* Summary header */}
                  <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {title || `Proposal for ${selectedLead?.business_name}`}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {selectedLead?.business_name} · {selectedLead?.city} · Valid {validityDays} days
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold" style={{ color: 'var(--emerald)' }}>{formatCurrency(totals.total)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{paymentPlan} plan</p>
                      </div>
                    </div>
                    <div className="space-y-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                      {selectedServices.map((s) => (
                        <div key={s.id} className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                          <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(s.override_price ?? s.base_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content preview */}
                  {aiContent.intro && (
                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--orange)' }}>Introduction</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{aiContent.intro}</p>
                    </div>
                  )}
                  {aiContent.roi_projection && (
                    <div className="p-3 rounded-xl" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10B981' }}>ROI Projection</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{aiContent.roi_projection}</p>
                    </div>
                  )}
                  {(aiContent.deliverables || []).some(Boolean) && (
                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--emerald)' }}>Deliverables</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiContent.deliverables.filter(Boolean).map((d, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: '#10B98120', color: '#10B981' }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveDraft} disabled={saving} className="btn-ghost flex-1 justify-center gap-2">
                      <FileText size={15} />
                      {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button onClick={handleSend} disabled={saving} className="btn-primary flex-1 justify-center gap-2">
                      {saving ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
                      {saving ? 'Sending...' : 'Send to Client'}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Navigation footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost text-sm"
            style={{ opacity: step === 0 ? 0.4 : 1 }}
          >
            Back
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Step {step + 1} of {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canNext()}
              className="btn-primary text-sm gap-1"
              style={{ opacity: !canNext() ? 0.5 : 1 }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </Modal>
  )
}

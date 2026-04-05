import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Plus, Search, Download, CheckCircle, Clock, AlertTriangle,
  TrendingUp, IndianRupee, X, Send, MessageSquare, Eye, ChevronDown,
  ArrowUpRight, Filter, RefreshCw
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, LineChart, Line, Legend, ComposedChart, Area
} from 'recharts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import useSettingsStore from '../../stores/useSettingsStore'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, formatDate } from '../../utils/format'
import InvoiceBuilder from './components/InvoiceBuilder'
import { generateInvoicePDF } from '../../utils/generateInvoicePDF'
import EmptyState from '../../components/ui/EmptyState'
import { openWhatsApp } from '../../utils/helpers'
import toast from 'react-hot-toast'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_TABS = ['all','draft','sent','partial','paid','overdue']

// ── Record Payment Modal ──────────────────────────────────────────────────────
function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const { user } = useAuthStore()
  const [amount, setAmount]   = useState(invoice.amount_due || '')
  const [method, setMethod]   = useState('upi')
  const [ref, setRef]         = useState('')
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const { error: pErr } = await supabase.from('payments').insert({
        invoice_id: invoice.id, client_id: invoice.client_id,
        amount: amt, method, reference: ref || null, recorded_by: user.id, payment_date: date,
      })
      if (pErr) throw pErr
      const newPaid = (invoice.amount_paid || 0) + amt
      const newDue  = Math.max(0, (invoice.total || 0) - newPaid)
      await supabase.from('invoices').update({
        amount_paid: newPaid, amount_due: newDue,
        status: newDue <= 0 ? 'paid' : 'partial',
        paid_at: newDue <= 0 ? new Date().toISOString() : null,
      }).eq('id', invoice.id)
      toast.success(`₹${amt.toLocaleString('en-IN')} payment recorded!`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="glass rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-base" style={{ color:'var(--text-primary)' }}>Record Payment</h3>
            <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{invoice.invoice_number} · {invoice.clients?.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
            <X size={16} style={{ color:'var(--text-muted)' }} />
          </button>
        </div>

        {/* Invoice summary */}
        <div className="rounded-xl p-4 mb-5 grid grid-cols-3 gap-3" style={{ background:'var(--bg-secondary)' }}>
          {[
            { label:'Total',    value: formatCurrency(invoice.total),        color:'var(--blue)' },
            { label:'Paid',     value: formatCurrency(invoice.amount_paid),  color:'var(--emerald)' },
            { label:'Balance',  value: formatCurrency(invoice.amount_due),   color:'var(--crimson)' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] font-medium mb-1" style={{ color:'var(--text-muted)' }}>{s.label}</p>
              <p className="text-sm font-extrabold" style={{ color:s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {/* Amount */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color:'var(--text-muted)' }}>Payment Amount *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount" className="input-glass w-full" />
          </div>

          {/* Method */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color:'var(--text-muted)' }}>Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {['upi','cash','bank_transfer','card'].map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                  style={method===m ? {background:'var(--orange)',color:'#fff'} : {background:'var(--bg-secondary)',color:'var(--text-muted)'}}>
                  {m==='bank_transfer'?'Bank':m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color:'var(--text-muted)' }}>Reference / Transaction ID</label>
            <input value={ref} onChange={e => setRef(e.target.value)}
              placeholder="UPI ref, bank txn, etc." className="input-glass w-full" />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color:'var(--text-muted)' }}>Payment Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-glass w-full" />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const { user }         = useAuthStore()
  const settings         = useSettingsStore()
  const queryClient      = useQueryClient()
  const [builderOpen, setBuilderOpen]   = useState(false)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [payModal, setPayModal]         = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [expandedId, setExpandedId]     = useState(null)

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name, email, phone)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
    staleTime: 30_000,
  })

  const handleDownloadPDF = async (inv) => {
    setDownloadingId(inv.id)
    try {
      const doc = generateInvoicePDF({
        ...inv, client_name: inv.clients?.name, client_email: inv.clients?.email, client_phone: inv.clients?.phone,
      }, {
        company_name: settings.companyName, company_email: settings.companyEmail,
        company_website: settings.companyWebsite, company_address: settings.companyAddress, upi_id: settings.upiId,
      })
      doc.save(`${inv.invoice_number || 'invoice'}.pdf`)
    } catch { toast.error('PDF generation failed') }
    finally { setDownloadingId(null) }
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = invoices.reduce((s,i) => s+(i.total||0), 0)
    const collected  = invoices.reduce((s,i) => s+Math.max(0,(i.total||0)-(i.amount_due||0)), 0)
    const pending    = invoices.filter(i=>!['paid','cancelled'].includes(i.status)).reduce((s,i)=>s+(i.amount_due||0),0)
    const overdueBal = invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+(i.amount_due||0),0)
    const overdueCount=invoices.filter(i=>i.status==='overdue').length
    const collRate   = total > 0 ? Math.round((collected/total)*100) : 0
    const avgInvoice = invoices.length > 0 ? Math.round(total/invoices.length) : 0

    // Monthly chart — last 6 months
    const now = new Date(); const cy = now.getFullYear(); const cm = now.getMonth()
    const monthlyData = Array.from({length:6},(_,i)=>{
      const raw=cm-5+i; const mI=((raw%12)+12)%12; const yr=cy+Math.floor(raw/12)
      const slice = invoices.filter(inv=>{const d=new Date(inv.created_at);return d.getFullYear()===yr&&d.getMonth()===mI})
      const billed   = slice.reduce((s,inv)=>s+(inv.total||0),0)
      const received = slice.reduce((s,inv)=>s+Math.max(0,(inv.total||0)-(inv.amount_due||0)),0)
      const overdue  = slice.filter(inv=>inv.status==='overdue').reduce((s,inv)=>s+(inv.amount_due||0),0)
      return { label:MONTHS[mI], Billed:billed, Received:received, Overdue:overdue }
    })

    // Status distribution
    const statusDist = STATUS_TABS.slice(1).map(s=>({
      label:s, count:invoices.filter(i=>i.status===s).length
    }))

    return { total, collected, pending, overdueBal, overdueCount, collRate, avgInvoice, monthlyData, statusDist }
  }, [invoices])

  // ── Filtered invoices ─────────────────────────────────────────────────────
  const filtered = useMemo(() => invoices.filter(i => {
    const matchSearch = !search ||
      i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.clients?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter==='all' || i.status===statusFilter
    return matchSearch && matchStatus
  }), [invoices, search, statusFilter])

  const statusCounts = useMemo(() => {
    const counts = { all: invoices.length }
    STATUS_TABS.slice(1).forEach(s => { counts[s] = invoices.filter(i=>i.status===s).length })
    return counts
  }, [invoices])

  const yTick = v => v>=100000?`${(v/100000).toFixed(1)}L`:v>=1000?`${(v/1000).toFixed(0)}K`:`${v}`
  const yMax  = stats.monthlyData.length > 0 ? Math.max(...stats.monthlyData.map(d=>Math.max(d.Billed||0,d.Received||0))) : 100

  const ChartTooltip = ({active,payload,label}) => {
    if(!active||!payload?.length) return null
    return (
      <div className="rounded-xl p-3 shadow-xl" style={{background:'#1e2535',border:'1px solid rgba(255,255,255,0.1)'}}>
        <p className="text-xs font-bold mb-2" style={{color:'#fff'}}>{label}</p>
        {payload.map(p=>(
          <div key={p.name} className="flex items-center gap-2 text-[11px] mb-0.5">
            <span className="w-2 h-2 rounded-full" style={{background:p.color}}/>
            <span style={{color:'rgba(255,255,255,0.6)'}}>{p.name}:</span>
            <span className="font-bold" style={{color:p.color}}>{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color:'var(--text-primary)' }}>Payments & Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-muted)' }}>
            {invoices.length} invoices · {stats.collRate}% collected · {stats.overdueCount} overdue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="btn-ghost p-2" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setBuilderOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label:'Total Billed',    value:formatCurrency(stats.total),      color:'#0EA5E9', bg:'rgba(14,165,233,0.08)',  border:'rgba(14,165,233,0.2)',  icon:IndianRupee,    sub:`${invoices.length} invoices` },
          { label:'Collected',       value:formatCurrency(stats.collected),  color:'#10B981', bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.2)',  icon:CheckCircle,    sub:`${stats.collRate}% collection rate` },
          { label:'Pending',         value:formatCurrency(stats.pending),    color:'#F59E0B', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.2)',  icon:Clock,          sub:'outstanding balance' },
          { label:'Overdue',         value:formatCurrency(stats.overdueBal), color:'#EF4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.2)',   icon:AlertTriangle,  sub:`${stats.overdueCount} invoices overdue` },
          { label:'Avg Invoice',     value:formatCurrency(stats.avgInvoice), color:'#8B5CF6', bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.2)',  icon:TrendingUp,     sub:'per invoice' },
          { label:'Collection Rate', value:`${stats.collRate}%`,             color:'#F97316', bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.2)',  icon:ArrowUpRight,   sub:`${formatCurrency(stats.collected)} of ${formatCurrency(stats.total)}` },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 col-span-1" style={{background:s.bg,border:`1px solid ${s.border}`}}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold" style={{color:'var(--text-muted)'}}>{s.label}</span>
              <s.icon size={14} style={{color:s.color}}/>
            </div>
            <p className="text-xl font-extrabold" style={{color:s.color}}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Collection Progress ─────────────────────────────────────── */}
      {stats.total > 0 && (
        <div className="glass rounded-2xl px-5 py-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="font-semibold" style={{color:'var(--text-primary)'}}>Overall Collection Progress</span>
            <span style={{color:'var(--text-muted)'}}>{formatCurrency(stats.collected)} of {formatCurrency(stats.total)}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{background:'var(--bg-secondary)'}}>
            <motion.div initial={{width:0}} animate={{width:`${stats.collRate}%`}} transition={{duration:1,ease:'easeOut'}}
              className="h-full rounded-full" style={{background:'linear-gradient(90deg,#10B981,#0EA5E9)'}}/>
          </div>
          <div className="flex gap-4 mt-2">
            {[['#10B981','Collected'],['#F59E0B','Pending'],['#EF4444','Overdue']].map(([c,l])=>(
              <span key={l} className="text-[11px] flex items-center gap-1.5" style={{color:'var(--text-muted)'}}>
                <span className="w-2 h-2 rounded-full" style={{background:c}}/>{l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue Chart ───────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-sm" style={{color:'var(--text-primary)'}}>Revenue Trend — Last 6 Months</h3>
            <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>Billed vs Collected vs Overdue</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {[['#0EA5E9','Billed'],['#10B981','Received'],['#EF4444','Overdue']].map(([c,l])=>(
              <span key={l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{background:c}}/>{l}</span>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.monthlyData} margin={{top:4,right:8,bottom:0,left:8}} barCategoryGap="25%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={yTick} width={42} domain={[0,yMax>0?yMax*1.2:100]}/>
              <Tooltip content={<ChartTooltip/>} cursor={{fill:'rgba(255,255,255,0.03)'}}/>
              <Bar dataKey="Billed"   fill="#0EA5E9" radius={[4,4,0,0]} fillOpacity={0.7} maxBarSize={36}/>
              <Bar dataKey="Received" fill="#10B981" radius={[4,4,0,0]} fillOpacity={0.9} maxBarSize={36}/>
              <Line dataKey="Overdue" stroke="#EF4444" strokeWidth={2} dot={{fill:'#EF4444',r:3}} type="monotone"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl flex-wrap" style={{background:'var(--bg-secondary)'}}>
          {STATUS_TABS.map(s => (
            <button key={s} onClick={()=>setStatusFilter(s)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-all flex items-center gap-1.5"
              style={statusFilter===s ? {background:'var(--orange)',color:'#fff'} : {color:'var(--text-muted)'}}>
              {s}
              {statusCounts[s] > 0 && (
                <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold"
                  style={statusFilter===s ? {background:'rgba(255,255,255,0.25)',color:'#fff'} : {background:'var(--bg-secondary)',color:'var(--text-muted)'}}>
                  {statusCounts[s]}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--text-muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by invoice # or client..." className="input-glass pl-9 w-full text-sm"/>
        </div>
        <p className="text-xs" style={{color:'var(--text-muted)'}}>{filtered.length} invoice{filtered.length!==1?'s':''}</p>
      </div>

      {/* ── Invoice Table ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No invoices found" description={search||statusFilter!=='all'?'Try adjusting your filters':'Create your first invoice to get started'}
          action={<button onClick={()=>setBuilderOpen(true)} className="btn-primary">Create Invoice</button>}/>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid text-xs font-bold uppercase tracking-wider px-4 py-3"
            style={{borderBottom:'1px solid var(--border)',background:'var(--bg-secondary)',color:'var(--text-muted)',
            gridTemplateColumns:'1.2fr 1.5fr 1fr 1fr 1fr 140px 100px 120px'}}>
            <span>Invoice #</span>
            <span>Client</span>
            <span>Total</span>
            <span>Paid</span>
            <span>Due</span>
            <span>Status</span>
            <span>Due Date</span>
            <span>Actions</span>
          </div>

          <div className="divide-y" style={{borderColor:'var(--border)'}}>
            {filtered.map(inv => {
              const paidPct = inv.total > 0 ? Math.round(((inv.total-(inv.amount_due||0))/inv.total)*100) : 0
              const isOverdueDate = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid'
              const expanded = expandedId === inv.id

              return (
                <div key={inv.id}>
                  <div className="grid items-center px-4 py-3.5 hover:bg-white/5 transition-colors cursor-pointer"
                    style={{gridTemplateColumns:'1.2fr 1.5fr 1fr 1fr 1fr 140px 100px 120px'}}
                    onClick={()=>setExpandedId(expanded?null:inv.id)}>

                    {/* Invoice # */}
                    <div>
                      <p className="text-sm font-bold" style={{color:'var(--orange)',fontFamily:'monospace'}}>{inv.invoice_number}</p>
                      <p className="text-[10px]" style={{color:'var(--text-muted)'}}>{formatDate(inv.created_at)}</p>
                    </div>

                    {/* Client */}
                    <div>
                      <p className="text-sm font-semibold truncate" style={{color:'var(--text-primary)'}}>{inv.clients?.name||'—'}</p>
                      {inv.clients?.email&&<p className="text-[10px] truncate" style={{color:'var(--text-muted)'}}>{inv.clients.email}</p>}
                    </div>

                    {/* Total */}
                    <p className="text-sm font-bold" style={{color:'var(--text-primary)'}}>{formatCurrency(inv.total)}</p>

                    {/* Paid */}
                    <p className="text-sm font-semibold" style={{color:'#10B981'}}>{formatCurrency(inv.amount_paid||0)}</p>

                    {/* Due */}
                    <p className="text-sm font-semibold" style={{color:(inv.amount_due||0)>0?'#EF4444':'var(--text-muted)'}}>{formatCurrency(inv.amount_due||0)}</p>

                    {/* Status + progress */}
                    <div>
                      <StatusBadge status={inv.status}/>
                      {inv.total > 0 && inv.status !== 'draft' && (
                        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{background:'var(--bg-secondary)'}}>
                          <div className="h-full rounded-full transition-all" style={{width:`${paidPct}%`,background:paidPct===100?'#10B981':'#0EA5E9'}}/>
                        </div>
                      )}
                    </div>

                    {/* Due Date */}
                    <p className="text-xs font-medium" style={{color:isOverdueDate?'#EF4444':'var(--text-muted)'}}>
                      {formatDate(inv.due_date)}
                      {isOverdueDate&&<span className="block text-[9px]">OVERDUE</span>}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                      {inv.status!=='paid' && inv.status!=='cancelled' && (
                        <button onClick={()=>setPayModal(inv)}
                          className="text-[10px] px-2 py-1 rounded-lg font-bold whitespace-nowrap"
                          style={{background:'rgba(16,185,129,0.15)',color:'#10B981'}}>
                          + Pay
                        </button>
                      )}
                      <button onClick={()=>handleDownloadPDF(inv)} disabled={downloadingId===inv.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Download PDF">
                        <Download size={13} style={{color:downloadingId===inv.id?'var(--text-muted)':'var(--blue)'}}/>
                      </button>
                      {inv.clients?.phone && (
                        <button onClick={()=>openWhatsApp(inv.clients.phone,`Hi! Invoice ${inv.invoice_number} of ${formatCurrency(inv.total)} is pending. Please clear at your earliest.`)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="WhatsApp">
                          <MessageSquare size={13} style={{color:'#25D366'}}/>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded row */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                        transition={{duration:0.2}} className="overflow-hidden"
                        style={{borderTop:'1px solid var(--border)',background:'var(--bg-secondary)'}}>
                        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-[10px] font-semibold mb-1 uppercase" style={{color:'var(--text-muted)'}}>Client Email</p>
                            <p className="text-xs" style={{color:'var(--text-primary)'}}>{inv.clients?.email||'—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold mb-1 uppercase" style={{color:'var(--text-muted)'}}>Client Phone</p>
                            <p className="text-xs" style={{color:'var(--text-primary)'}}>{inv.clients?.phone||'—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold mb-1 uppercase" style={{color:'var(--text-muted)'}}>Payment Progress</p>
                            <p className="text-xs font-bold" style={{color:paidPct===100?'#10B981':'var(--amber)'}}>{paidPct}% paid</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold mb-1 uppercase" style={{color:'var(--text-muted)'}}>Notes</p>
                            <p className="text-xs" style={{color:'var(--text-muted)'}}>{inv.notes||'—'}</p>
                          </div>
                          {inv.items && (
                            <div className="col-span-2 sm:col-span-4">
                              <p className="text-[10px] font-semibold mb-2 uppercase" style={{color:'var(--text-muted)'}}>Line Items</p>
                              <div className="space-y-1">
                                {(Array.isArray(inv.items)?inv.items:[]).map((item,i)=>(
                                  <div key={i} className="flex justify-between text-xs py-1 px-2 rounded-lg" style={{background:'var(--bg-glass)'}}>
                                    <span style={{color:'var(--text-primary)'}}>{item.description||item.name}</span>
                                    <span className="font-semibold" style={{color:'var(--text-primary)'}}>
                                      {item.qty||1} × {formatCurrency(item.unit_price||item.rate||0)} = {formatCurrency((item.qty||1)*(item.unit_price||item.rate||0))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <InvoiceBuilder open={builderOpen} onClose={()=>setBuilderOpen(false)}
        onCreated={()=>{ refetch(); setBuilderOpen(false) }}/>

      {payModal && (
        <RecordPaymentModal invoice={payModal} onClose={()=>setPayModal(null)} onSaved={refetch}/>
      )}
    </div>
  )
}

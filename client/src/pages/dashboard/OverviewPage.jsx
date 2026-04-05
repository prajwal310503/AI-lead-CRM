import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Target, Flame, TrendingUp, FolderOpen, AlertCircle,
  Activity, Calendar, Brain, Loader, RefreshCw, MessageSquare,
  Zap, Clock, ArrowRight, IndianRupee, CheckCircle, AlertTriangle,
  BarChart2, ChevronUp, ChevronDown, Users, Award,
  ArrowUpRight, ArrowDownRight, Star
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid,
  ComposedChart, Line, Area, AreaChart
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import StatCard from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, formatDate, timeAgo, scoreColor } from '../../utils/format'
import { callAI, parseJSONResponse, buildDashboardInsightsPrompt } from '../../lib/ai'
import ScoreBadge from '../../components/ui/ScoreBadge'
import { openWhatsApp } from '../../utils/helpers'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STAGE_COLORS = {
  cold:'#64748B', contacted:'#3B82F6', warm:'#F59E0B', hot:'#F97316',
  proposal_sent:'#8B5CF6', negotiation:'#EAB308', converted:'#10B981', lost:'#EF4444'
}

function calcRev(list) {
  const billed    = list.reduce((s,i) => s + (i.total||0), 0)
  const received  = list.reduce((s,i) => s + Math.max(0, (i.total||0) - (i.amount_due||0)), 0)
  const remaining = list.filter(i => !['paid','cancelled'].includes(i.status)).reduce((s,i) => s + (i.amount_due||0), 0)
  return { billed, received, remaining }
}

function monthSlice(invoices, mIdx, yr) {
  return invoices.filter(i => { const d = new Date(i.created_at); return d.getFullYear()===yr && d.getMonth()===mIdx })
}

function pct(a, b) {
  return b > 0 ? Math.round(((a - b) / b) * 100) : (a > 0 ? 100 : 0)
}

// ── Dark tooltip for all charts ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 shadow-xl" style={{ background:'#1e2535', border:'1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-xs font-bold mb-2" style={{ color:'#fff' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color:'rgba(255,255,255,0.7)' }}>{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const LeadTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 shadow-xl" style={{ background:'#1e2535', border:'1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-xs font-bold mb-1" style={{ color:'#fff' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="text-[11px] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color:'rgba(255,255,255,0.7)' }}>{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Growth badge ─────────────────────────────────────────────────────────────
function GrowthBadge({ value, suffix = '%', size = 'sm' }) {
  const pos = value >= 0
  const Icon = pos ? ArrowUpRight : ArrowDownRight
  const color = pos ? '#10B981' : '#EF4444'
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold ${size==='lg'?'text-sm':'text-[11px]'}`}
      style={{ background: `${color}18`, color }}>
      <Icon size={size==='lg'?14:11} />
      {Math.abs(value)}{suffix}
    </span>
  )
}

export default function OverviewPage() {
  const { profile } = useAuthStore()
  const navigate    = useNavigate()
  const [revPeriod, setRevPeriod] = useState('month')
  const [insights, setInsights]   = useState([])
  const [loadingAI, setLoadingAI] = useState(false)

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name     = profile?.name?.split(' ')[0] || 'Deepak'
  const CY       = new Date().getFullYear()
  const LY       = CY - 1

  // ── Main stats ────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const now = new Date()
      const cy  = now.getFullYear()
      const cm  = now.getMonth()
      const ly  = cy - 1

      const [leadsRaw, projectsRes, invoicesRes, tasksRes] = await Promise.all([
        api.get('/api/leads').then(r => r.data).catch(() => []),
        supabase.from('projects').select('status'),
        supabase.from('invoices').select('status,total,amount_due,created_at'),
        supabase.from('tasks').select('status,deadline'),
      ])

      const leads    = Array.isArray(leadsRaw) ? leadsRaw : []
      const projects = projectsRes.data || []
      const invoices = invoicesRes.data || []
      const tasks    = tasksRes.data    || []

      // ── Year filtering ────────────────────────────────────────────────────
      const cyInvoices = invoices.filter(i => new Date(i.created_at).getFullYear() === cy)
      const lyInvoices = invoices.filter(i => new Date(i.created_at).getFullYear() === ly)
      const cyRev = calcRev(cyInvoices)
      const lyRev = calcRev(lyInvoices)
      const yoyBilledGrowth   = pct(cyRev.billed,   lyRev.billed)
      const yoyReceivedGrowth = pct(cyRev.received, lyRev.received)

      // ── All-time ──────────────────────────────────────────────────────────
      const allRev      = calcRev(invoices)
      const overdueAmt  = invoices.filter(i => i.status==='overdue').reduce((s,i) => s+(i.amount_due||0), 0)
      const overdueCount= invoices.filter(i => i.status==='overdue').length
      const receivedPct = allRev.billed > 0 ? Math.round((allRev.received/allRev.billed)*100) : 0

      // ── Month-over-month ──────────────────────────────────────────────────
      const lmIdx = cm===0 ? 11 : cm-1
      const lmYr  = cm===0 ? cy-1 : cy
      const thisM = calcRev(monthSlice(invoices, cm, cy))
      const lastM = calcRev(monthSlice(invoices, lmIdx, lmYr))
      const mGrowth = pct(thisM.billed, lastM.billed)

      // ── Chart helpers ─────────────────────────────────────────────────────
      const toRow = (label, slice) => {
        const r = calcRev(slice)
        return { label, Billed:r.billed, Received:r.received, Overdue:slice.filter(i=>i.status==='overdue').reduce((s,i)=>s+(i.amount_due||0),0) }
      }
      const yearData    = Array.from({length:12},(_,i) => toRow(MONTHS[i], monthSlice(invoices,i,cy)))
      const halfData    = Array.from({length:6},(_,i) => {
        const raw = cm-5+i; const mI = ((raw%12)+12)%12; const yr2 = cy + Math.floor(raw/12)
        return toRow(MONTHS[mI], monthSlice(invoices,mI,yr2))
      })
      const quarterData = Array.from({length:3},(_,i) => {
        const raw = cm-2+i; const mI = ((raw%12)+12)%12; const yr2 = cy + Math.floor(raw/12)
        const r = calcRev(monthSlice(invoices,mI,yr2))
        return { label:MONTHS[mI], Billed:r.billed, Received:r.received }
      })
      const weekData = [1,2,3,4].map(w => {
        const start=(w-1)*7+1; const end=w===4?31:w*7
        return toRow(`Wk ${w}`, invoices.filter(i=>{const d=new Date(i.created_at);return d.getFullYear()===cy&&d.getMonth()===cm&&d.getDate()>=start&&d.getDate()<=end}))
      })

      // ── YoY chart: CY vs LY by month ─────────────────────────────────────
      const yoyChartData = Array.from({length:12},(_,i) => ({
        label: MONTHS[i],
        [`${cy}`]: calcRev(monthSlice(invoices,i,cy)).billed,
        [`${ly}`]:  calcRev(monthSlice(invoices,i,ly)).billed,
      }))

      // ── Quarterly breakdown ───────────────────────────────────────────────
      const quarterlyBreakdown = ['Q1','Q2','Q3','Q4'].map((q,qi) => {
        const months = [qi*3, qi*3+1, qi*3+2]
        const cyQ = calcRev(cyInvoices.filter(i => months.includes(new Date(i.created_at).getMonth())))
        const lyQ = calcRev(lyInvoices.filter(i => months.includes(new Date(i.created_at).getMonth())))
        return { q, cyBilled:cyQ.billed, lyBilled:lyQ.billed, growth:pct(cyQ.billed,lyQ.billed), cyReceived:cyQ.received }
      })

      // ── Lead growth by month (CY) ─────────────────────────────────────────
      const leadGrowthData = Array.from({length:12},(_,i) => ({
        label: MONTHS[i],
        CY: leads.filter(l => { const d=new Date(l.created_at); return d.getFullYear()===cy && d.getMonth()===i }).length,
        LY: leads.filter(l => { const d=new Date(l.created_at); return d.getFullYear()===ly && d.getMonth()===i }).length,
      }))

      // ── Leads in pipeline this month ──────────────────────────────────────
      const leadsThisMonth = leads.filter(l => {
        const d=new Date(l.created_at); return d.getFullYear()===cy && d.getMonth()===cm
      }).length
      const leadsLastMonth = leads.filter(l => {
        const d=new Date(l.created_at); return d.getFullYear()===lmYr && d.getMonth()===lmIdx
      }).length
      const leadsMoM = pct(leadsThisMonth, leadsLastMonth)

      // ── Conversion rate ───────────────────────────────────────────────────
      const converted = leads.filter(l=>l.status==='converted').length
      const totalForRate = leads.filter(l=>l.status!=='cold').length
      const conversionRate = totalForRate > 0 ? Math.round((converted/totalForRate)*100) : 0
      const pipelineValue = leads.filter(l=>!['converted','lost'].includes(l.status))
        .reduce((s,l)=>(s + (l.deal_value||l.missed_revenue_estimate||0)),0)

      return {
        totalLeads:     leads.length,
        hotLeads:       leads.filter(l=>l.status==='hot').length,
        highProbLeads:  leads.filter(l=>(l.deal_probability||0)>=70).length,
        criticalLeads:  leads.filter(l=>l.urgency_level==='critical').length,
        tasksDue:       tasks.filter(t=>t.deadline&&new Date(t.deadline)<=new Date()&&t.status!=='done').length,
        activeProjects: projects.filter(p=>p.status==='active').length,
        pendingInvoices:invoices.filter(i=>['sent','overdue'].includes(i.status)).length,
        pipeline: ['cold','contacted','warm','hot','proposal_sent','negotiation','converted','lost'].map(s=>({
          name:s.replace('_',' '), value:leads.filter(l=>l.status===s).length, fill:STAGE_COLORS[s]
        })),
        probBuckets:[
          {range:'0-20%',  label:'Very Low',  count:leads.filter(l=>(l.deal_probability||0)<20).length,  color:'#EF4444'},
          {range:'20-40%', label:'Low',       count:leads.filter(l=>{const p=l.deal_probability||0;return p>=20&&p<40}).length, color:'#F97316'},
          {range:'40-60%', label:'Medium',    count:leads.filter(l=>{const p=l.deal_probability||0;return p>=40&&p<60}).length, color:'#F59E0B'},
          {range:'60-80%', label:'High',      count:leads.filter(l=>{const p=l.deal_probability||0;return p>=60&&p<80}).length, color:'#10B981'},
          {range:'80%+',   label:'Very High', count:leads.filter(l=>(l.deal_probability||0)>=80).length, color:'#0EA5E9'},
        ],
        ...allRev, overdueAmt, overdueCount, receivedPct,
        thisM, lastM, mGrowth,
        // YoY
        cy, ly,
        cyRev, lyRev, yoyBilledGrowth, yoyReceivedGrowth,
        yoyChartData, quarterlyBreakdown, leadGrowthData,
        // Lead metrics
        leadsThisMonth, leadsMoM, conversionRate, pipelineValue, converted,
        // charts
        yearData, halfData, quarterData, weekData,
      }
    },
    refetchInterval: 60000,
    staleTime: 30_000,
  })

  const { data: recentInvoices = [] } = useQuery({
    queryKey: ['recent-invoices-dash'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*,clients(name)').order('created_at',{ascending:false}).limit(5)
      return data || []
    },
    staleTime: 30_000,
  })

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await supabase.from('lead_activities').select('*,leads(business_name)').order('created_at',{ascending:false}).limit(8)
      return data || []
    },
    refetchInterval: 30000, staleTime: 30_000,
  })

  const { data: hotLeads = [] } = useQuery({
    queryKey: ['hot-leads-dash'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*')
        .or('is_priority.eq.true,status.eq.hot,deal_probability.gte.70')
        .order('deal_probability',{ascending:false,nullsFirst:false}).limit(6)
      return data || []
    },
    staleTime: 30_000,
  })

  const { data: followupsDue = [] } = useQuery({
    queryKey: ['followups-due'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('leads').select('*').lte('next_followup_date',today).not('next_followup_date','is',null).order('next_followup_date').limit(5)
      return data || []
    },
    staleTime: 30_000,
  })

  const { data: waStats } = useQuery({
    queryKey: ['wa-dash-stats'],
    queryFn: async () => {
      try { const { data } = await api.get('/api/whatsapp/stats'); return data }
      catch {
        const today = new Date(); today.setHours(0,0,0,0)
        const [r,p] = await Promise.all([
          supabase.from('whatsapp_messages').select('id',{count:'exact'}).eq('direction','inbound').gte('sent_at',today.toISOString()),
          supabase.from('leads').select('id',{count:'exact'}).eq('whatsapp_intro_sent',true).eq('whatsapp_status','intro_sent').is('whatsapp_last_reply_at',null),
        ])
        return { replies_today:r.count||0, awaiting_reply:p.count||0 }
      }
    },
    refetchInterval: 30000, staleTime: 30_000,
  })

  const { data: waReplies = [] } = useQuery({
    queryKey: ['wa-recent-replies'],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_messages').select('*,leads(id,business_name,phone)').eq('direction','inbound').order('sent_at',{ascending:false}).limit(5)
      return data || []
    },
    refetchInterval: 30000, staleTime: 30_000,
  })

  const { data: needsAction = [] } = useQuery({
    queryKey: ['needs-action'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').in('urgency_level',['critical','high']).not('status','in','("converted","lost")').order('created_at',{ascending:false}).limit(4)
      return data || []
    },
    staleTime: 30_000,
  })

  const generateInsights = async () => {
    setLoadingAI(true)
    try {
      const response = await callAI(buildDashboardInsightsPrompt(stats))
      const parsed = parseJSONResponse(response)
      if (parsed?.insights) setInsights(parsed.insights)
    } catch { toast.error('Failed to generate insights') }
    finally { setLoadingAI(false) }
  }

  // ── Period chart data ─────────────────────────────────────────────────────
  const PERIODS = [
    { key:'month',   label:'Month'    },
    { key:'quarter', label:'Quarter'  },
    { key:'half',    label:'6 Months' },
    { key:'year',    label:`${CY}`    },
    { key:'yoy',     label:'YoY'      },
  ]

  const chartData = revPeriod==='yoy'     ? stats?.yoyChartData
    : revPeriod==='year'    ? stats?.yearData
    : revPeriod==='half'    ? stats?.halfData
    : revPeriod==='quarter' ? stats?.quarterData
    : stats?.weekData
  const cData = chartData || []

  const pStats = revPeriod==='month' ? stats?.thisM
    : revPeriod==='yoy' ? stats?.cyRev
    : { billed: cData.reduce((s,r)=>s+(r.Billed||0),0), received: cData.reduce((s,r)=>s+(r.Received||0),0), remaining: cData.reduce((s,r)=>s+((r.Billed||0)-(r.Received||0)),0) }
  const ps   = pStats || { billed:0, received:0, remaining:0 }
  const pPct = ps.billed>0 ? Math.round((ps.received/ps.billed)*100) : 0

  const yMax = cData.length > 0 ? Math.max(...cData.flatMap(d => [d.Billed||d[`${CY}`]||0, d.Received||d[`${LY}`]||0])) : 0
  const yTick = v => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`

  return (
    <div className="p-5 space-y-6 animate-fade-in">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color:'var(--text-primary)' }}>
            {greeting}, {name} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-muted)' }}>
            {stats?.tasksDue ? `${stats.tasksDue} tasks due today` : 'All caught up today'} ·{' '}
            {stats?.pendingInvoices ? `${stats.pendingInvoices} invoices pending` : 'no pending invoices'} ·{' '}
            {followupsDue.length} follow-ups due
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium" style={{ color:'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color:'var(--text-muted)' }}>StartWebOS v3.0</p>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
        <StatCard title="Total Leads"      value={stats?.totalLeads     ||0} trend={stats?.leadsMoM??12}  icon={Target}      color="#0EA5E9" subtitle="in pipeline"      onClick={()=>navigate('/leads')} />
        <StatCard title="Hot Leads"        value={stats?.hotLeads       ||0} trend={8}                     icon={Flame}       color="#F97316" subtitle="ready to close"   onClick={()=>navigate('/leads')} />
        <StatCard title="High Probability" value={stats?.highProbLeads  ||0} trend={5}                     icon={TrendingUp}  color="#10B981" subtitle="≥70% deal chance" onClick={()=>navigate('/leads/crm')} />
        <StatCard title="Critical Urgency" value={stats?.criticalLeads  ||0} trend={-2}                    icon={Zap}         color="#EF4444" subtitle="needs action"     onClick={()=>navigate('/leads')} />
        <StatCard title="Tasks Due"        value={stats?.tasksDue       ||0} trend={-4}                    icon={AlertCircle} color="#F59E0B" subtitle="need attention"   onClick={()=>navigate('/tasks')} />
        <StatCard title="Active Projects"  value={stats?.activeProjects ||0} trend={3}                     icon={FolderOpen}  color="#8B5CF6" subtitle="in progress"      onClick={()=>navigate('/')} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          YEAR-OVER-YEAR HERO STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2" style={{ color:'var(--text-primary)', fontSize:15 }}>
            <Award size={17} style={{ color:'var(--orange)' }} /> Year-over-Year Growth
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background:'rgba(14,165,233,0.15)', color:'#0EA5E9' }}>{CY}</span>
            <span className="text-xs" style={{ color:'var(--text-muted)' }}>vs</span>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background:'rgba(255,255,255,0.06)', color:'var(--text-muted)' }}>{LY}</span>
          </div>
        </div>

        {/* 4 YoY metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            {
              label: `Revenue ${CY}`,
              value: stats?.cyRev?.billed || 0,
              compare: stats?.lyRev?.billed || 0,
              growth: stats?.yoyBilledGrowth ?? 0,
              color: '#0EA5E9',
              icon: IndianRupee,
              sub: `vs ${formatCurrency(stats?.lyRev?.billed||0)} in ${LY}`,
            },
            {
              label: `Revenue ${LY}`,
              value: stats?.lyRev?.billed || 0,
              compare: null,
              growth: null,
              color: '#64748B',
              icon: BarChart2,
              sub: `Full year ${LY} billing`,
            },
            {
              label: `Collected ${CY}`,
              value: stats?.cyRev?.received || 0,
              compare: stats?.lyRev?.received || 0,
              growth: stats?.yoyReceivedGrowth ?? 0,
              color: '#10B981',
              icon: CheckCircle,
              sub: `vs ${formatCurrency(stats?.lyRev?.received||0)} in ${LY}`,
            },
            {
              label: 'This Month',
              value: stats?.thisM?.billed || 0,
              compare: stats?.lastM?.billed || 0,
              growth: stats?.mGrowth ?? 0,
              color: '#8B5CF6',
              icon: TrendingUp,
              sub: `vs ${formatCurrency(stats?.lastM?.billed||0)} last month`,
            },
          ].map(c => (
            <div key={c.label} className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background:`${c.color}10`, border:`1px solid ${c.color}25` }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
                style={{ background:`radial-gradient(circle, ${c.color}15 0%, transparent 70%)`, transform:'translate(30%,-30%)' }} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>{c.label}</span>
                <c.icon size={14} style={{ color: c.color }} />
              </div>
              <p className="text-2xl font-extrabold mb-1" style={{ color: c.color }}>
                {formatCurrency(c.value)}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {c.growth !== null && <GrowthBadge value={c.growth} />}
                <span className="text-[11px]" style={{ color:'var(--text-muted)' }}>{c.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* YoY Bar Chart */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--text-muted)' }}>
            Monthly Billed Revenue — {CY} vs {LY}
          </p>
          <div className="h-44" style={{ background:'transparent' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.yoyChartData||[]} margin={{top:4,right:8,bottom:0,left:8}} barCategoryGap="30%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={yTick} width={38} />
                <Tooltip content={<CustomTooltip />} cursor={{fill:'rgba(255,255,255,0.03)'}} />
                <Bar dataKey={`${CY}`} fill="#0EA5E9" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey={`${LY}`}  fill="rgba(255,255,255,0.15)" radius={[3,3,0,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {[[`${CY}`,'#0EA5E9'],[`${LY}`,'rgba(255,255,255,0.35)']].map(([l,c])=>(
              <span key={l} className="text-[11px] flex items-center gap-1.5" style={{color:'var(--text-muted)'}}>
                <span className="w-2.5 h-2.5 rounded" style={{background:c}}/>{l}
              </span>
            ))}
          </div>
        </div>

        {/* Quarterly breakdown */}
        <div className="mt-5 pt-5" style={{ borderTop:'1px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--text-muted)' }}>
            Quarterly Breakdown — {CY}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(stats?.quarterlyBreakdown||[]).map(q => (
              <div key={q.q} className="rounded-xl p-3" style={{ background:'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>{q.q}</span>
                  {q.growth !== undefined && <GrowthBadge value={q.growth} />}
                </div>
                <p className="text-base font-extrabold mb-0.5" style={{ color:'var(--orange)' }}>{formatCurrency(q.cyBilled)}</p>
                <p className="text-[11px]" style={{ color:'var(--text-muted)' }}>Collected: {formatCurrency(q.cyReceived)}</p>
                {q.lyBilled > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color:'var(--text-muted)' }}>LY: {formatCurrency(q.lyBilled)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BUSINESS KPIs
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Conversion Rate',   value:`${stats?.conversionRate||0}%`,    icon:Star,    color:'#F59E0B', sub:`${stats?.converted||0} converted leads` },
          { label:'Pipeline Value',    value:formatCurrency(stats?.pipelineValue||0), icon:IndianRupee, color:'#10B981', sub:'active opportunities' },
          { label:'Leads This Month',  value:stats?.leadsThisMonth||0,           icon:Users,   color:'#0EA5E9', sub:<GrowthBadge value={stats?.leadsMoM??0} /> },
          { label:'WA Awaiting Reply', value:waStats?.awaiting_reply||0,         icon:MessageSquare, color:'#25D366', sub:`${waStats?.replies_today||0} replies today` },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${k.color}18`, border:`1px solid ${k.color}30` }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color:'var(--text-muted)' }}>{k.label}</p>
              <p className="text-xl font-extrabold" style={{ color:'var(--text-primary)' }}>{k.value}</p>
              <div className="text-[11px] mt-0.5" style={{ color:'var(--text-muted)' }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          REVENUE OVERVIEW (Period tabs)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4"
          style={{ borderBottom:'1px solid var(--border)' }}>
          <h3 className="font-bold flex items-center gap-2" style={{ color:'var(--text-primary)', fontSize:15 }}>
            <IndianRupee size={17} style={{ color:'var(--orange)' }} /> Revenue Overview
          </h3>
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background:'var(--bg-secondary)' }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={()=>setRevPeriod(p.key)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={revPeriod===p.key ? {background:'var(--orange)',color:'#fff'} : {color:'var(--text-muted)'}}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={()=>navigate('/payments')} className="text-xs flex items-center gap-1 font-medium" style={{color:'var(--orange)'}}>
            All Invoices <ArrowRight size={12}/>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* 4 Revenue Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Billed',    value:ps.billed,            color:'#0EA5E9', bg:'rgba(14,165,233,0.08)',  border:'rgba(14,165,233,0.2)',  icon:BarChart2,      sub: revPeriod==='month'?'This Month':revPeriod==='yoy'?`Year ${CY}`:'Period Total' },
              { label:'Received',  value:ps.received,          color:'#10B981', bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.2)',  icon:CheckCircle,    sub:`${pPct}% collected` },
              { label:'Remaining', value:ps.remaining,         color:'#F59E0B', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.2)',  icon:Clock,          sub:`${stats?.pendingInvoices||0} pending invoices` },
              { label:'Overdue',   value:stats?.overdueAmt||0, color:'#EF4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.2)',   icon:AlertTriangle,  sub:`${stats?.overdueCount||0} overdue invoices` },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-4" style={{background:c.bg, border:`1px solid ${c.border}`}}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{color:'var(--text-muted)'}}>{c.label}</span>
                  <c.icon size={15} style={{color:c.color}} />
                </div>
                <p className="text-2xl font-extrabold mb-1" style={{color:c.color}}>
                  {formatCurrency(c.value)}
                </p>
                <p className="text-[11px]" style={{color:'var(--text-muted)'}}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Collection Progress */}
          {ps.billed > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-2" style={{color:'var(--text-muted)'}}>
                <span className="font-medium">Collection Progress</span>
                <span>{pPct}% of {formatCurrency(ps.billed)} collected</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{background:'var(--bg-secondary)'}}>
                <motion.div initial={{width:0}} animate={{width:`${pPct}%`}} transition={{duration:1, ease:'easeOut'}}
                  className="h-full rounded-full" style={{background:'linear-gradient(90deg,#10B981,#0EA5E9)'}} />
              </div>
              <div className="flex gap-4 mt-2">
                {[['#10B981','Received'],['#F59E0B','Remaining'],['#EF4444','Overdue']].map(([c,l])=>(
                  <span key={l} className="text-[11px] flex items-center gap-1.5" style={{color:'var(--text-muted)'}}>
                    <span className="w-2 h-2 rounded-full" style={{background:c}} />{l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Chart — normal or YoY */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold" style={{color:'var(--text-primary)'}}>
                {revPeriod==='month'   ? `Weekly Breakdown — ${MONTHS[new Date().getMonth()]} ${CY}`
                 : revPeriod==='quarter' ? 'Last 3 Months'
                 : revPeriod==='half'    ? 'Last 6 Months'
                 : revPeriod==='yoy'     ? `${CY} vs ${LY} — Monthly Billed`
                 : `Monthly Revenue — ${CY}`}
              </p>
              <div className="flex items-center gap-3 text-xs">
                {revPeriod === 'yoy' ? (
                  [[`${CY}`,'#0EA5E9'],[`${LY}`,'rgba(255,255,255,0.35)']].map(([l,c])=>(
                    <span key={l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{background:c}}/>{l}</span>
                  ))
                ) : (
                  [['#0EA5E9','Billed'],['#10B981','Received'],['#EF4444','Overdue']].map(([c,l])=>(
                    <span key={l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{background:c}}/>{l}</span>
                  ))
                )}
              </div>
            </div>
            <div className="h-52 w-full" style={{background:'transparent'}}>
              <ResponsiveContainer width="100%" height="100%">
                {revPeriod === 'yoy' ? (
                  <BarChart data={cData} margin={{top:4,right:8,bottom:0,left:8}} barCategoryGap="30%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={yTick} width={40} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill:'rgba(255,255,255,0.04)'}} />
                    <Bar dataKey={`${CY}`} fill="#0EA5E9" radius={[4,4,0,0]} maxBarSize={24} />
                    <Bar dataKey={`${LY}`}  fill="rgba(255,255,255,0.15)" radius={[4,4,0,0]} maxBarSize={24} />
                  </BarChart>
                ) : (
                  <ComposedChart data={cData} margin={{top:4,right:8,bottom:0,left:8}} barCategoryGap="25%" barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={yTick} width={40} domain={[0, yMax > 0 ? yMax * 1.2 : 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill:'rgba(255,255,255,0.04)'}} />
                    <Bar dataKey="Billed"   fill="#0EA5E9" radius={[4,4,0,0]} fillOpacity={0.7} maxBarSize={36} />
                    <Bar dataKey="Received" fill="#10B981" radius={[4,4,0,0]} fillOpacity={0.9} maxBarSize={36} />
                    <Line dataKey="Overdue" stroke="#EF4444" strokeWidth={2} dot={{fill:'#EF4444',r:3}} type="monotone" />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Month-over-Month growth strip */}
          {revPeriod==='month' && (
            <div className="flex items-center justify-between p-4 rounded-xl" style={{background:'var(--bg-secondary)'}}>
              <div>
                <p className="text-sm font-bold" style={{color:'var(--text-primary)'}}>This Month vs Last Month</p>
                <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>
                  Last month — Billed: {formatCurrency(stats?.lastM?.billed||0)} · Received: {formatCurrency(stats?.lastM?.received||0)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <GrowthBadge value={stats?.mGrowth??0} size="lg" />
                <p className="text-[11px]" style={{color:'var(--text-muted)'}}>month-over-month</p>
              </div>
            </div>
          )}

          {/* Year-on-year strip */}
          {revPeriod==='yoy' && (
            <div className="flex items-center justify-between p-4 rounded-xl" style={{background:'var(--bg-secondary)'}}>
              <div>
                <p className="text-sm font-bold" style={{color:'var(--text-primary)'}}>{CY} vs {LY} Growth</p>
                <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>
                  {LY} total billed: {formatCurrency(stats?.lyRev?.billed||0)} · collected: {formatCurrency(stats?.lyRev?.received||0)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <GrowthBadge value={stats?.yoyBilledGrowth??0} size="lg" />
                <p className="text-[11px]" style={{color:'var(--text-muted)'}}>year-over-year</p>
              </div>
            </div>
          )}

          {/* Recent Invoices */}
          {recentInvoices.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:'var(--text-muted)'}}>Recent Invoices</p>
              <div className="space-y-2">
                {recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{background:'var(--bg-secondary)'}}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{color:'var(--text-primary)'}}>{inv.clients?.name||'Unknown Client'}</p>
                      <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{inv.invoice_number} · {formatDate(inv.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-sm font-bold" style={{color:'var(--text-primary)'}}>{formatCurrency(inv.total)}</p>
                      {inv.amount_due > 0 && inv.status!=='paid' && (
                        <p className="text-xs" style={{color:'#F59E0B'}}>Due: {formatCurrency(inv.amount_due)}</p>
                      )}
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {recentInvoices.length===0 && (
            <p className="text-sm text-center py-4" style={{color:'var(--text-muted)'}}>
              No invoices yet — create your first in <button onClick={()=>navigate('/payments')} style={{color:'var(--orange)'}}>Payments</button>
            </p>
          )}
        </div>
      </div>

      {/* ── Lead Growth Chart ─────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color:'var(--text-primary)' }}>
            <Users size={15} style={{ color:'var(--blue)' }} /> Lead Growth — {CY} vs {LY}
          </h3>
          <div className="flex items-center gap-3 text-xs">
            {[[`${CY}`,'#0EA5E9'],[`${LY}`,'rgba(255,255,255,0.3)']].map(([l,c])=>(
              <span key={l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{background:c}}/>{l}</span>
            ))}
          </div>
        </div>
        <div className="h-44" style={{ background:'transparent' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.leadGrowthData||[]} margin={{top:4,right:8,bottom:0,left:0}}>
              <defs>
                <linearGradient id="lgCY" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0EA5E9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lgLY" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ffffff" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<LeadTooltip />} cursor={{stroke:'rgba(255,255,255,0.1)',strokeWidth:1}} />
              <Area type="monotone" dataKey="CY" stroke="#0EA5E9" strokeWidth={2} fill="url(#lgCY)" dot={false} name={`${CY}`} />
              <Area type="monotone" dataKey="LY" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} fill="url(#lgLY)" dot={false} name={`${LY}`} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── WhatsApp Alert ────────────────────────────────────────────────── */}
      {(waStats?.replies_today>0 || waStats?.awaiting_reply>0) && (
        <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
          style={{background:'rgba(37,211,102,0.08)',border:'1px solid rgba(37,211,102,0.25)'}}>
          <MessageSquare size={18} style={{color:'#25D366'}} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{color:'#25D366'}}>WhatsApp Activity</p>
            <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>
              {waStats?.replies_today>0 && `${waStats.replies_today} repl${waStats.replies_today===1?'y':'ies'} today`}
              {waStats?.replies_today>0 && waStats?.awaiting_reply>0 && ' · '}
              {waStats?.awaiting_reply>0 && `${waStats.awaiting_reply} awaiting reply`}
            </p>
          </div>
          {waStats?.replies_today>0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse"
              style={{background:'rgba(37,211,102,0.2)',color:'#25D366',border:'1px solid rgba(37,211,102,0.4)'}}>
              {waStats.replies_today} NEW
            </span>
          )}
          <button onClick={()=>navigate('/leads/whatsapp')} className="text-xs flex items-center gap-1 font-semibold" style={{color:'#25D366'}}>
            Open WA Center <ArrowRight size={11}/>
          </button>
        </div>
      )}

      {/* ── Pipeline + Deal Probability ──────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm" style={{color:'var(--text-primary)'}}>Lead Pipeline</h3>
            <button onClick={()=>navigate('/leads')} className="text-xs flex items-center gap-1 font-medium" style={{color:'var(--orange)'}}>View All <ArrowRight size={12}/></button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.pipeline||[]} layout="vertical" margin={{top:0,right:35,bottom:0,left:75}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{fill:'var(--text-secondary)',fontSize:10}} width={80} axisLine={false} tickLine={false} />
                <Tooltip content={({active,payload,label})=>active&&payload?.length?
                  <div className="rounded-xl p-3" style={{background:'#1e2535',border:'1px solid rgba(255,255,255,0.1)'}}>
                    <p className="text-xs font-bold capitalize" style={{color:'#fff'}}>{label}</p>
                    <p className="text-xs mt-1" style={{color:payload[0]?.fill}}>{payload[0]?.value} leads</p>
                  </div>:null}
                  cursor={{fill:'rgba(255,255,255,0.03)'}} />
                <Bar dataKey="value" radius={[0,5,5,0]} maxBarSize={20}>
                  {(stats?.pipeline||[]).map((e,i)=><Cell key={i} fill={e.fill} fillOpacity={0.9}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'var(--text-primary)'}}>
              <TrendingUp size={15} style={{color:'#10B981'}}/> Deal Probability
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:'rgba(16,185,129,0.15)',color:'#10B981'}}>
              {stats?.highProbLeads||0} closeable
            </span>
          </div>
          <div className="space-y-3">
            {(stats?.probBuckets||[]).map(b=>(
              <div key={b.range} className="flex items-center gap-3">
                <span className="text-[11px] w-10 text-right flex-shrink-0 font-medium" style={{color:'var(--text-muted)'}}>{b.range}</span>
                <div className="flex-1 h-5 rounded-lg overflow-hidden relative" style={{background:'var(--bg-secondary)'}}>
                  <motion.div initial={{width:0}}
                    animate={{width:`${Math.max(b.count>0?6:0,(b.count/Math.max(1,stats?.totalLeads||1))*100)}%`}}
                    transition={{duration:0.7}} className="h-full rounded-lg" style={{background:b.color,opacity:0.85}}/>
                  {b.count>0&&<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{color:'var(--text-primary)'}}>{b.count}</span>}
                </div>
                <span className="text-[11px] w-14 flex-shrink-0 font-medium" style={{color:b.color}}>{b.label}</span>
              </div>
            ))}
          </div>
          {!(stats?.probBuckets?.some(b=>b.count>0)) && (
            <p className="text-xs text-center py-6" style={{color:'var(--text-muted)'}}>Run AI Analysis on leads to populate this</p>
          )}
        </div>
      </div>

      {/* ── Hot Leads + Needs Action ──────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'var(--text-primary)'}}>
              <Flame size={15} style={{color:'var(--orange)'}}/> Hot &amp; High-Probability Leads
            </h3>
            <button onClick={()=>navigate('/leads')} className="text-xs font-medium" style={{color:'var(--orange)'}}>View all</button>
          </div>
          <div className="space-y-2">
            {hotLeads.map(l=>(
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl group transition-colors" style={{background:'var(--bg-secondary)'}}>
                <ScoreBadge score={l.health_score} size={34}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold truncate" style={{color:'var(--text-primary)'}}>{l.business_name}</p>
                    {l.urgency_level==='critical'&&<Zap size={10} style={{color:'var(--crimson)',flexShrink:0}}/>}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{color:'var(--text-muted)'}}>{l.city} · {l.industry}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {l.deal_probability!=null&&(
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:scoreColor(l.deal_probability)+'20',color:scoreColor(l.deal_probability)}}>
                      {l.deal_probability}%
                    </span>
                  )}
                  <StatusBadge status={l.status}/>
                  {l.phone&&(
                    <button onClick={()=>openWhatsApp(l.phone,l.ai_hook_message||'')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg" style={{background:'rgba(37,211,102,0.1)'}}>
                      <MessageSquare size={12} style={{color:'#25D366'}}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {hotLeads.length===0&&<p className="text-xs text-center py-8" style={{color:'var(--text-muted)'}}>No hot leads yet — start analyzing leads to see them here</p>}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'var(--text-primary)'}}>
              <Zap size={15} style={{color:'var(--crimson)'}}/> Needs Immediate Action
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:'rgba(239,68,68,0.1)',color:'var(--crimson)'}}>
              {needsAction.length} leads
            </span>
          </div>
          <div className="space-y-2">
            {needsAction.map(l=>(
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{background:l.urgency_level==='critical'?'var(--crimson-light)':'var(--amber-light)'}}>
                <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                  style={{background:l.urgency_level==='critical'?'var(--crimson)':'var(--amber)'}}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{color:'var(--text-primary)'}}>{l.business_name}</p>
                  {l.missed_revenue_estimate&&<p className="text-[11px] mt-0.5" style={{color:l.urgency_level==='critical'?'var(--crimson)':'var(--amber)'}}>Losing ~{l.missed_revenue_estimate}</p>}
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg"
                  style={{background:l.urgency_level==='critical'?'var(--crimson)':'var(--amber)',color:'#fff'}}>
                  {l.urgency_level}
                </span>
              </div>
            ))}
            {needsAction.length===0&&<p className="text-xs text-center py-8" style={{color:'var(--text-muted)'}}>No critical leads — keep analyzing</p>}
          </div>
        </div>
      </div>

      {/* ── Follow-ups + WA Replies + Activity ────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'var(--text-primary)'}}>
              <Clock size={15} style={{color:'var(--amber)'}}/> Follow-ups Due
            </h3>
            {followupsDue.length>0&&(
              <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse" style={{background:'var(--amber-light)',color:'var(--amber)'}}>
                {followupsDue.length} today
              </span>
            )}
          </div>
          <div className="space-y-2">
            {followupsDue.map(l=>(
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl glass-amber group">
                <Calendar size={13} style={{color:'var(--amber)'}}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{color:'var(--text-primary)'}}>{l.business_name}</p>
                  <p className="text-[11px] mt-0.5" style={{color:'var(--amber)'}}>{formatDate(l.next_followup_date)} · {l.city}</p>
                </div>
                {l.phone&&(
                  <button onClick={()=>openWhatsApp(l.phone,l.ai_hook_message||'')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageSquare size={13} style={{color:'#25D366'}}/>
                  </button>
                )}
              </div>
            ))}
            {followupsDue.length===0&&<p className="text-xs text-center py-8" style={{color:'var(--text-muted)'}}>No follow-ups due today</p>}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'var(--text-primary)'}}>
              <MessageSquare size={15} style={{color:'#25D366'}}/> WA Replies
            </h3>
            {waStats?.replies_today>0&&(
              <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse" style={{background:'rgba(37,211,102,0.15)',color:'#25D366'}}>
                {waStats.replies_today} today
              </span>
            )}
          </div>
          <div className="space-y-2">
            {waReplies.map(msg=>(
              <div key={msg.id} className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{background:'rgba(37,211,102,0.06)',border:'1px solid rgba(37,211,102,0.15)'}}>
                <MessageSquare size={12} style={{color:'#25D366'}} className="mt-0.5 flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{color:'var(--text-primary)'}}>{msg.leads?.business_name||msg.phone}</p>
                  <p className="text-[11px] truncate mt-0.5" style={{color:'var(--text-muted)'}}>{msg.message||msg.body}</p>
                  <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>{timeAgo(msg.sent_at)}</p>
                </div>
              </div>
            ))}
            {waReplies.length===0&&<p className="text-xs text-center py-8" style={{color:'var(--text-muted)'}}>No replies yet</p>}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{color:'var(--text-primary)'}}>
            <Activity size={15} style={{color:'var(--blue)'}}/> Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.length===0
              ? <p className="text-xs text-center py-8" style={{color:'var(--text-muted)'}}>No activity yet</p>
              : recentActivity.map(a=>(
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{background:a.type==='analyzed'?'var(--purple)':a.type==='whatsapp_sent'?'#25D366':a.type==='stage_changed'?'var(--blue)':'var(--orange)'}}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug" style={{color:'var(--text-primary)'}}>
                      {a.title} — <span style={{color:'var(--orange)'}}>{a.leads?.business_name}</span>
                    </p>
                    {a.description&&<p className="text-[11px] truncate mt-0.5" style={{color:'var(--text-muted)'}}>{a.description}</p>}
                    <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'var(--text-primary)'}}>
            <Brain size={16} style={{color:'var(--purple)'}}/> AI Business Insights
          </h3>
          <button onClick={generateInsights} disabled={loadingAI} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
            {loadingAI?<Loader size={13} className="animate-spin"/>:<RefreshCw size={13}/>}
            {loadingAI?'Generating...':'Generate Insights'}
          </button>
        </div>
        {insights.length>0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {insights.map((ins,i)=>(
              <div key={i} className={`p-4 rounded-xl ${ins.type==='success'?'glass-emerald':ins.type==='warning'?'glass-amber':'glass-blue'}`}>
                <p className="text-xs font-bold mb-1.5" style={{color:ins.type==='success'?'var(--emerald)':ins.type==='warning'?'var(--amber)':'var(--blue)'}}>
                  {ins.title}
                </p>
                <p className="text-xs leading-relaxed" style={{color:'var(--text-secondary)'}}>{ins.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-6" style={{color:'var(--text-muted)'}}>Click "Generate Insights" for AI-powered business analysis</p>
        )}
      </div>
    </div>
  )
}

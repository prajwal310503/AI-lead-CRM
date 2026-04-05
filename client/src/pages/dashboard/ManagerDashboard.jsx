import { useState } from 'react'
import { Users, FolderOpen, CreditCard, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import { formatCurrency, timeAgo } from '../../utils/format'
import { StatusBadge } from '../../components/ui/StatusBadge'
import StatCard from '../../components/ui/StatCard'

export default function ManagerDashboard() {
  const { profile } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = profile?.name?.split(' ')[0] || 'there'

  const { data: stats } = useQuery({
    queryKey: ['manager-stats'],
    queryFn: async () => {
      const [clientsRes, projectsRes, invoicesRes, tasksRes] = await Promise.all([
        supabase.from('clients').select('id, name, total_billed, total_paid', { count: 'exact' }).eq('is_active', true),
        supabase.from('projects').select('status, budget', { count: 'exact' }),
        supabase.from('invoices').select('status, total, amount_due', { count: 'exact' }),
        supabase.from('tasks').select('status, deadline', { count: 'exact' }),
      ])
      const clients = clientsRes.data || []
      const projects = projectsRes.data || []
      const invoices = invoicesRes.data || []
      const tasks = tasksRes.data || []
      return {
        totalClients: clients.length,
        activeProjects: projects.filter((p) => p.status === 'active').length,
        pendingInvoices: invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).length,
        totalRevenue: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
        totalDue: invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.amount_due || 0), 0),
        overdueTasks: tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
      }
    },
    refetchInterval: 60000,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['manager-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*, projects(status)').eq('is_active', true).order('created_at', { ascending: false }).limit(8)
      return data || []
    },
  })

  const { data: invoices = [] } = useQuery({
    queryKey: ['manager-invoices'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*, clients(name)').in('status', ['sent', 'overdue', 'partial']).order('due_date').limit(6)
      return data || []
    },
  })

  const { data: teamLoad = [] } = useQuery({
    queryKey: ['manager-team-load'],
    queryFn: async () => {
      const { data: members } = await supabase.from('profiles').select('id, name, role').eq('is_active', true).neq('role', 'admin').neq('role', 'client')
      if (!members?.length) return []
      const loads = await Promise.all(members.map(async (m) => {
        const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', m.id).in('status', ['todo', 'in_progress', 'review'])
        return { ...m, activeTasks: count || 0 }
      }))
      return loads
    },
  })

  const STAT_CARDS = [
    { title: 'Active Clients', value: stats?.totalClients || 0, trend: 5, icon: Users, color: '#0EA5E9', subtitle: 'total active' },
    { title: 'Active Projects', value: stats?.activeProjects || 0, trend: 3, icon: FolderOpen, color: '#8B5CF6', subtitle: 'in progress' },
    { title: 'Pending Invoices', value: stats?.pendingInvoices || 0, trend: -2, icon: FileText, color: '#F59E0B', subtitle: 'awaiting payment' },
    { title: 'Total Revenue', value: formatCurrency(stats?.totalRevenue || 0), trend: 18, icon: TrendingUp, color: '#10B981', subtitle: 'collected' },
    { title: 'Amount Due', value: formatCurrency(stats?.totalDue || 0), trend: 0, icon: CreditCard, color: '#EF4444', subtitle: 'outstanding' },
    { title: 'Overdue Tasks', value: stats?.overdueTasks || 0, trend: -1, icon: AlertCircle, color: '#F97316', subtitle: 'need attention' },
  ]

  return (
    <div className="p-5 space-y-5 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{greeting}, {name}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Manager overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
        {STAT_CARDS.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Client List */}
        <div className="col-span-12 lg:col-span-7 glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Active Clients</h3>
          <div className="space-y-2">
            {clients.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No clients yet</p>
            ) : clients.map((c) => {
              const activeProj = (c.projects || []).filter((p) => p.status === 'active').length
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--blue)' }}>
                    {(c.name || 'C')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{activeProj} active project{activeProj !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--emerald)' }}>{formatCurrency(c.total_paid || 0)}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>paid</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          {/* Pending Invoices */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Pending Invoices</h3>
            <div className="space-y-2">
              {invoices.length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: 'var(--text-muted)' }}>No pending invoices</p>
              ) : invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mono truncate" style={{ color: 'var(--text-primary)' }}>{inv.invoice_number}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{inv.clients?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-xs font-bold" style={{ color: inv.status === 'overdue' ? 'var(--crimson)' : 'var(--amber)' }}>{formatCurrency(inv.amount_due)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Capacity */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Team Capacity</h3>
            <div className="space-y-2">
              {teamLoad.length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: 'var(--text-muted)' }}>No team members</p>
              ) : teamLoad.map((m) => {
                const pct = Math.min(100, (m.activeTasks / 10) * 100)
                const color = pct > 80 ? 'var(--crimson)' : pct > 50 ? 'var(--amber)' : 'var(--emerald)'
                return (
                  <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--indigo)' }}>
                      {(m.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-[10px] font-medium flex-shrink-0" style={{ color }}>{m.activeTasks} tasks</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

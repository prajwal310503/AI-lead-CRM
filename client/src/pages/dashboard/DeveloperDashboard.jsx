import { useState } from 'react'
import { CheckSquare, Clock, AlertCircle, CheckCircle2, Lock, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import { formatDate, timeAgo } from '../../utils/format'
import { StatusBadge } from '../../components/ui/StatusBadge'

const STATUS_ORDER = ['todo', 'in_progress', 'review', 'done']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const STATUS_COLORS = { todo: 'var(--text-muted)', in_progress: 'var(--blue)', review: 'var(--purple)', done: 'var(--emerald)' }

export default function DeveloperDashboard() {
  const { user, profile } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = profile?.name?.split(' ')[0] || 'there'
  const [activeStatus, setActiveStatus] = useState('in_progress')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['dev-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('assigned_to', user.id)
        .neq('status', 'cancelled')
        .order('deadline', { nullsLast: true })
      return data || []
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  })

  const { data: credentials = [] } = useQuery({
    queryKey: ['dev-credentials'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vault_credentials')
        .select('*, clients(name)')
        .in('category', ['hosting', 'ftp', 'cms', 'analytics'])
        .contains('visible_to', [profile?.role || 'developer'])
        .limit(6)
      return data || []
    },
    enabled: !!profile,
  })

  const today = new Date().toISOString().split('T')[0]
  const stats = {
    open: tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length,
    dueToday: tasks.filter((t) => t.deadline === today && t.status !== 'done').length,
    overdue: tasks.filter((t) => t.deadline && t.deadline < today && t.status !== 'done').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }

  const filteredTasks = tasks.filter((t) => t.status === activeStatus)

  const CATEGORY_ICONS = { hosting: '🖥', ftp: '📁', cms: '⚙', analytics: '📊' }

  return (
    <div className="p-5 space-y-5 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{greeting}, {name}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {stats.open} open tasks · {stats.dueToday > 0 ? `${stats.dueToday} due today` : 'nothing due today'}
          {stats.overdue > 0 && <span style={{ color: 'var(--crimson)' }}> · {stats.overdue} overdue</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
        {[
          { label: 'Open Tasks', value: stats.open, color: 'var(--blue)', icon: CheckSquare },
          { label: 'Due Today', value: stats.dueToday, color: 'var(--amber)', icon: Clock },
          { label: 'Overdue', value: stats.overdue, color: 'var(--crimson)', icon: AlertCircle },
          { label: 'Completed', value: stats.done, color: 'var(--emerald)', icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} style={{ color: s.color }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
            <p className="text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Task Board */}
        <div className="col-span-12 lg:col-span-8 glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>My Tasks</h3>
            <div className="flex gap-1 ml-auto">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: activeStatus === s ? STATUS_COLORS[s] : 'var(--bg-secondary)',
                    color: activeStatus === s ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {STATUS_LABELS[s]} {tasks.filter((t) => t.status === s).length > 0 && `(${tasks.filter((t) => t.status === s).length})`}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <CheckCircle2 size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No {STATUS_LABELS[activeStatus].toLowerCase()} tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((t) => {
                const isOverdue = t.deadline && t.deadline < today && t.status !== 'done'
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', borderLeft: `3px solid ${isOverdue ? 'var(--crimson)' : STATUS_COLORS[t.status]}` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {t.projects?.name && <span>{t.projects.name} · </span>}
                        {t.deadline ? <span style={{ color: isOverdue ? 'var(--crimson)' : 'var(--text-muted)' }}>Due {formatDate(t.deadline)}</span> : 'No deadline'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {t.estimated_hours && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>{t.estimated_hours}h</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize" style={{ background: t.priority === 'urgent' ? 'var(--crimson-light)' : t.priority === 'high' ? 'var(--orange-light)' : 'var(--bg-card)', color: t.priority === 'urgent' ? 'var(--crimson)' : t.priority === 'high' ? 'var(--orange)' : 'var(--text-muted)' }}>{t.priority}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tech Credentials */}
        <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lock size={14} style={{ color: 'var(--orange)' }} /> Tech Credentials
          </h3>
          {credentials.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No credentials shared with you</p>
          ) : (
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div key={cred.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{cred.label}</p>
                    {cred.url && (
                      <a href={cred.url} target="_blank" rel="noreferrer" className="ml-1 flex-shrink-0">
                        <ExternalLink size={11} style={{ color: 'var(--blue)' }} />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{cred.clients?.name} · {cred.category}</p>
                  {cred.username && <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>{cred.username}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

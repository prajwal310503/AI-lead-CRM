import { useState } from 'react'
import { PenTool, Clock, CheckCircle2, AlertCircle, Image, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import { formatDate } from '../../utils/format'

const STATUS_ORDER = ['todo', 'in_progress', 'review', 'done']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' }
const STATUS_COLORS = { todo: 'var(--text-muted)', in_progress: 'var(--blue)', review: 'var(--purple)', done: 'var(--emerald)' }
const PRIORITY_STYLES = {
  urgent: { bg: 'var(--crimson-light)', color: 'var(--crimson)' },
  high: { bg: 'var(--orange-light)', color: 'var(--orange)' },
  medium: { bg: 'var(--amber-light)', color: 'var(--amber)' },
  low: { bg: 'var(--emerald-light)', color: 'var(--emerald)' },
}

export default function DesignerDashboard() {
  const { user, profile } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = profile?.name?.split(' ')[0] || 'there'
  const [activeStatus, setActiveStatus] = useState('in_progress')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['designer-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, projects(name, client_id, clients(name))')
        .eq('assigned_to', user.id)
        .neq('status', 'cancelled')
        .order('deadline', { nullsLast: true })
      return data || []
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  })

  const { data: recentFiles = [] } = useQuery({
    queryKey: ['designer-files'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vault_files')
        .select('*, clients(name)')
        .in('file_type', ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf', 'image/webp'])
        .order('created_at', { ascending: false })
        .limit(6)
      return data || []
    },
  })

  const today = new Date().toISOString().split('T')[0]
  const stats = {
    open: tasks.filter((t) => t.status !== 'done').length,
    inReview: tasks.filter((t) => t.status === 'review').length,
    overdue: tasks.filter((t) => t.deadline && t.deadline < today && t.status !== 'done').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }

  const filteredTasks = tasks.filter((t) => t.status === activeStatus)

  const formatSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="p-5 space-y-5 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{greeting}, {name}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {stats.open} design tasks open
          {stats.inReview > 0 && <span style={{ color: 'var(--purple)' }}> · {stats.inReview} in review</span>}
          {stats.overdue > 0 && <span style={{ color: 'var(--crimson)' }}> · {stats.overdue} overdue</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
        {[
          { label: 'Open Tasks', value: stats.open, color: 'var(--blue)', icon: PenTool },
          { label: 'In Review', value: stats.inReview, color: 'var(--purple)', icon: Clock },
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
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Design Tasks</h3>
            <div className="flex gap-1 ml-auto flex-wrap">
              {STATUS_ORDER.map((s) => {
                const cnt = tasks.filter((t) => t.status === s).length
                return (
                  <button
                    key={s}
                    onClick={() => setActiveStatus(s)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: activeStatus === s ? STATUS_COLORS[s] : 'var(--bg-secondary)',
                      color: activeStatus === s ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {STATUS_LABELS[s]}{cnt > 0 ? ` (${cnt})` : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <PenTool size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No {STATUS_LABELS[activeStatus].toLowerCase()} tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((t) => {
                const isOverdue = t.deadline && t.deadline < today && t.status !== 'done'
                const ps = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium
                return (
                  <div key={t.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', borderLeft: `3px solid ${isOverdue ? 'var(--crimson)' : STATUS_COLORS[t.status]}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t.projects?.clients?.name && <span>{t.projects.clients.name} · </span>}
                          {t.projects?.name && <span>{t.projects.name} · </span>}
                          {t.deadline ? <span style={{ color: isOverdue ? 'var(--crimson)' : 'var(--text-muted)' }}>Due {formatDate(t.deadline)}</span> : 'No deadline'}
                        </p>
                        {t.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {t.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize flex-shrink-0" style={{ background: ps.bg, color: ps.color }}>{t.priority}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Client Assets */}
        <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Image size={14} style={{ color: 'var(--orange)' }} /> Recent Assets
          </h3>
          {recentFiles.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No design assets uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--orange-light)' }}>
                    <Image size={14} style={{ color: 'var(--orange)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.clients?.name} · {formatSize(f.file_size)}</p>
                  </div>
                  <a href={f.file_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                    <ExternalLink size={11} style={{ color: 'var(--blue)' }} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

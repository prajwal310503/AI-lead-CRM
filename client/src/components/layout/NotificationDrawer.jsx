import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle, Target, CreditCard, FileText, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useNotificationStore from '../../stores/useNotificationStore'
import useAuthStore from '../../stores/useAuthStore'
import { timeAgo, formatDate } from '../../utils/format'
import { groupBy } from '../../utils/helpers'
import { format, isToday, isYesterday, parseISO } from 'date-fns'

const TYPE_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  task: CheckCheck,
  payment: CreditCard,
  lead: Target,
  proposal: FileText,
  system: Zap,
}

const TYPE_COLORS = {
  info: 'var(--blue)', success: 'var(--emerald)', warning: 'var(--amber)',
  error: 'var(--crimson)', task: 'var(--indigo)', payment: 'var(--emerald)',
  lead: 'var(--orange)', proposal: 'var(--purple)', system: 'var(--blue)',
}

export default function NotificationDrawer() {
  const navigate = useNavigate()
  const { drawerOpen, setDrawerOpen, notifications, fetch, markAllRead, markRead, unreadCount } = useNotificationStore()
  const { user } = useAuthStore()

  useEffect(() => {
    if (drawerOpen && user) fetch(user.id)
  }, [drawerOpen, user])

  const grouped = notifications.reduce((acc, n) => {
    const d = new Date(n.created_at)
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'dd MMM yyyy')
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full z-50 flex flex-col"
            style={{ background: '#ffffff', borderLeft: '1px solid #e5e7eb', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-2">
                <Bell size={18} style={{ color: '#111827' }} />
                <h3 className="font-bold text-base" style={{ color: '#111827' }}>Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--orange)' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => user && markAllRead(user.id)}
                    className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--blue)' }}
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all" style={{ color: '#6b7280' }} onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <X size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Bell size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                </div>
              ) : (
                Object.entries(grouped).map(([day, items]) => (
                  <div key={day}>
                    <p className="px-5 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                      {day}
                    </p>
                    {items.map((n) => {
                      const Icon = TYPE_ICONS[n.type] || Info
                      const color = TYPE_COLORS[n.type] || 'var(--blue)'
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            markRead(n.id)
                            if (n.link) { navigate(n.link); setDrawerOpen(false) }
                          }}
                          className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all hover:bg-white/5 border-b"
                          style={{ borderColor: 'var(--border)', background: n.is_read ? 'transparent' : 'rgba(255,107,53,0.04)' }}
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                            <Icon size={14} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                            {n.message && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.message}</p>}
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--orange)' }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

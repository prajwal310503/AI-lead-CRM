import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Sun, Moon, Search, ChevronRight, LogOut, Settings, User, CheckSquare } from 'lucide-react'
import useAuthStore from '../../stores/useAuthStore'
import useSettingsStore from '../../stores/useSettingsStore'
import useNotificationStore from '../../stores/useNotificationStore'
import { AIProviderBadge } from '../ui/AIProviderBadge'

const BREADCRUMB_MAP = {
  '/': 'Dashboard',
  '/leads': 'Client Hunter',
  '/proposals': 'Proposals',
  '/tasks': 'Tasks',
  '/payments': 'Payments',
  '/vault': 'Vault',
  '/team': 'Team',
  '/settings': 'Settings',
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { theme, toggleTheme, activeProvider, activeModel } = useSettingsStore()
  const { unreadCount, setDrawerOpen } = useNotificationStore()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const dropRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const breadcrumb = BREADCRUMB_MAP[location.pathname] || location.pathname.slice(1)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <header
        className="h-[60px] flex items-center px-4 gap-3 flex-shrink-0 glass"
        style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 30 }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>StartWebOS</span>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{breadcrumb}</span>
        </div>

        {/* Search box */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            minWidth: 180,
          }}
        >
          <Search size={14} />
          <span className="flex-1 text-left text-xs">Search...</span>
          <span className="text-[10px] font-mono px-1 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>⌘K</span>
        </button>

        {/* AI badge */}
        <AIProviderBadge provider={activeProvider} model={activeModel} />

        {/* Bell */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <Bell size={17} style={{ color: 'var(--text-secondary)' }} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ background: 'var(--crimson)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {theme === 'dark'
            ? <Sun size={17} style={{ color: '#F59E0B' }} />
            : <Moon size={17} style={{ color: 'var(--indigo)' }} />
          }
        </button>

        {/* Avatar dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="flex items-center gap-2 px-2 py-1 rounded-xl transition-all"
            style={{ background: avatarOpen ? 'var(--bg-secondary)' : 'transparent' }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #0EA5E9)' }}>
              {profile?.name?.[0]?.toUpperCase() || 'D'}
            </div>
            <span className="hidden sm:block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {profile?.name?.split(' ')[0] || 'Deepak'}
            </span>
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                className="absolute right-0 top-full mt-2 w-48 glass rounded-2xl py-1 z-50"
                style={{ boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{profile?.name}</p>
                  <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{profile?.role}</p>
                </div>
                <DropItem icon={CheckSquare} label="My Tasks" onClick={() => { navigate('/tasks'); setAvatarOpen(false) }} />
                <DropItem icon={Settings} label="Settings" onClick={() => { navigate('/settings'); setAvatarOpen(false) }} />
                <DropItem icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} onClick={() => { toggleTheme(); setAvatarOpen(false) }} />
                <div className="border-t mt-1" style={{ borderColor: 'var(--border)' }}>
                  <DropItem icon={LogOut} label="Logout" onClick={handleLogout} danger />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}

function DropItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all hover:bg-white/5"
      style={{ color: danger ? 'var(--crimson)' : 'var(--text-secondary)' }}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) { setQuery(''); setActiveIdx(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const ALL_ITEMS = [
    { label: 'Dashboard',        path: '/',                   icon: '⚡', group: 'Main' },
    { label: 'Client Hunter',    path: '/leads',              icon: '🎯', group: 'Leads' },
    { label: 'CRM Pipeline',     path: '/leads/crm',          icon: '🗂️', group: 'Leads' },
    { label: 'Interested Leads', path: '/leads/interested',   icon: '💛', group: 'Leads' },
    { label: 'Working Clients',  path: '/leads/working',      icon: '💼', group: 'Leads' },
    { label: 'Closed Clients',   path: '/leads/closed',       icon: '✅', group: 'Leads' },
    { label: 'Lost Leads',       path: '/leads/lost',         icon: '❌', group: 'Leads' },
    { label: 'Proposals',        path: '/proposals',          icon: '📄', group: 'Main' },
    { label: 'Agreements',       path: '/agreements',         icon: '📝', group: 'Main' },
    { label: 'Tasks',            path: '/tasks',              icon: '☑️', group: 'Main' },
    { label: 'Payments',         path: '/payments',           icon: '💳', group: 'Main' },
    { label: 'Vault',            path: '/vault',              icon: '🔒', group: 'Main' },
    { label: 'Team',             path: '/team',               icon: '👥', group: 'Main' },
    { label: 'Settings',         path: '/settings',           icon: '⚙️', group: 'Main' },
  ]

  const items = ALL_ITEMS.filter(i =>
    !query || i.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => { setActiveIdx(0) }, [query])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && items[activeIdx]) { navigate(items[activeIdx].path); onClose() }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', paddingTop: '12vh' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: -16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -16, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520,
              background: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 24px 80px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}
          >
            {/* Search row */}
            <div className="flex items-center gap-3 px-5"
              style={{ borderBottom: '1.5px solid #f0f0f0', height: 64 }}>
              <Search size={20} color="#FF6B35" strokeWidth={2.2} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, leads, tasks..."
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 16, fontWeight: 500, color: '#111827',
                }}
              />
              <kbd style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace',
                background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb',
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
              {items.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px 16px', color: '#9ca3af', fontSize: 14 }}>
                  No results for "{query}"
                </p>
              ) : (
                items.map((item, idx) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); onClose() }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '10px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: idx === activeIdx ? '#fff5f0' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{
                      width: 36, height: 36, borderRadius: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                      background: idx === activeIdx ? '#FF6B3518' : '#f9fafb',
                    }}>
                      {item.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{item.group}</p>
                    </div>
                    {idx === activeIdx && (
                      <kbd style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 5,
                        background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb',
                      }}>↵</kbd>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              borderTop: '1px solid #f0f0f0', padding: '8px 20px',
              display: 'flex', gap: 16, alignItems: 'center',
            }}>
              {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([key, label]) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <kbd style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>{key}</kbd>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

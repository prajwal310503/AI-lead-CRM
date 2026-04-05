import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, LayoutDashboard, Target, FileText, CheckSquare, CreditCard,
  Lock, Users, Settings, ChevronLeft, ChevronRight, ChevronDown,
  LogOut, Heart, XCircle, BarChart2, PenTool, ScrollText, FolderKanban,
  Bot, DollarSign, Building2, Handshake, Plus, Search, Layers,
  Briefcase, CheckCircle2, MessageCircle
} from 'lucide-react'
import useAuthStore from '../../stores/useAuthStore'
import useSettingsStore from '../../stores/useSettingsStore'

// Navigation group structure
const NAV_GROUPS = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/',
    single: true,
    roles: ['admin','manager','developer','designer'],
  },
  {
    id: 'leads',
    icon: Target,
    label: 'Lead Management',
    roles: ['admin','manager','agency'],
    color: '#FF6B35',
    children: [
      { label: 'Client Hunter',    path: '/leads',           icon: Target },
      { label: 'CRM Pipeline',     path: '/leads/crm',       icon: Layers },
      { label: 'Interested Leads', path: '/leads/interested', icon: Heart },
      { label: 'Converted Clients', path: '/leads/working',    icon: Briefcase },
      { label: 'Closed Clients',   path: '/leads/closed',     icon: CheckCircle2 },
      { label: 'Lost Leads',       path: '/leads/lost',       icon: XCircle },
      { label: 'WhatsApp Chat',    path: '/leads/whatsapp',   icon: MessageCircle },
    ],
  },
  {
    id: 'proposals',
    icon: FileText,
    label: 'Proposals',
    roles: ['admin','manager','agency'],
    color: '#0EA5E9',
    children: [
      { label: 'All Proposals', path: '/proposals', icon: FileText },
    ],
  },
  {
    id: 'agreements',
    icon: ScrollText,
    label: 'Agreements',
    roles: ['admin','manager','agency'],
    color: '#8B5CF6',
    children: [
      { label: 'All Agreements', path: '/agreements', icon: ScrollText },
      { label: 'Pending Signatures', path: '/agreements/pending', icon: PenTool },
      { label: 'Signed', path: '/agreements/signed', icon: CheckSquare },
    ],
  },
  {
    id: 'projects',
    icon: FolderKanban,
    label: 'Projects & Tasks',
    roles: ['admin','manager','developer','designer'],
    color: '#10B981',
    children: [
      { label: 'All Tasks', path: '/tasks', icon: CheckSquare },
    ],
  },
  {
    id: 'finance',
    icon: DollarSign,
    label: 'Finance',
    roles: ['admin','manager','agency'],
    color: '#F59E0B',
    children: [
      { label: 'Invoices & Payments', path: '/payments', icon: CreditCard },
    ],
  },
  {
    id: 'vault',
    icon: Lock,
    label: 'Vault',
    roles: ['admin','manager','developer','designer'],
    color: '#EF4444',
    children: [
      { label: 'All Vault Items', path: '/vault', icon: Lock },
    ],
  },
  {
    id: 'team',
    icon: Users,
    label: 'Team',
    path: '/team',
    single: true,
    roles: ['admin'],
  },
  {
    id: 'ai',
    icon: Bot,
    label: 'AI Assistant',
    path: '/ai',
    single: true,
    roles: ['admin','manager','agency'],
    badge: 'soon',
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Settings',
    path: '/settings',
    single: true,
    roles: ['admin'],
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, logout } = useAuthStore()
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore()
  const role = profile?.role || 'admin'

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sw_open_groups') || '{}') } catch { return {} }
  })

  // Auto-open the group that contains the current path
  useEffect(() => {
    const path = location.pathname
    NAV_GROUPS.forEach((g) => {
      if (!g.single && g.children?.some((c) => path === c.path || path.startsWith(c.path + '/'))) {
        setOpenGroups((prev) => {
          if (!prev[g.id]) {
            const next = { ...prev, [g.id]: true }
            localStorage.setItem('sw_open_groups', JSON.stringify(next))
            return next
          }
          return prev
        })
      }
    })
  }, [location.pathname])

  const toggleGroup = (id) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('sw_open_groups', JSON.stringify(next))
      return next
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const visibleGroups = NAV_GROUPS.filter((g) => g.roles.includes(role))

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-screen sticky top-0 glass z-40 overflow-hidden flex-shrink-0"
      style={{ borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-[60px] flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF9F6B)' }}>
                <Zap size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  Start<span style={{ color: 'var(--orange)' }}>Web</span>
                </span>
                <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>OS</span>
              </div>
            </motion.div>
          ) : (
            <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF9F6B)' }}>
                <Zap size={16} className="text-white" strokeWidth={2.5} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map((group) => {
          if (group.single) {
            return (
              <SingleNavItem
                key={group.id}
                group={group}
                collapsed={sidebarCollapsed}
              />
            )
          }
          return (
            <GroupNavItem
              key={group.id}
              group={group}
              collapsed={sidebarCollapsed}
              open={!!openGroups[group.id]}
              onToggle={() => toggleGroup(group.id)}
              currentPath={location.pathname}
            />
          )
        })}
      </nav>

      {/* Profile */}
      <div className="px-2 pb-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #0EA5E9)' }}>
            {profile?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          {!sidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{profile?.name || 'Admin'}</p>
                <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{profile?.role} · v3.1.0</p>
              </div>
              <button onClick={handleLogout} className="opacity-50 hover:opacity-100 transition-opacity ml-auto" title="Logout">
                <LogOut size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

function SingleNavItem({ group, collapsed }) {
  const isActive = useLocation().pathname === group.path
  return (
    <NavLink
      to={group.path}
      end={group.path === '/'}
      title={collapsed ? group.label : undefined}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5"
      style={({ isActive: a }) => a
        ? { borderLeft: '3px solid var(--orange)', background: 'var(--orange-light)', color: 'var(--orange)', fontWeight: 600 }
        : { color: 'var(--text-secondary)' }
      }
    >
      <group.icon size={18} className="flex-shrink-0" />
      {!collapsed && (
        <span className="text-sm font-medium flex-1">{group.label}</span>
      )}
      {!collapsed && group.badge === 'soon' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Soon</span>
      )}
    </NavLink>
  )
}

function GroupNavItem({ group, collapsed, open, onToggle, currentPath }) {
  const isGroupActive = group.children?.some(
    (c) => currentPath === c.path || currentPath.startsWith(c.path + '/')
  )

  if (collapsed) {
    // Collapsed: just show group icon, clicking goes to first child
    const firstPath = group.children?.[0]?.path || '/'
    return (
      <NavLink
        to={firstPath}
        title={group.label}
        className="flex items-center justify-center px-3 py-2.5 rounded-xl transition-all mb-0.5"
        style={isGroupActive
          ? { background: 'var(--orange-light)', color: 'var(--orange)' }
          : { color: 'var(--text-secondary)' }
        }
      >
        <group.icon size={18} />
      </NavLink>
    )
  }

  return (
    <div className="mb-0.5">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
        style={isGroupActive && !open
          ? { background: 'var(--orange-light)', color: 'var(--orange)', fontWeight: 600 }
          : { color: 'var(--text-secondary)' }
        }
      >
        <group.icon size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{group.label}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </button>

      {/* Children */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2" style={{ borderColor: 'var(--border)' }}>
              {group.children.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  end={child.path === group.children[0]?.path}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm"
                  style={({ isActive }) => isActive
                    ? { background: 'var(--orange-light)', color: 'var(--orange)', fontWeight: 600 }
                    : { color: 'var(--text-secondary)' }
                  }
                >
                  <child.icon size={14} className="flex-shrink-0" />
                  <span className="flex-1">{child.label}</span>
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

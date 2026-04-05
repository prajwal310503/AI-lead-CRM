import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Target, Plus, CheckSquare, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/leads', icon: Target, label: 'Leads' },
  null, // Plus button placeholder
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/proposals', icon: MoreHorizontal, label: 'More' },
]

export default function MobileNav() {
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass flex items-center justify-around px-2 h-16 safe-bottom"
        style={{ borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map((item, i) => {
          if (!item) {
            return (
              <button
                key="plus"
                onClick={() => navigate('/leads')}
                className="w-12 h-12 -mt-6 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                style={{ background: 'var(--orange)', boxShadow: 'var(--shadow-orange)' }}
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
            )
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={({ isActive }) => ({
                color: isActive ? 'var(--orange)' : 'var(--text-muted)',
              })}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}

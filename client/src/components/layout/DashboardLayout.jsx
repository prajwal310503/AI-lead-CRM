import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import NotificationDrawer from './NotificationDrawer'
import useAuthStore from '../../stores/useAuthStore'
import useSettingsStore from '../../stores/useSettingsStore'
import useNotificationStore from '../../stores/useNotificationStore'
import { useTheme } from '../../hooks/useTheme'
import { supabase } from '../../lib/supabase'
import api from '../../lib/api'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { user, profile, initialize } = useAuthStore()
  const { loadFromSupabase } = useSettingsStore()
  const { subscribe, fetch: fetchNotifications } = useNotificationStore()
  const queryClient = useQueryClient()
  useTheme()

  useEffect(() => {
    initialize()
  }, [])

  // Use stable IDs as deps — avoid re-running when initialize() refreshes object references
  const userId = user?.id
  const profileId = profile?.id

  useEffect(() => {
    if (!userId) {
      navigate('/login')
      return
    }
    if (profileId) {
      loadFromSupabase(userId)
      fetchNotifications(userId)
      const unsub = subscribe(userId)
      return unsub
    }
  }, [userId, profileId])

  // Prefetch all main pages' data in parallel as soon as user is confirmed
  // This makes every first-navigation instant (data already in cache)
  useEffect(() => {
    if (!userId) return
    const pf = (key, fn) => queryClient.prefetchQuery({ queryKey: key, queryFn: fn }).catch(() => {})
    pf(['leads',    userId], async () => { const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }); return data || [] })
    pf(['crm-leads',userId], async () => { const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }); return data || [] })
    pf(['proposals',userId], async () => { const { data } = await supabase.from('proposals').select('*, leads(id, business_name, owner_name, email, phone, city, industry, health_score, deal_probability), clients(name)').order('created_at', { ascending: false }); return data || [] })
    pf(['invoices', userId], async () => { const { data } = await supabase.from('invoices').select('*, clients(name, email, phone)').order('created_at', { ascending: false }); return data || [] })
    pf(['tasks',    userId], async () => { const { data } = await supabase.from('tasks').select('*').order('sort_order').order('created_at', { ascending: false }); return data || [] })
    pf(['agreements', ''],   async () => { try { const { data } = await api.get('/api/agreements'); return data } catch { return [] } })
  }, [userId])

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading StartWebOS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ background: 'var(--bg-primary)' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Notification drawer */}
      <NotificationDrawer />

      {/* Toast notifications — top-right */}
      <Toaster
        position="top-right"
        containerStyle={{ top: 16, right: 16 }}
        toastOptions={{
          duration: 3800,
          style: {
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            maxWidth: 340,
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: 'white' },
            style: { borderLeft: '3px solid #10B981' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: 'white' },
            style: { borderLeft: '3px solid #EF4444' },
          },
        }}
      />
    </div>
  )
}

import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  drawerOpen: false,
  loading: false,

  setDrawerOpen: (v) => set({ drawerOpen: v }),

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      set({
        notifications: data,
        unreadCount: data.filter((n) => !n.is_read).length,
        loading: false,
      })
    } else {
      set({ loading: false })
    }
  },

  markAllRead: async (userId) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },

  markRead: async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },

  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + (notification.is_read ? 0 : 1),
    })),

  subscribe: (userId) => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => get().addNotification(payload.new)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}))

export default useNotificationStore

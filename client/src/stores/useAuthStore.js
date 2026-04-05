import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      loading: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setSession: (session) => set({ session }),

      login: async (email, password) => {
        set({ loading: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          // Update last_login
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id)

          set({ user: data.user, session: data.session, profile, loading: false })
          return { success: true, profile }
        } catch (error) {
          set({ loading: false })
          const isNetworkErr = error.name === 'AbortError' || error.message?.includes('fetch') || error.message?.includes('aborted') || error.message?.includes('timed out')
          const msg = isNetworkErr
            ? 'Cannot connect to Supabase. Check your internet or resume the project at app.supabase.com'
            : error.message
          return { success: false, error: msg }
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, session: null })
      },

      refreshProfile: async () => {
        const { user } = get()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) set({ profile: data })
      },

      initialize: async () => {
        set({ loading: true })
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          set({ user: session.user, session, profile, loading: false })
        } else {
          set({ loading: false })
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
            // Always sync the latest session (including refreshed tokens) to Zustand
            set({ user: session.user, session })
            if (event === 'SIGNED_IN') {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              set({ profile })
            }
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, session: null, profile: null })
          }
        })
      },

      isAdmin: () => get().profile?.role === 'admin',
      isManager: () => ['admin', 'manager'].includes(get().profile?.role),
      canAccessModule: (module) => {
        const role = get().profile?.role
        const permissions = {
          dashboard: ['admin'],
          leads: ['admin', 'manager', 'agency'],
          proposals: ['admin', 'manager', 'agency'],
          tasks: ['admin', 'manager', 'developer', 'designer'],
          payments: ['admin', 'manager', 'agency'],
          vault: ['admin', 'manager', 'developer', 'designer'],
          team: ['admin'],
          settings: ['admin'],
          portal: ['client'],
        }
        return permissions[module]?.includes(role) || false
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
      }),
    }
  )
)

export default useAuthStore

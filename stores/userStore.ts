// userStore.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  phone?: string
  company?: string
  job_title?: string
  bio?: string
  website?: string
  created_at: string
  updated_at?: string
}

interface UserState {
  user: User | null
  profile: UserProfile | null
  access_token: string | null   // ✅ add this
  loading: boolean
  error: string | null
  initialized: boolean

  setUser: (user: User | null, token?: string | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  loadProfile: (userId: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  refreshProfile: () => Promise<void>
  initialize: () => void
  reset: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  access_token: null,   // ✅ new
  loading: false,
  error: null,
  initialized: false,

  setUser: (user, token = null) => set({ user, access_token: token }),

  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  loadProfile: async (userId: string) => {
    const { profile } = get()
    if (profile && profile.id === userId) return

    try {
      set({ loading: true, error: null })
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        // If profile doesn't exist, try to create one
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating default profile for user:', userId)
          
          // Get user info from auth
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            const defaultProfile = {
              id: userId,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              avatar_url: user.user_metadata?.avatar_url || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(defaultProfile)
              .select()
              .single()

            if (createError) {
              console.error('Error creating profile:', createError)
              set({ error: 'Failed to create profile', loading: false })
              return
            }

            set({ profile: newProfile, loading: false })
            return
          }
        }
        
        console.error('Error loading profile:', profileError)
        set({ error: null, loading: false }) // Don't show error for missing profile
        return
      }

      set({ profile: profileData, loading: false })
    } catch (error) {
      console.error('Error in loadProfile:', error)
      set({ error: null, loading: false }) // Don't show error, just log it
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { profile } = get()
    if (!profile) {
      set({ error: 'No profile to update' })
      return
    }

    try {
      const updatedData = { ...updates, updated_at: new Date().toISOString() }
      const { error } = await supabase.from('profiles').update(updatedData).eq('id', profile.id)
      if (error) throw error
      set({ profile: { ...profile, ...updatedData } })
    } catch (error) {
      console.error('Error updating profile:', error)
      set({ error: 'Failed to update profile' })
      throw error
    }
  },

  refreshProfile: async () => {
    const { user } = get()
    if (user) {
      set({ profile: null })
      await get().loadProfile(user.id)
    }
  },

  initialize: () => {
    if (get().initialized) return
    set({ initialized: true })

    if (typeof window === 'undefined') return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ user: session.user, access_token: session.access_token }) // ✅ save token
        get().loadProfile(session.user.id)
      }
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ user: session.user, access_token: session.access_token }) // ✅ save token
        get().loadProfile(session.user.id)
      } else {
        set({ user: null, profile: null, access_token: null })
      }
    })
  },

  reset: () =>
    set({
      user: null,
      profile: null,
      access_token: null, // ✅ reset too
      loading: false,
      error: null,
      initialized: false,
    }),
}))

if (typeof window !== 'undefined') {
  useUserStore.getState().initialize()
}

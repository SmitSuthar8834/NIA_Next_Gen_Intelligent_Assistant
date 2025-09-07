import { useUserStore } from '@/stores/userStore'
import { useMemo } from 'react'

// Lightweight hook for components that only need user data
export const useUser = () => {
  const user = useUserStore((state) => state.user)
  const loading = useUserStore((state) => state.loading)
  const initialized = useUserStore((state) => state.initialized)
  const access_token = useUserStore((state) => state.access_token)
  
  return useMemo(() => ({
    user,
    loading,
    initialized,
    access_token
  }), [user, loading, initialized, access_token])
}

// Hook for components that need profile data
export const useProfile = () => {
  const profile = useUserStore((state) => state.profile)
  const loading = useUserStore((state) => state.loading)
  const updateProfile = useUserStore((state) => state.updateProfile)
  const refreshProfile = useUserStore((state) => state.refreshProfile)
  const error = useUserStore((state) => state.error)
  
  return useMemo(() => ({
    profile,
    loading,
    updateProfile,
    refreshProfile,
    error
  }), [profile, loading, updateProfile, refreshProfile, error])
}

// Hook for components that need full user state
export const useFullUser = () => {
  return useUserStore()
}
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth, User } from '../lib/api'

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { access_token } = await auth.login({ email, password })
          set({ token: access_token })
          await get().loadUser()
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
          throw error
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null })
        try {
          const { access_token } = await auth.register({ email, password, name })
          set({ token: access_token })
          await get().loadUser()
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({ token: null, user: null, error: null })
      },

      loadUser: async () => {
        const { token } = get()
        if (!token) {
          set({ isLoading: false })
          return
        }

        set({ isLoading: true })
        try {
          const user = await auth.me(token)
          set({ user, isLoading: false })
        } catch (error) {
          set({ token: null, user: null, isLoading: false })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)

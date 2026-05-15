import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { AUTH_TOKEN_KEY } from '@/api/client'

interface User {
  id: string
  email: string
  username: string
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token)
    await SecureStore.setItemAsync('chatbot_user', JSON.stringify(user))
    set({ token, user })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)
    await SecureStore.deleteItemAsync('chatbot_user')
    set({ token: null, user: null })
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY)
    const userRaw = await SecureStore.getItemAsync('chatbot_user')
    if (token && userRaw) {
      set({ token, user: JSON.parse(userRaw) })
    }
  },
}))

import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('access_token') || null,
  user: null,

  login: (token) => {
    localStorage.setItem('access_token', token)
    set({ token })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ token: null, user: null })
  },
}))

export default useAuthStore

import { create } from 'zustand'

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

const useAuthStore = create((set) => ({
  token: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  user: decodeToken(localStorage.getItem('access_token') || ''),

  login: (token, refreshToken) => {
    localStorage.setItem('access_token', token)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
    set({ token, refreshToken: refreshToken || localStorage.getItem('refresh_token'), user: decodeToken(token) })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ token: null, refreshToken: null, user: null })
  },
}))

export default useAuthStore

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token)
      navigate('/projects')
    } catch {
      setError('Email 或密碼錯誤')
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
      <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: 40, borderRadius: 12, width: 360, color: '#f1f5f9' }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>睿程生醫 · 登入</h2>
        {error && <p style={{ color: '#f87171', marginBottom: 16 }}>{error}</p>}
        <label style={{ display: 'block', marginBottom: 8 }}>Email</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', marginBottom: 16, boxSizing: 'border-box' }}
        />
        <label style={{ display: 'block', marginBottom: 8 }}>密碼</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', marginBottom: 24, boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          style={{ width: '100%', padding: '10px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          登入
        </button>
      </form>
    </div>
  )
}

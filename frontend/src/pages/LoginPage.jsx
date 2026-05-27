import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.refresh_token)
      navigate('/projects')
    } catch {
      setError('Email 或密碼錯誤')
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-panel">
        <div className="login-brand">
          <span className="ops-brand-mark">睿</span>
          <div>
            <strong>睿程生醫</strong>
            <span>醫材追溯系統</span>
          </div>
        </div>
        <h1>登入</h1>
        {error && <p className="login-error">{error}</p>}
        <label>Email</label>
        <input
          type="text"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label>密碼</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="ops-primary">
          登入
        </button>
        <Link className="login-guide-link" to="/guide">第一次使用？打開新手導覽</Link>
      </form>
    </div>
  )
}

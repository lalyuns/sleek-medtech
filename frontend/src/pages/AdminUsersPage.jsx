import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const emptyForm = { name: '', email: '', password: '', role: 'engineer' }
const ROLE_LABELS = { engineer: '工程師', doctor: '醫師', vendor: '廠商', admin: '系統管理員' }

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    api.get('/users/').then((response) => setUsers(response.data)).catch(() => setUsers([]))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (event) => {
    event.preventDefault()
    await api.post('/users/', form)
    setForm(emptyForm)
    load()
  }

  const remove = async (userId) => {
    await api.delete(`/users/${userId}`)
    load()
  }

  return (
    <div style={{ padding: 32, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/projects')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>返回</button>
        <h1>使用者管理</h1>
      </div>

      <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr 1fr auto', gap: 10, marginBottom: 24 }}>
        <input required placeholder="姓名" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} style={fieldStyle} />
        <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} style={fieldStyle} />
        <input required type="password" placeholder="密碼" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} style={fieldStyle} />
        <select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))} style={fieldStyle}>
          <option value="engineer">工程師</option>
          <option value="doctor">醫師</option>
          <option value="vendor">廠商</option>
          <option value="admin">系統管理員</option>
        </select>
        <button style={buttonStyle}>建立</button>
      </form>

      <div style={{ display: 'grid', gap: 10 }}>
        {users.map((user) => (
          <div key={user.user_id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr auto', gap: 10, alignItems: 'center', background: '#1e293b', padding: 14, borderRadius: 8 }}>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span style={{ color: '#94a3b8' }}>{ROLE_LABELS[user.role] || user.role}</span>
            <button onClick={() => remove(user.user_id)} style={{ ...buttonStyle, background: '#991b1b' }}>刪除</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const fieldStyle = { padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }
const buttonStyle = { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }

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
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 使用者管理</span>
        </div>
        <nav className="ops-nav">
          <button onClick={() => navigate('/projects')}>專案列表</button>
        </nav>
      </header>

      <main className="ops-main">
        <section className="ops-title-row">
          <h1>使用者管理</h1>
          <p>建立內部帳號並指定全站角色；專案權限仍由專案成員頁控制。</p>
        </section>

        <form onSubmit={create} className="ops-panel admin-inline-form users">
          <input required placeholder="姓名" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} />
          <input required type="password" placeholder="密碼" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} />
          <select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>
            <option value="engineer">工程師</option>
            <option value="doctor">醫師</option>
            <option value="vendor">廠商</option>
            <option value="admin">系統管理員</option>
          </select>
          <button className="ops-primary">建立</button>
        </form>

        <section className="ops-table-panel">
          <div className="ops-section-heading">
            <h2>使用者清單</h2>
            <span>{users.length} 筆</span>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>Email</th>
                  <th>角色</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{ROLE_LABELS[user.role] || user.role}</td>
                    <td><button onClick={() => remove(user.user_id)} className="ops-danger">刪除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

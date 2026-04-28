import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/projects/').then((r) => setProjects(r.data))
  }, [])

  const createProject = async (e) => {
    e.preventDefault()
    const { data } = await api.post('/projects/', { name })
    setProjects((p) => [...p, data])
    setName('')
  }

  return (
    <div style={{ padding: 32, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1>專案列表</h1>
        <button onClick={logout} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>登出</button>
      </div>

      <form onSubmit={createProject} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="新專案名稱"
          required
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }}
        />
        <button type="submit" style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>建立</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {projects.map((p) => (
          <div
            key={p.project_id}
            onClick={() => navigate(`/projects/${p.project_id}`)}
            style={{ background: '#1e293b', borderRadius: 10, padding: 20, cursor: 'pointer', border: '1px solid #334155' }}
          >
            <h3 style={{ marginBottom: 8 }}>{p.name}</h3>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

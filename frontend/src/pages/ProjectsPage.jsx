import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

const panelStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
}

function formatStatus(status) {
  const labels = { active: '啟用中', archived: '已封存', draft: '草稿', locked: '已鎖定', uploading: '上傳中' }
  return status ? (labels[status] || status.replace('_', ' ')) : '無'
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [projectMeta, setProjectMeta] = useState({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/projects/')
      .then(async (response) => {
        const items = response.data
        setProjects(items)

        const versionRows = await Promise.all(
          items.map((project) => (
            api.get(`/projects/${project.project_id}/versions`)
              .then((versionsResponse) => [project.project_id, versionsResponse.data])
              .catch(() => [project.project_id, []])
          )),
        )

        setProjectMeta(Object.fromEntries(versionRows))
      })
      .finally(() => setLoading(false))
  }, [])

  const dashboard = useMemo(() => {
    const versionLists = Object.values(projectMeta)
    const allVersions = versionLists.flat()
    return {
      projectCount: projects.length,
      versionCount: allVersions.length,
      lockedCount: allVersions.filter((version) => version.status === 'locked').length,
      activeCount: projects.filter((project) => project.status === 'active').length,
    }
  }, [projectMeta, projects])

  const createProject = async (event) => {
    event.preventDefault()
    const { data } = await api.post('/projects/', { name, description: description || null })
    setProjects((items) => [...items, data])
    setProjectMeta((items) => ({ ...items, [data.project_id]: [] }))
    setName('')
    setDescription('')
  }

  return (
    <div style={{ padding: 32, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1 }}>專案</h1>
          <p style={{ margin: '10px 0 0', color: '#94a3b8', maxWidth: 720 }}>
            管理 STL 版本、材料證據、醫師回饋、BOM 成本與稽核紀錄的受控工作區。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {user?.role === 'admin' && <button onClick={() => navigate('/admin/materials')} style={navButtonStyle}>材料</button>}
          {user?.role === 'admin' && <button onClick={() => navigate('/admin/users')} style={navButtonStyle}>使用者</button>}
          {user?.role === 'admin' && <button onClick={() => navigate('/admin/audit')} style={navButtonStyle}>稽核</button>}
          <button onClick={logout} style={{ ...navButtonStyle, background: '#475569' }}>登出</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <MetricCard label="專案數" value={dashboard.projectCount} accent="#38bdf8" />
        <MetricCard label="啟用中" value={dashboard.activeCount} accent="#22c55e" />
        <MetricCard label="版本數" value={dashboard.versionCount} accent="#818cf8" />
        <MetricCard label="已鎖定" value={dashboard.lockedCount} accent="#34d399" />
      </div>

      <form onSubmit={createProject} style={{ ...panelStyle, display: 'grid', gridTemplateColumns: '1.1fr 1.7fr auto', gap: 12, padding: 14, marginBottom: 24 }}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="新專案名稱"
          required
          style={inputStyle}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="描述或合規情境"
          style={inputStyle}
        />
        <button type="submit" style={{ padding: '10px 22px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
          建立
        </button>
      </form>

      {loading ? (
        <div style={{ ...panelStyle, padding: 24, color: '#94a3b8' }}>正在載入專案...</div>
      ) : projects.length === 0 ? (
        <div style={{ ...panelStyle, padding: 28, color: '#94a3b8' }}>
          目前沒有專案，請先建立第一個受控工作區。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
          {projects.map((project) => {
            const versions = projectMeta[project.project_id] || []
            const latest = versions[versions.length - 1]
            return (
              <button
                key={project.project_id}
                onClick={() => navigate(`/projects/${project.project_id}`)}
                style={{
                  ...panelStyle,
                  padding: 20,
                  cursor: 'pointer',
                  color: '#f8fafc',
                  textAlign: 'left',
                  minHeight: 170,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22 }}>{project.name}</h3>
                    <p style={{ margin: '8px 0 0', minHeight: 38, color: '#94a3b8', fontSize: 13 }}>
                      {project.description || '尚無描述'}
                    </p>
                  </div>
                  <span style={{ border: '1px solid #334155', borderRadius: 999, padding: '3px 9px', color: '#bae6fd', fontSize: 12 }}>
                    {project.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                  <CardDatum label="版本數" value={versions.length} />
                  <CardDatum label="最新版" value={latest ? `v${latest.version_number}` : '無'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px solid #334155', color: '#cbd5e1', fontSize: 13 }}>
                  <span>最新狀態</span>
                  <strong style={{ color: latest?.status === 'locked' ? '#34d399' : '#f8fafc' }}>
                    {formatStatus(latest?.status)}
                  </strong>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent }) {
  return (
    <div style={{ ...panelStyle, padding: 18 }}>
      <div style={{ color: '#94a3b8', fontSize: 13 }}>{label}</div>
      <div style={{ color: accent, fontSize: 30, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function CardDatum({ label, value }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: 10 }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 17, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  )
}

const navButtonStyle = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  background: '#334155',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
}

const inputStyle = {
  minWidth: 0,
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#f1f5f9',
}

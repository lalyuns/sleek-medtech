import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

const PROJECT_STATUS_LABELS = { active: '追蹤中', archived: '已封存' }
const VERSION_STATUS_LABELS = { draft: '待簽核', locked: '已完成', uploading: '上傳中' }

function formatStatus(status, labels = VERSION_STATUS_LABELS) {
  if (!status) return '無版本'
  return labels[status] || status.replace('_', ' ')
}

function statusTone(status) {
  if (status === 'locked') return 'success'
  if (status === 'uploading') return 'info'
  if (status === 'draft') return 'warning'
  if (status === 'archived') return 'muted'
  return 'info'
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [products, setProducts] = useState([])
  const [projectMeta, setProjectMeta] = useState({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [productId, setProductId] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [versionFilter, setVersionFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/projects/'),
      api.get('/products').catch(() => ({ data: [] })),
    ])
      .then(async (response) => {
        const [projectsResponse, productsResponse] = response
        const items = projectsResponse.data
        setProjects(items)
        setProducts(productsResponse.data)

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

  const productById = useMemo(() => (
    Object.fromEntries(products.map((product) => [String(product.product_id), product]))
  ), [products])

  const rows = useMemo(() => projects.map((project) => {
    const versions = projectMeta[project.project_id] || []
    const latest = versions[versions.length - 1]
    return { project, versions, latest }
  }), [projectMeta, projects])

  const dashboard = useMemo(() => {
    const allVersions = rows.flatMap((row) => row.versions)
    return {
      projectCount: rows.length,
      pendingCount: allVersions.filter((version) => version.status === 'draft').length,
      activeCount: rows.filter((row) => row.project.status === 'active').length,
      lockedCount: allVersions.filter((version) => version.status === 'locked').length,
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return rows.filter(({ project, latest }) => {
      const matchesQuery = !normalizedQuery || [project.name, project.description, latest?.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      const matchesProjectStatus = statusFilter === 'all' || project.status === statusFilter
      const matchesVersionStatus = versionFilter === 'all' || latest?.status === versionFilter
      return matchesQuery && matchesProjectStatus && matchesVersionStatus
    })
  }, [query, rows, statusFilter, versionFilter])

  const createProject = async (event) => {
    event.preventDefault()
    const { data } = await api.post('/projects/', {
      name,
      description: description || null,
      product_id: productId ? Number(productId) : null,
    })
    setProjects((items) => [...items, data])
    setProjectMeta((items) => ({ ...items, [data.project_id]: [] }))
    setName('')
    setDescription('')
    setProductId('')
  }

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('all')
    setVersionFilter('all')
  }

  return (
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 醫材追溯系統</span>
        </div>
        <nav className="ops-nav">
          {user?.role === 'admin' && <button onClick={() => navigate('/admin/materials')}>材料</button>}
          {user?.role === 'admin' && <button onClick={() => navigate('/product-admin')}>產品</button>}
          {user?.role === 'admin' && <button onClick={() => navigate('/admin/users')}>使用者</button>}
          {user?.role === 'admin' && <button onClick={() => navigate('/admin/audit')}>稽核</button>}
          <button onClick={logout}>登出</button>
        </nav>
      </header>

      <main className="ops-main">
        <section className="ops-title-row">
          <div>
            <h1>專案管理</h1>
            <p>STL 版本、材料證據、醫師回饋、BOM 與稽核紀錄的工作台。</p>
          </div>
        </section>

        <section className="ops-metrics" aria-label="專案統計">
          <MetricCard label="總專案數" value={dashboard.projectCount} tone="purple" />
          <MetricCard label="待簽核" value={dashboard.pendingCount} tone="amber" />
          <MetricCard label="追蹤中" value={dashboard.activeCount} tone="blue" />
          <MetricCard label="已完成" value={dashboard.lockedCount} tone="green" />
        </section>

        <section className="ops-panel">
          <form className="ops-create-row" onSubmit={createProject}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="新專案名稱" required />
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="描述或合規情境" />
            <select value={productId} onChange={(event) => setProductId(event.target.value)} aria-label="產品套組">
              <option value="">不連結產品套組</option>
              {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}
            </select>
            <button type="submit" className="ops-primary">新增專案</button>
          </form>

          <div className="ops-filter-row">
            <div className="ops-search">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋專案名稱、版本說明或醫材情境..." />
              <button type="button" aria-label="搜尋">查詢</button>
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">所有專案</option>
              <option value="active">追蹤中</option>
              <option value="archived">已封存</option>
            </select>
            <select value={versionFilter} onChange={(event) => setVersionFilter(event.target.value)}>
              <option value="all">所有版本狀態</option>
              <option value="draft">待簽核</option>
              <option value="uploading">上傳中</option>
              <option value="locked">已完成</option>
            </select>
            <button type="button" className="ops-secondary" onClick={clearFilters}>清除篩選</button>
          </div>
        </section>

        <section className="ops-table-panel">
          <div className="ops-section-heading">
            <h2>醫材專案追溯列表</h2>
            <span>{filteredRows.length} 筆</span>
          </div>

          {loading ? (
            <div className="ops-empty">正在載入專案...</div>
          ) : filteredRows.length === 0 ? (
            <div className="ops-empty">沒有符合條件的專案。</div>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>專案名稱</th>
                    <th>產品套組</th>
                    <th>專案狀態</th>
                    <th>最新版本</th>
                    <th>版本狀態</th>
                    <th>版本數</th>
                    <th>最後更新</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ project, versions, latest }) => (
                    <tr key={project.project_id}>
                      <td>
                        <button className="ops-link-button" onClick={() => navigate(`/projects/${project.project_id}`)}>
                          {project.name}
                        </button>
                        <div className="ops-muted">{project.description || '尚無描述'}</div>
                      </td>
                      <td>{project.product_id ? productById[String(project.product_id)]?.name || `#${project.product_id}` : '未連結'}</td>
                      <td><StatusPill tone={statusTone(project.status)}>{formatStatus(project.status, PROJECT_STATUS_LABELS)}</StatusPill></td>
                      <td>{latest ? `v${latest.version_number}` : '無'}</td>
                      <td><StatusPill tone={statusTone(latest?.status)}>{formatStatus(latest?.status)}</StatusPill></td>
                      <td>{versions.length}</td>
                      <td>{latest?.timestamp ? new Date(latest.timestamp).toLocaleDateString() : '未記錄'}</td>
                      <td>
                        <button className="ops-row-action" onClick={() => navigate(`/projects/${project.project_id}`)}>查看詳情</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function MetricCard({ label, value, tone }) {
  return (
    <div className={`ops-metric ${tone}`}>
      <div className="ops-metric-icon">{label.slice(0, 1)}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function StatusPill({ tone, children }) {
  return <span className={`ops-status ${tone}`}>{children}</span>
}

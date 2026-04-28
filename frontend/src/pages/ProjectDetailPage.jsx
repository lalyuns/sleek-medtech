import { useParams, useNavigate } from 'react-router-dom'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div style={{ padding: 32, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <button onClick={() => navigate('/projects')} style={{ marginBottom: 24, padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>← 返回</button>
      <h1 style={{ marginBottom: 24 }}>專案 #{id}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          3D 檢視器（Step 12 實作）
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20 }}>
            <h3 style={{ marginBottom: 12 }}>BOM 成本</h3>
            <p style={{ color: '#64748b' }}>（Step 14 實作）</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, flex: 1 }}>
            <h3 style={{ marginBottom: 12 }}>回饋意見</h3>
            <p style={{ color: '#64748b' }}>（Step 14 實作）</p>
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate(`/projects/${id}/traceability`)}
        style={{ marginTop: 24, padding: '8px 20px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer' }}
      >
        查看溯源圖
      </button>
    </div>
  )
}

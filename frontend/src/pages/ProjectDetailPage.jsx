import { useParams, useNavigate } from 'react-router-dom'
import ModelViewer from '../components/viewer/ModelViewer'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigate('/projects')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>← 返回</button>
        <h1>專案 #{id}</h1>
        <button onClick={() => navigate(`/projects/${id}/traceability`)} style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer' }}>溯源圖</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, height: 'calc(100vh - 120px)' }}>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
          <ModelViewer fileUrl={null} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, flex: 1 }}>
            <h3 style={{ marginBottom: 12 }}>BOM 成本</h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>（Step 14 實作）</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, flex: 1 }}>
            <h3 style={{ marginBottom: 12 }}>回饋意見</h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>（Step 14 實作）</p>
          </div>
        </div>
      </div>
    </div>
  )
}

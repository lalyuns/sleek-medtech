import { useParams, useNavigate } from 'react-router-dom'

export default function TraceabilityPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div style={{ padding: 32, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <button onClick={() => navigate(`/projects/${id}`)} style={{ marginBottom: 24, padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>← 返回</button>
      <h1>溯源圖 — 專案 #{id}</h1>
      <div style={{ marginTop: 24, background: '#1e293b', borderRadius: 10, padding: 20, minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        React Flow 溯源圖（Step 13 實作）
      </div>
    </div>
  )
}

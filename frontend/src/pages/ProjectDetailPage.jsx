import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ModelViewer from '../components/viewer/ModelViewer'
import api from '../api/client'

const STATUS_COLOR = { draft: '#3b82f6', locked: '#22c55e', uploading: '#f59e0b' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [versions, setVersions] = useState([])
  const [activeVersion, setActiveVersion] = useState(null)

  useEffect(() => {
    api.get(`/projects/${id}/versions`).then((r) => {
      setVersions(r.data)
      if (r.data.length > 0) setActiveVersion(r.data[r.data.length - 1])
    })
  }, [id])

  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigate('/projects')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>← 返回</button>
        <h1>專案 #{id}</h1>
        <button onClick={() => navigate(`/projects/${id}/traceability`)} style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer' }}>溯源圖</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 280px', gap: 16, height: 'calc(100vh - 120px)' }}>
        {/* Version list */}
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 16, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, fontWeight: 600 }}>版本歷史</div>
          {versions.length === 0
            ? <p style={{ color: '#475569', fontSize: 12 }}>尚無版本</p>
            : versions.map((v) => (
              <div
                key={v.version_id}
                onClick={() => setActiveVersion(v)}
                style={{
                  padding: '8px 10px', borderRadius: 6, marginBottom: 6, cursor: 'pointer',
                  background: activeVersion?.version_id === v.version_id ? '#1d4ed8' : '#0f172a',
                  border: `1px solid ${STATUS_COLOR[v.status] || '#334155'}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>v{v.version_number}</div>
                <div style={{ fontSize: 11, color: STATUS_COLOR[v.status] }}>{v.status}</div>
              </div>
            ))
          }
        </div>

        {/* 3D viewer */}
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
          <ModelViewer fileUrl={activeVersion?.file_url || null} />
        </div>

        {/* Side panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, flex: 1 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>BOM 成本</h3>
            <p style={{ color: '#64748b', fontSize: 13 }}>（Step 14 實作）</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, flex: 1, overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>回饋意見</h3>
            <p style={{ color: '#64748b', fontSize: 13 }}>（Step 14 實作）</p>
          </div>
        </div>
      </div>
    </div>
  )
}

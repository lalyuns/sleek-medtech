import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ModelViewer from '../components/viewer/ModelViewer'
import BOMPanel from '../components/BOMPanel'
import FeedbackPanel from '../components/FeedbackPanel'
import api from '../api/client'

const STATUS_COLOR = { draft: '#3b82f6', locked: '#22c55e', uploading: '#f59e0b' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [versions, setVersions] = useState([])
  const [activeVersion, setActiveVersion] = useState(null)
  const [locking, setLocking] = useState(false)
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newVersionForm, setNewVersionForm] = useState({ material_id: '', description: '' })

  useEffect(() => {
    api.get(`/projects/${id}/versions`).then((r) => {
      setVersions(r.data)
      if (r.data.length > 0) setActiveVersion(r.data[r.data.length - 1])
    })
  }, [id])

  const createVersion = async (e) => {
    e.preventDefault()
    try {
      const { data } = await api.post(`/projects/${id}/versions`, {
        material_id: parseInt(newVersionForm.material_id),
        description: newVersionForm.description,
        file_url: 'placeholder',
        hash_value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })
      setVersions((vs) => [...vs, data])
      setActiveVersion(data)
      setShowNewVersion(false)
      setNewVersionForm({ material_id: '', description: '' })
    } catch (e) {
      alert(e.response?.data?.detail || '建立失敗，請確認 material_id 存在')
    }
  }

  const lockVersion = async () => {
    if (!activeVersion || activeVersion.status === 'locked') return
    setLocking(true)
    try {
      const { data } = await api.post(`/projects/${id}/versions/${activeVersion.version_id}/lock`)
      setActiveVersion(data)
      setVersions((vs) => vs.map((v) => v.version_id === data.version_id ? data : v))
    } catch (e) {
      alert(e.response?.data?.detail || '簽核失敗')
    } finally {
      setLocking(false)
    }
  }

  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigate('/projects')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>← 返回</button>
        <h1>專案 #{id}</h1>
        {activeVersion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
            <span style={{ fontSize: 12, color: STATUS_COLOR[activeVersion.status], border: `1px solid ${STATUS_COLOR[activeVersion.status]}`, borderRadius: 4, padding: '2px 8px' }}>
              v{activeVersion.version_number} · {activeVersion.status}
            </span>
            {activeVersion.status !== 'locked' && (
              <button
                onClick={lockVersion} disabled={locking}
                style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                {locking ? '簽核中...' : '✓ 簽核鎖定'}
              </button>
            )}
          </div>
        )}
        <button onClick={() => navigate(`/projects/${id}/traceability`)} style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer' }}>溯源圖</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 280px', gap: 16, height: 'calc(100vh - 120px)' }}>
        {/* Version sidebar */}
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>版本歷史</span>
            <button onClick={() => setShowNewVersion((s) => !s)} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer' }}>+</button>
          </div>
          {showNewVersion && (
            <form onSubmit={createVersion} style={{ marginBottom: 12 }}>
              <input
                type="number" required placeholder="Material ID"
                value={newVersionForm.material_id}
                onChange={(e) => setNewVersionForm((f) => ({ ...f, material_id: e.target.value }))}
                style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 11, marginBottom: 6, boxSizing: 'border-box' }}
              />
              <input
                placeholder="描述 (選填)"
                value={newVersionForm.description}
                onChange={(e) => setNewVersionForm((f) => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 11, marginBottom: 6, boxSizing: 'border-box' }}
              />
              <button type="submit" style={{ width: '100%', padding: '4px', borderRadius: 4, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 11, cursor: 'pointer' }}>建立版本</button>
            </form>
          )}
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
          <ModelViewer fileUrl={activeVersion?.file_url?.startsWith('http') ? activeVersion.file_url : null} />
        </div>

        {/* BOM + Feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>BOM 成本</h3>
            <BOMPanel projectId={id} versionId={activeVersion?.version_id} />
          </div>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 16, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>回饋意見</h3>
            <FeedbackPanel projectId={id} versionId={activeVersion?.version_id} />
          </div>
        </div>
      </div>
    </div>
  )
}

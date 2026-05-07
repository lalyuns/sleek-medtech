import { useNavigate } from 'react-router-dom'
import AuditPanel from '../components/AuditPanel'

export default function AdminAuditPage() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: 32, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/projects')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>返回</button>
        <h1>稽核紀錄</h1>
      </div>
      <AuditPanel />
    </div>
  )
}

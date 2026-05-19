import { useNavigate } from 'react-router-dom'
import AuditPanel from '../components/AuditPanel'

export default function AdminAuditPage() {
  const navigate = useNavigate()

  return (
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 稽核紀錄</span>
        </div>
        <nav className="ops-nav">
          <button onClick={() => navigate('/projects')}>專案列表</button>
        </nav>
      </header>

      <main className="ops-main">
        <section className="ops-title-row">
          <h1>稽核紀錄</h1>
          <p>查詢建立、更新、刪除、上傳與簽核的操作紀錄。</p>
        </section>
        <section className="ops-panel">
          <AuditPanel />
        </section>
      </main>
    </div>
  )
}

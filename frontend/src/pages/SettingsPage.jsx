import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const SETTINGS_GROUPS = [
  {
    title: '帳號與權限',
    description: '管理全站帳號；專案內權限仍在專案成員頁調整。',
    items: [
      { label: '使用者管理', path: '/admin/users', detail: '新增帳號、角色與停用帳號。' },
    ],
  },
  {
    title: '工程主檔',
    description: '這些資料支撐模型上傳、材料估算與 BOM，但不放在日常工作台第一眼。',
    items: [
      { label: '材料主檔', path: '/admin/materials', detail: '維護密度、強度與材料單價。' },
      { label: '產品與組件', path: '/product-admin', detail: '維護產品型錄、組件、BOM 與外部申請。' },
    ],
  },
  {
    title: '治理與追溯',
    description: '提供需要查核時使用的紀錄入口。',
    items: [
      { label: '稽核紀錄', path: '/admin/audit', detail: '查詢建立、更新、刪除、上傳與簽核紀錄。' },
    ],
  },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  return (
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 系統設定</span>
        </div>
        <nav className="ops-nav">
          <button onClick={() => navigate('/projects')}>專案列表</button>
          <button onClick={logout}>登出</button>
        </nav>
      </header>

      <main className="ops-main">
        <section className="ops-title-row">
          <h1>系統設定</h1>
          <p>把管理員才需要的主檔、權限與稽核入口收在這裡，日常使用者先回到專案工作台。</p>
        </section>

        <div className="settings-grid">
          {SETTINGS_GROUPS.map((group) => (
            <section className="ops-panel settings-card" key={group.title}>
              <h2>{group.title}</h2>
              <p>{group.description}</p>
              <div className="settings-links">
                {group.items.map((item) => (
                  <button type="button" key={item.path} onClick={() => navigate(item.path)}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const ROLE_GUIDES = {
  admin: {
    label: '管理員交接',
    route: '/projects',
    goal: '掌握公司所有專案、產品、使用者與稽核紀錄。',
    steps: [
      '先看專案儀表板，確認待簽核、追蹤中與已完成的數量。',
      '進入產品管理，檢查產品套組、組件來源、BOM 與外部申請。',
      '到使用者與稽核頁，確認新同仁權限與近期操作紀錄。',
    ],
    ai: 'AI 可以把待簽核版本、缺少報告、外部申請與稽核風險整理成每日交接摘要。',
  },
  engineer: {
    label: '研發工程師',
    route: '/projects',
    goal: '把 STL、材料、報告、成本與版本修改原因整理在同一條鏈上。',
    steps: [
      '進入被授權專案，先看總覽確認目前版本與缺少文件。',
      '在上傳分頁選材料與 STL，讓系統自動建立 hash、體積與版本紀錄。',
      '在 BOM 與報告分頁補上工時、打樣費、材料測試或供應商文件。',
    ],
    ai: 'AI 可以依醫師回饋產生新版修改清單，並提醒哪些材料或合規文件尚未補齊。',
  },
  doctor: {
    label: '醫師審閱',
    route: '/projects',
    goal: '快速檢查模型，留下臨床回饋，必要時完成簽核。',
    steps: [
      '進入專案後打開 3D 檢視，旋轉或剖面檢查目前模型。',
      '針對問題位置留下文字回饋或座標 pin。',
      '確認版本可用後填寫簽核理由與密碼，系統會鎖定版本並留下紀錄。',
    ],
    ai: 'AI 可以把醫師回饋翻成工程師可執行的待辦，並產生簽核前檢查摘要。',
  },
  sales: {
    label: '業務與對外窗口',
    route: '/catalog',
    goal: '不用專責業務也能讓外部訪客看懂產品並留下需求。',
    steps: [
      '打開公開型錄，依部位、用途或適應症查找產品。',
      '確認產品組件、文件需求與使用情境。',
      '送出需求申請後，由內部在產品管理頁追蹤報價與審核狀態。',
    ],
    ai: 'AI 可以擔任產品問答助理，協助投資人、醫師與病患理解產品差異並留下商機。',
  },
}

const QUICK_ACTIONS = [
  { label: '看公開型錄', href: '/catalog', note: '給投資人、醫師、醫院或病患看的第一入口。' },
  { label: '登入內部系統', href: '/login', note: '用 demo 帳號進入專案、產品與稽核管理。' },
  { label: '管理專案', href: '/projects', note: '追蹤 STL 版本、回饋、報告、BOM 與簽核。' },
  { label: '管理產品', href: '/product-admin', note: '維護產品套組、組件、BOM 與外部需求。' },
]

const AI_CHECKLIST = [
  '今日最需要處理的專案',
  '缺少材料、檢驗或合規報告的版本',
  '外部申請中最有商業價值的需求',
  '醫師回饋轉換成工程待辦',
  '可交給新同仁的下一步操作',
]

export default function OnboardingGuidePage() {
  const [role, setRole] = useState('admin')
  const guide = ROLE_GUIDES[role]
  const aiPrompt = useMemo(() => (
    `請以${guide.label}視角，整理睿程生醫今天的交接重點：先列出優先專案，再指出缺少文件、待回覆申請與下一步操作。`
  ), [guide.label])

  return (
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">AI</span>
          <span>睿程生醫 新手導覽</span>
        </div>
        <nav className="ops-nav">
          <Link to="/catalog">公開型錄</Link>
          <Link to="/login">登入</Link>
        </nav>
      </header>

      <main className="ops-main guide-main">
        <section className="guide-hero">
          <div>
            <p className="guide-kicker">交接用工作台</p>
            <h1>第一次坐下來，也能知道下一步要去哪裡。</h1>
            <p>這頁把專案管理、產品管理、外部申請與 AI 輔助整理成一條上手路徑，適合 demo、公司交接與新同仁訓練。</p>
          </div>
          <div className="guide-ai-box">
            <span>AI 交接摘要範例</span>
            <strong>{aiPrompt}</strong>
            <p>正式上線後可串接公司資料，生成每日摘要、風險提醒與角色化操作建議。</p>
          </div>
        </section>

        <section className="guide-quick-actions" aria-label="快速入口">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} className="guide-action" to={action.href}>
              <strong>{action.label}</strong>
              <span>{action.note}</span>
            </Link>
          ))}
        </section>

        <section className="guide-grid">
          <div className="ops-table-panel guide-panel">
            <div className="ops-section-heading">
              <h2>依角色開始</h2>
              <span>選一個身份</span>
            </div>
            <div className="guide-role-tabs">
              {Object.entries(ROLE_GUIDES).map(([key, value]) => (
                <button key={key} className={role === key ? 'active' : ''} onClick={() => setRole(key)}>
                  {value.label}
                </button>
              ))}
            </div>
            <div className="guide-role-detail">
              <p>{guide.goal}</p>
              <ol>
                {guide.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <Link className="ops-primary guide-start" to={guide.route}>前往操作</Link>
            </div>
          </div>

          <div className="ops-table-panel guide-panel">
            <div className="ops-section-heading">
              <h2>AI 可以補的能力</h2>
              <span>讓公司有可展示的 AI 金流理由</span>
            </div>
            <div className="guide-ai-list">
              {AI_CHECKLIST.map((item) => (
                <div key={item}>
                  <span>AI</span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

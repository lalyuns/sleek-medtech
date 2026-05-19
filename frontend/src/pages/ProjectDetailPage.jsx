import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AuditPanel from '../components/AuditPanel'
import BOMPanel from '../components/BOMPanel'
import CostsPanel from '../components/CostsPanel'
import FeedbackPanel from '../components/FeedbackPanel'
import ProjectMembersPanel from '../components/ProjectMembersPanel'
import ReportsPanel from '../components/ReportsPanel'
import api from '../api/client'
import useAuthStore from '../store/authStore'
import useViewerStore from '../store/viewerStore'
import '../styles/projectDetail.css'

const ModelViewer = lazy(() => import('../components/viewer/ModelViewer'))

const STATUS_COLOR = { draft: '#3b82f6', locked: '#22c55e', uploading: '#f59e0b' }
const STATUS_LABELS = { draft: '草稿', locked: '已鎖定', uploading: '上傳中' }
const TAB_LABELS = {
  Overview: '總覽',
  Upload: '上傳',
  '3D Review': '3D 檢視',
  BOM: 'BOM',
  Reports: '報告',
  Members: '成員',
  Audit: '稽核',
}
const REPORT_TYPE_LABELS = {
  material_test: '材料測試',
  inspection: '檢驗報告',
  regulatory: '法規文件',
  manufacturing: '製造文件',
  compliance: '合規文件',
  sterilization: '滅菌文件',
}
const SOURCE_LABELS = {
  self_made: '自製',
  purchased: '外購',
  outsourced: '委外',
  customer_supplied: '客供',
}
const REQUIRED_REPORTS = ['material_test', 'inspection', 'compliance']
const CHUNK_SIZE = 5 * 1024 * 1024

function resolveModelUrl(fileUrl) {
  if (!fileUrl || fileUrl === 'placeholder') return null
  if (fileUrl.startsWith('http://example.test')) return null
  return fileUrl
}

async function sha256Hex(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function formatDate(value) {
  if (!value) return '未記錄'
  return new Date(value).toLocaleString()
}

function Stat({ label, value, tone = '#bfdbfe', note }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #dbe3ef', borderRadius: 8, padding: 14, boxShadow: '0 2px 8px rgba(23, 32, 51, 0.05)' }}>
      <div style={{ color: '#66758f', fontSize: 12, marginBottom: 7, fontWeight: 800 }}>{label}</div>
      <div style={{ color: tone, fontSize: 24, fontWeight: 900 }}>{value}</div>
      {note && <div style={{ color: '#7b889b', fontSize: 11, marginTop: 6 }}>{note}</div>}
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const [tab, setTab] = useState('Overview')
  const [project, setProject] = useState(null)
  const [versions, setVersions] = useState([])
  const [materials, setMaterials] = useState([])
  const [reports, setReports] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [bom, setBom] = useState(null)
  const [projectProduct, setProjectProduct] = useState(null)
  const [activeVersion, setActiveVersion] = useState(null)
  const [locking, setLocking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('')
  const [bomNonce, setBomNonce] = useState(0)
  const [feedbackNonce, setFeedbackNonce] = useState(0)
  const [uploadForm, setUploadForm] = useState({ material_id: '', parent_version_id: '', description: '', file: null })
  const [signoffForm, setSignoffForm] = useState({ reason: '', password: '' })
  const [statusBanner, setStatusBanner] = useState(null)
  const bannerTimer = useRef(null)

  const accessLevel = project?.current_access_level || (user?.role === 'admin' ? 'admin' : 'read_only')
  const canEditProject = user?.role === 'admin' || accessLevel === 'edit' || accessLevel === 'admin'
  const canAdminProject = user?.role === 'admin' || accessLevel === 'admin'
  const canSignOff = user?.role === 'doctor' || user?.role === 'admin'
  const canWriteFeedback = user?.role === 'doctor' || user?.role === 'admin'
  const tabs = useMemo(() => {
    const items = ['Overview', '3D Review']
    if (canEditProject) items.splice(1, 0, 'Upload')
    if (canEditProject) items.push('BOM', 'Reports')
    if (canAdminProject) items.push('Members', 'Audit')
    return items
  }, [canAdminProject, canEditProject])
  const selectedTab = tabs.includes(tab) ? tab : tabs[0] || 'Overview'

  const refreshVersions = useCallback(async () => {
    const { data } = await api.get(`/projects/${id}/versions`)
    setVersions(data)
    setActiveVersion((current) => {
      if (current) return data.find((version) => version.version_id === current.version_id) || data[data.length - 1] || null
      return data[data.length - 1] || null
    })
    return data
  }, [id])

  const refreshWorkspace = useCallback(async () => {
    const [projectResponse, versionsResponse, materialsResponse, reportsResponse, productsResponse] = await Promise.all([
      api.get(`/projects/${id}`).catch(() => ({ data: null })),
      api.get(`/projects/${id}/versions`).catch(() => ({ data: [] })),
      api.get('/materials/').catch(() => ({ data: [] })),
      api.get(`/projects/${id}/reports`).catch(() => ({ data: [] })),
      api.get('/products').catch(() => ({ data: [] })),
    ])
    const versionRows = versionsResponse.data
    const projectRow = projectResponse.data
    setProject(projectRow)
    setProjectProduct(productsResponse.data.find((product) => product.product_id === projectRow?.product_id) || null)
    setVersions(versionRows)
    setMaterials(materialsResponse.data)
    setReports(reportsResponse.data)
    setActiveVersion((current) => {
      if (current) return versionRows.find((version) => version.version_id === current.version_id) || versionRows[versionRows.length - 1] || null
      return versionRows[versionRows.length - 1] || null
    })
    const feedbackRows = await Promise.all(
      versionRows.map((version) => (
        api.get(`/projects/${id}/versions/${version.version_id}/feedbacks`)
          .then((response) => response.data.map((feedback) => ({ ...feedback, version_number: version.version_number })))
          .catch(() => [])
      )),
    )
    setFeedbacks(feedbackRows.flat())
  }, [id])

  useEffect(() => {
    Promise.resolve().then(() => refreshWorkspace())
  }, [refreshWorkspace])

  useEffect(() => {
    if (!activeVersion?.version_id) {
      Promise.resolve().then(() => setBom(null))
      return
    }
    api.get(`/projects/${id}/versions/${activeVersion.version_id}/bom`)
      .then((response) => setBom(response.data))
      .catch(() => setBom(null))
  }, [activeVersion?.version_id, bomNonce, id])

  const canUpload = useMemo(() => uploadForm.material_id && uploadForm.file && !uploading, [uploadForm, uploading])
  const draftVersions = versions.filter((version) => version.status === 'draft')
  const pendingFeedbacks = feedbacks.filter((feedback) => feedback.status === 'submitted')
  const missingReports = REQUIRED_REPORTS.filter((type) => !reports.some((report) => report.report_type === type))
  const uploadDisabledReason = useMemo(() => {
    if (uploading) return '上傳處理中'
    if (!uploadForm.material_id) return '請先選擇材料'
    if (!uploadForm.file) return '請選擇 STL 檔案'
    return '已具備上傳條件'
  }, [uploadForm.file, uploadForm.material_id, uploading])

  const recentActivities = useMemo(() => {
    const versionItems = versions.slice(-3).map((version) => ({
      key: `version-${version.version_id}`,
      title: `v${version.version_number} ${STATUS_LABELS[version.status] || version.status}`,
      detail: version.description || '尚無版本說明',
      time: version.timestamp,
    }))
    const reportItems = reports.slice(0, 3).map((report) => ({
      key: `report-${report.report_id}`,
      title: `報告：${report.name}`,
      detail: REPORT_TYPE_LABELS[report.report_type] || report.report_type,
      time: report.created_at,
    }))
    const feedbackItems = feedbacks.slice(-3).map((feedback) => ({
      key: `feedback-${feedback.feedback_id}`,
      title: `v${feedback.version_number} 回饋`,
      detail: feedback.content,
      time: feedback.resolved_at,
    }))
    return [...versionItems, ...reportItems, ...feedbackItems].slice(0, 6)
  }, [feedbacks, reports, versions])

  const showStatus = useCallback((message, type = 'info') => {
    setStatusBanner({ message, type })
    window.clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setStatusBanner(null), 4200)
  }, [])

  const uploadVersion = async (event) => {
    event.preventDefault()
    if (!canUpload) {
      showStatus(uploadDisabledReason, 'error')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadMessage('正在計算 STL 雜湊')
    try {
      const file = uploadForm.file
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
      const hashValue = await sha256Hex(file)

      const initForm = new FormData()
      initForm.append('material_id', uploadForm.material_id)
      initForm.append('total_chunks', String(totalChunks))
      initForm.append('hash_value', hashValue)
      if (uploadForm.description) initForm.append('description', uploadForm.description)
      if (uploadForm.parent_version_id) initForm.append('parent_version_id', uploadForm.parent_version_id)

      setUploadMessage('正在建立上傳工作')
      const { data: init } = await api.post(`/projects/${id}/versions/upload/init`, initForm)

      for (let index = 0; index < totalChunks; index += 1) {
        const chunk = file.slice(index * CHUNK_SIZE, Math.min(file.size, (index + 1) * CHUNK_SIZE))
        const chunkForm = new FormData()
        chunkForm.append('chunk_index', String(index))
        chunkForm.append('chunk', chunk, file.name)
        await api.post(`/projects/${id}/versions/${init.version_id}/upload/chunk`, chunkForm)
        setUploadMessage(`已上傳分塊 ${index + 1} / ${totalChunks}`)
        setUploadProgress(Math.round(((index + 1) / totalChunks) * 70))
      }

      const { data: completed } = await api.post(`/projects/${id}/versions/${init.version_id}/upload/complete`)
      setUploadProgress(75)
      setUploadMessage('背景處理已排程')

      const poll = window.setInterval(async () => {
        const { data: status } = await api.get(`/projects/${id}/versions/${init.version_id}/upload/status/${completed.job_id}`)
        setUploadProgress(status.progress)
        setUploadMessage(status.message || status.status)
        if (status.status === 'DONE' || status.status === 'FAILED') {
          window.clearInterval(poll)
          setUploading(false)
          setUploadForm({ material_id: '', parent_version_id: '', description: '', file: null })
          await refreshVersions()
          await refreshWorkspace()
          if (status.status === 'FAILED') showStatus('上傳處理失敗，請檢查 worker 紀錄。', 'error')
          if (status.status === 'DONE') showStatus('上傳完成，版本清單已更新。', 'success')
        }
      }, 1500)
    } catch (error) {
      setUploading(false)
      setUploadMessage('')
      showStatus(error.response?.data?.detail || '上傳失敗', 'error')
    }
  }

  const lockVersion = async () => {
    if (!activeVersion || activeVersion.status === 'locked') return
    if (!signoffForm.reason.trim() || !signoffForm.password) {
      showStatus('請填寫簽核理由並輸入確認密碼', 'error')
      return
    }
    setLocking(true)
    try {
      const { data } = await api.post(`/projects/${id}/versions/${activeVersion.version_id}/lock`, {
        reason: signoffForm.reason,
        password: signoffForm.password,
      })
      setActiveVersion(data)
      setVersions((items) => items.map((version) => (version.version_id === data.version_id ? data : version)))
      setSignoffForm({ reason: '', password: '' })
      showStatus('版本已完成簽核並鎖定。', 'success')
    } catch (error) {
      showStatus(error.response?.data?.detail || '簽核失敗', 'error')
    } finally {
      setLocking(false)
    }
  }

  return (
    <>
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 醫材追溯系統</span>
        </div>
        <nav className="ops-nav">
          <button onClick={() => navigate('/projects')}>專案列表</button>
          <button onClick={() => navigate(`/projects/${id}/traceability`)}>查看溯源</button>
          <button onClick={logout}>登出</button>
        </nav>
      </header>
      <div className="project-detail-page">
        {statusBanner && <div className={`status-banner ${statusBanner.type}`}>{statusBanner.message}</div>}
      <div className="project-detail-header">
        <button onClick={() => navigate('/projects')} style={secondaryButton}>返回</button>
        <div className="project-detail-title">
          <h1 style={{ marginBottom: 4 }}>{project?.name || `專案 #${id}`}</h1>
          <div style={{ color: '#66758f', fontSize: 13, fontWeight: 700 }}>{project?.description || '尚無描述'}</div>
        </div>
        {activeVersion && (
          <span style={{ fontSize: 12, color: STATUS_COLOR[activeVersion.status], border: `1px solid ${STATUS_COLOR[activeVersion.status]}`, borderRadius: 4, padding: '4px 8px' }}>
            v{activeVersion.version_number} / {STATUS_LABELS[activeVersion.status] || activeVersion.status}
          </span>
        )}
        <button className="project-detail-trace" onClick={() => navigate(`/projects/${id}/traceability`)} style={primaryButton}>溯源圖</button>
      </div>

      <div className="project-tabs">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} style={selectedTab === item ? activeTabButton : tabButton}>{TAB_LABELS[item] || item}</button>
        ))}
      </div>

      {selectedTab === 'Overview' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <Stat label="未簽核版本" value={draftVersions.length} tone={draftVersions.length ? '#fbbf24' : '#34d399'} note="草稿版本需完成臨床簽核" />
            <Stat label="待處理回饋" value={pendingFeedbacks.length} tone={pendingFeedbacks.length ? '#fbbf24' : '#34d399'} note="醫師回饋尚未轉需求" />
            <Stat label="缺少報告" value={missingReports.length} tone={missingReports.length ? '#f87171' : '#34d399'} note="材料/檢驗/合規文件" />
            <Stat label="BOM 狀態" value={bom?.total_cost ? '已計算' : '待確認'} tone={bom?.total_cost ? '#34d399' : '#fbbf24'} note={bom?.total_cost ? `總成本 $${Number(bom.total_cost).toFixed(2)}` : '需有體積與材料參數'} />
          </div>

          <div className="project-overview-grid">
            <div style={panelStyle}>
              <h2 style={panelTitle}>待辦工作</h2>
              <TaskList
                tasks={[
                  ...draftVersions.map((version) => ({ key: `draft-${version.version_id}`, tone: '#fbbf24', title: `v${version.version_number} 尚未簽核`, detail: version.description || '請確認版本內容後簽核或重新上傳。' })),
                  ...pendingFeedbacks.slice(0, 4).map((feedback) => ({ key: `feedback-${feedback.feedback_id}`, tone: '#22c55e', title: `v${feedback.version_number} 有待處理回饋`, detail: feedback.content })),
                  ...missingReports.map((type) => ({ key: `report-${type}`, tone: '#f87171', title: `缺少${REPORT_TYPE_LABELS[type]}`, detail: '請補上報告並連結到目前版本的溯源鏈。' })),
                ]}
              />
            </div>
            <div style={panelStyle}>
              <h2 style={panelTitle}>最近活動</h2>
              {recentActivities.length === 0 ? <Empty text="目前沒有活動紀錄。" /> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {recentActivities.map((item) => (
                    <div key={item.key} style={{ border: '1px solid #dbe3ef', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
                      <div style={{ color: '#172033', fontWeight: 800, fontSize: 13 }}>{item.title}</div>
                      <div style={{ color: '#66758f', fontSize: 12, marginTop: 4 }}>{item.detail}</div>
                      <div style={{ color: '#7b889b', fontSize: 11, marginTop: 5 }}>{formatDate(item.time)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={panelTitle}>版本清單</h2>
            {versions.length === 0 ? <Empty text="目前沒有模型版本，請先上傳 STL。" /> : (
              <VersionList versions={versions} activeVersion={activeVersion} setActiveVersion={setActiveVersion} />
            )}
          </div>
        </div>
      )}

      {selectedTab === 'Upload' && (
        <div className="project-upload-grid">
          <form onSubmit={uploadVersion} style={panelStyle}>
            <h2 style={panelTitle}>上傳 STL 版本</h2>
            <div style={noticeStyle}>模型版本必須透過 STL 上傳建立，不提供手動建立版本；系統會自動計算 hash、體積並送入 worker。</div>
            <label style={labelStyle}>材料</label>
            <select required value={uploadForm.material_id} onChange={(event) => setUploadForm((form) => ({ ...form, material_id: event.target.value }))} style={fieldStyle}>
              <option value="">選擇材料</option>
              {materials.map((material) => <option key={material.material_id} value={material.material_id}>{material.name}</option>)}
            </select>
            <label style={labelStyle}>父版本</label>
            <select value={uploadForm.parent_version_id} onChange={(event) => setUploadForm((form) => ({ ...form, parent_version_id: event.target.value }))} style={fieldStyle}>
              <option value="">無父版本</option>
              {versions.map((version) => <option key={version.version_id} value={version.version_id}>v{version.version_number}</option>)}
            </select>
            <label style={labelStyle}>版本說明</label>
            <input value={uploadForm.description} onChange={(event) => setUploadForm((form) => ({ ...form, description: event.target.value }))} style={fieldStyle} placeholder="這次版本改了什麼？" />
            <label style={labelStyle}>STL 檔案</label>
            <input type="file" accept=".stl" required onChange={(event) => setUploadForm((form) => ({ ...form, file: event.target.files?.[0] || null }))} style={{ color: '#324156', marginBottom: 16 }} />
            {uploading && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 8, background: '#d7e0eb', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: 8, background: '#3b82f6' }} />
                </div>
                <div style={{ color: '#66758f', fontSize: 12, marginTop: 6 }}>{uploadMessage}</div>
              </div>
            )}
            <div style={{ color: canUpload ? '#137447' : '#a44b00', fontSize: 12, marginBottom: 10 }}>{uploadDisabledReason}</div>
            <button disabled={!canUpload} style={{ ...primaryButton, width: '100%', opacity: canUpload ? 1 : 0.55 }}>上傳 STL</button>
          </form>

          <div style={panelStyle}>
            <h2 style={panelTitle}>上傳檢查表</h2>
            <Checklist
              items={[
                ['材料已選擇', Boolean(uploadForm.material_id), '模型版本必須綁定合法啟用材料。'],
                ['父版本已確認', true, uploadForm.parent_version_id ? '將建立版本溯源關係。' : '第一版或無需繼承時可留空。'],
                ['版本說明已填寫', Boolean(uploadForm.description.trim()), '建議描述幾何或製程變更，利於稽核閱讀。'],
                ['STL 檔案已選擇', Boolean(uploadForm.file), '僅接受 STL，最大檔案將分塊上傳。'],
                ['Worker 狀態', !uploading, uploading ? uploadMessage : '待上傳後啟動 hash、合併、體積解析與儲存。'],
              ]}
            />
            <div style={{ marginTop: 18 }}>
              <h3 style={{ ...panelTitle, fontSize: 16 }}>版本鏈</h3>
              {versions.length === 0 ? <Empty text="上傳後的版本會顯示在這裡。" /> : <VersionList versions={versions} activeVersion={activeVersion} setActiveVersion={setActiveVersion} />}
            </div>
          </div>
        </div>
      )}

      {selectedTab === '3D Review' && (
        <div className="project-review-grid">
          <div style={panelStyle}>
            <h2 style={panelTitle}>版本</h2>
            <VersionList versions={versions} activeVersion={activeVersion} setActiveVersion={setActiveVersion} />
          </div>
          <div className="project-viewer-frame">
            <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#cbd5e1' }}>正在載入 3D 檢視器...</div>}>
              <ModelViewer fileUrl={resolveModelUrl(activeVersion?.file_url)} projectId={id} versionId={activeVersion?.version_id} canWriteFeedback={canWriteFeedback} />
            </Suspense>
          </div>
          <div style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ ...panelTitle, marginBottom: 0 }}>回饋</h2>
            </div>
            {canWriteFeedback && (
              <PendingFeedbackEditor
                projectId={id}
                versionId={activeVersion?.version_id}
                onSaved={() => {
                  setFeedbackNonce((value) => value + 1)
                  refreshWorkspace()
                }}
              />
            )}
            {canSignOff && activeVersion?.status !== 'locked' && activeVersion?.status !== 'uploading' && (
              <div style={{ display: 'grid', gap: 8, marginBottom: 14, padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #dbe3ef' }}>
                <textarea
                  value={signoffForm.reason}
                  onChange={(event) => setSignoffForm((value) => ({ ...value, reason: event.target.value }))}
                  placeholder="簽核理由"
                  style={{ ...fieldStyle, minHeight: 68, resize: 'vertical', boxSizing: 'border-box' }}
                />
                <input
                  type="password"
                  value={signoffForm.password}
                  onChange={(event) => setSignoffForm((value) => ({ ...value, password: event.target.value }))}
                  placeholder="確認密碼"
                  style={fieldStyle}
                />
                <button disabled={locking || !signoffForm.reason.trim() || !signoffForm.password} onClick={lockVersion} style={{ ...primaryButton, background: '#22c55e', color: '#052e16', opacity: locking ? 0.6 : 1 }}>{locking ? '簽核中...' : '簽核'}</button>
              </div>
            )}
            <FeedbackPanel key={feedbackNonce} projectId={id} versionId={activeVersion?.version_id} canWrite={canWriteFeedback} currentUserId={user?.user_id} canModerate={canEditProject} />
          </div>
        </div>
      )}

      {selectedTab === 'BOM' && (
        <div className="project-bom-grid">
          <div style={panelStyle}>
            <h2 style={panelTitle}>BOM 摘要</h2>
            <BOMPanel key={bomNonce} projectId={id} versionId={activeVersion?.version_id} />
          </div>
          <div style={panelStyle}>
            <h2 style={panelTitle}>成本輸入</h2>
            <CostsPanel projectId={id} onChanged={() => setBomNonce((value) => value + 1)} />
          </div>
          <div style={{ ...panelStyle, gridColumn: '1 / -1' }}>
            <h2 style={panelTitle}>套組零件 BOM</h2>
            <ProductBOMTable product={projectProduct} />
          </div>
        </div>
      )}

      {selectedTab === 'Reports' && (
        <div style={panelStyle}>
          <h2 style={panelTitle}>報告</h2>
          <ReportsPanel projectId={id} versionId={activeVersion?.version_id} />
        </div>
      )}

      {selectedTab === 'Members' && (
        <div style={panelStyle}>
          <h2 style={panelTitle}>成員</h2>
          <ProjectMembersPanel projectId={id} />
        </div>
      )}

      {selectedTab === 'Audit' && (
        <div style={panelStyle}>
          <h2 style={panelTitle}>稽核紀錄</h2>
          <AuditPanel />
        </div>
      )}
      </div>
    </>
  )
}

function PendingFeedbackEditor({ projectId, versionId, onSaved }) {
  const { pendingPoint, setPendingPoint, addAnnotation } = useViewerStore()
  const [text, setText] = useState('')
  if (!pendingPoint) {
    return (
      <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px dashed #cfd9e8', color: '#66758f', fontSize: 12, lineHeight: 1.5 }}>
        在 3D 模型上點選位置後，這裡會開啟註記編輯器；3D 區域只保留定位 pin。
      </div>
    )
  }

  const cancel = () => {
    setPendingPoint(null)
    setText('')
  }

  const save = async () => {
    if (!text.trim() || !versionId) return
    const { data } = await api.post(`/projects/${projectId}/versions/${versionId}/feedbacks`, {
      content: text.trim(),
      coordinates: { x: pendingPoint.x, y: pendingPoint.y, z: pendingPoint.z },
    })
    addAnnotation(pendingPoint, data.content, data.feedback_id)
    setText('')
    onSaved?.()
  }

  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 14, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #8fb4ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <strong style={{ fontSize: 13, color: '#172033' }}>新增 3D 註記</strong>
        <span style={{ color: '#66758f', fontSize: 11, whiteSpace: 'nowrap' }}>
          X {pendingPoint.x.toFixed(1)} / Y {pendingPoint.y.toFixed(1)} / Z {pendingPoint.z.toFixed(1)}
        </span>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') save()
          if (event.key === 'Escape') cancel()
        }}
        placeholder="輸入回饋內容..."
        style={{ ...fieldStyle, minHeight: 98, resize: 'vertical', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#66758f', fontSize: 11 }}>橘色 pin 會停在你點選的模型座標。</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={cancel} style={smallGhostButton}>取消</button>
          <button type="button" onClick={save} disabled={!text.trim()} style={{ ...smallGhostButton, background: text.trim() ? '#2f63e6' : '#d7e0eb', borderColor: text.trim() ? '#2f63e6' : '#d7e0eb', color: text.trim() ? '#fff' : '#5b6b82', fontWeight: 800 }}>儲存</button>
        </div>
      </div>
    </div>
  )
}

function TaskList({ tasks }) {
  if (tasks.length === 0) return <Empty text="目前沒有待辦事項。" />
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {tasks.slice(0, 8).map((task) => (
        <div key={task.key} style={{ border: '1px solid #dbe3ef', borderLeft: `4px solid ${task.tone}`, borderRadius: 8, padding: 10, background: '#f8fafc' }}>
          <div style={{ color: '#172033', fontWeight: 800, fontSize: 13 }}>{task.title}</div>
          <div style={{ color: '#66758f', fontSize: 12, marginTop: 4 }}>{task.detail}</div>
        </div>
      ))}
    </div>
  )
}

function Checklist({ items }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map(([label, done, detail]) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10, alignItems: 'start', padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #dbe3ef' }}>
          <span style={{ width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center', background: done ? '#17a978' : '#d7e0eb', color: done ? '#fff' : '#5b6b82', fontSize: 12, fontWeight: 900 }}>
            {done ? '✓' : '·'}
          </span>
          <span>
            <div style={{ color: '#172033', fontWeight: 800, fontSize: 13 }}>{label}</div>
            <div style={{ color: '#66758f', fontSize: 12, marginTop: 3 }}>{detail}</div>
          </span>
        </div>
      ))}
    </div>
  )
}

function VersionList({ versions, activeVersion, setActiveVersion }) {
  if (versions.length === 0) return <Empty text="目前沒有版本。" />
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {versions.map((version) => (
        <button
          key={version.version_id}
          onClick={() => setActiveVersion(version)}
          style={{
            textAlign: 'left',
            padding: 12,
            borderRadius: 8,
            cursor: 'pointer',
            color: '#172033',
            background: activeVersion?.version_id === version.version_id ? '#e8efff' : '#f8fafc',
            border: `1px solid ${activeVersion?.version_id === version.version_id ? '#8fb4ff' : '#dbe3ef'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong>v{version.version_number}</strong>
            <span style={{ color: STATUS_COLOR[version.status] }}>{STATUS_LABELS[version.status] || version.status}</span>
          </div>
          <div style={{ color: '#66758f', fontSize: 12, marginTop: 4 }}>{version.description || '尚無描述'}</div>
          <div style={{ color: '#7b889b', fontSize: 11, marginTop: 4 }}>{version.hash_value.slice(0, 10)}...</div>
        </button>
      ))}
    </div>
  )
}

function ProductBOMTable({ product }) {
  if (!product) {
    return <Empty text="這個專案尚未連結產品套組，因此只會顯示 STL 材料與額外成本。" />
  }

  const componentCost = product.bom_items.reduce((sum, item) => {
    const unitCost = Number(item.component.unit_cost || 0)
    return sum + unitCost * Number(item.quantity || 0)
  }, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div>
          <strong style={{ color: '#172033' }}>{product.name}</strong>
          <div style={{ color: '#66758f', fontSize: 12, marginTop: 3 }}>{product.sku}</div>
        </div>
        <div style={{ color: '#137447', fontWeight: 900 }}>組件估算 ${componentCost.toFixed(2)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
        {[
          ['使用部位', product.body_region || '未設定'],
          ['臨床用途', product.clinical_use || '未設定'],
          ['使用階段', product.surgical_stage || '未設定'],
          ['適應症', product.indication || '未設定'],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #dbe3ef' }}>
            <div style={{ color: '#66758f', fontSize: 11, fontWeight: 900, marginBottom: 4 }}>{label}</div>
            <div style={{ color: '#172033', fontSize: 13, fontWeight: 800, lineHeight: 1.4 }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>組件</th>
              <th>來源</th>
              <th>數量</th>
              <th>供應商/委外廠</th>
              <th>單價</th>
              <th>小計</th>
              <th>文件</th>
            </tr>
          </thead>
          <tbody>
            {product.bom_items.map((item) => {
              const unitCost = Number(item.component.unit_cost || 0)
              const subtotal = unitCost * Number(item.quantity || 0)
              return (
                <tr key={item.item_id}>
                  <td>
                    {item.component.name}
                    {item.note && <div className="ops-muted">{item.note}</div>}
                  </td>
                  <td><span className={`ops-status ${item.component.source_type === 'self_made' ? 'info' : 'warning'}`}>{SOURCE_LABELS[item.component.source_type] || item.component.source_type}</span></td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{item.component.supplier_name || '-'}</td>
                  <td>{unitCost ? `$${unitCost.toFixed(2)}` : '-'}</td>
                  <td>{subtotal ? `$${subtotal.toFixed(2)}` : '-'}</td>
                  <td>{item.component.requires_certificate ? '需文件' : '不需文件'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ color: '#66758f', border: '1px dashed #cfd9e8', borderRadius: 8, padding: 18, textAlign: 'center', background: '#f8fafc' }}>{text}</div>
}

const panelStyle = { background: '#fff', border: '1px solid #dbe3ef', borderRadius: 8, padding: 18, boxShadow: '0 2px 9px rgba(23, 32, 51, 0.05)' }
const panelTitle = { fontSize: 18, marginBottom: 14, color: '#172033' }
const labelStyle = { display: 'block', color: '#66758f', fontSize: 12, marginBottom: 6, marginTop: 12, fontWeight: 800 }
const fieldStyle = { width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid #d2dbe8', background: '#f8fafc', color: '#172033' }
const noticeStyle = { border: '1px solid #c9dafc', borderRadius: 8, padding: 10, background: '#edf4ff', color: '#2856c8', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }
const primaryButton = { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#2f63e6', color: '#fff', cursor: 'pointer', fontWeight: 800 }
const secondaryButton = { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#5b6b82', color: '#fff', cursor: 'pointer', fontWeight: 800 }
const tabButton = { padding: '8px 12px', borderRadius: 6, border: '1px solid transparent', background: '#f4f6fa', color: '#324156', cursor: 'pointer', fontWeight: 800 }
const activeTabButton = { ...tabButton, background: '#5d70e6', color: '#fff', border: '1px solid #5d70e6' }
const smallGhostButton = { border: '1px solid #d2dbe8', background: '#fff', color: '#324156', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }

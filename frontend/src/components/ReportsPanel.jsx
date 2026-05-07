import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const REPORT_TYPES = [
  ['all', '全部類型'],
  ['material_test', '材料測試'],
  ['inspection', '檢驗報告'],
  ['regulatory', '法規文件'],
  ['manufacturing', '製造文件'],
  ['compliance', '合規文件'],
  ['sterilization', '滅菌文件'],
]
const REQUIRED_TYPES = ['material_test', 'inspection', 'compliance']

export default function ReportsPanel({ projectId, versionId }) {
  const [reports, setReports] = useState([])
  const [name, setName] = useState('')
  const [reportType, setReportType] = useState('material_test')
  const [filterType, setFilterType] = useState('all')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(null)

  const typeLabel = useCallback((value) => REPORT_TYPES.find(([type]) => type === value)?.[1] || value, [])

  const loadReports = useCallback(() => {
    api.get(`/projects/${projectId}/reports`).then((response) => {
      setReports(response.data)
      setPreview((current) => current || response.data[0] || null)
    }).catch(() => setReports([]))
  }, [projectId])

  useEffect(() => {
    if (projectId) loadReports()
  }, [projectId, loadReports])

  const filteredReports = useMemo(() => (
    filterType === 'all' ? reports : reports.filter((report) => report.report_type === filterType)
  ), [filterType, reports])

  const counts = useMemo(() => Object.fromEntries(
    REPORT_TYPES.filter(([value]) => value !== 'all').map(([value]) => [value, reports.filter((report) => report.report_type === value).length]),
  ), [reports])
  const missingRequired = REQUIRED_TYPES.filter((type) => !counts[type])

  const getReportUrl = async (report) => {
    const { data } = await api.get(`/projects/${projectId}/reports/${report.report_id}/file-url`)
    return data.file_url
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!name.trim() || !file) return
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('report_type', reportType)
      form.append('file', file)
      const { data: report } = await api.post(`/projects/${projectId}/reports`, form)
      if (versionId) {
        await api.post(`/projects/${projectId}/versions/${versionId}/references`, {
          target_type: 'report',
          target_id: report.report_id,
        }).catch(() => {})
      }
      setName('')
      setFile(null)
      event.target.reset()
      setPreview(report)
      loadReports()
    } finally {
      setSubmitting(false)
    }
  }

  const previewReport = async (report) => {
    const fileUrl = await getReportUrl(report)
    setPreview({ ...report, file_url: fileUrl })
  }

  const downloadReport = async (report) => {
    const fileUrl = await getReportUrl(report)
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = report.name
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="reports-panel-grid">
      <div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="報告名稱" style={fieldStyle} />
          <select value={reportType} onChange={(event) => setReportType(event.target.value)} style={fieldStyle}>
            {REPORT_TYPES.filter(([value]) => value !== 'all').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} style={{ color: '#94a3b8', fontSize: 12 }} />
          <button disabled={submitting || !name.trim() || !file} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: submitting || !name.trim() || !file ? 0.55 : 1 }}>
            上傳報告
          </button>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          <Stat label="報告總數" value={reports.length} />
          <Stat label="缺少必備" value={missingRequired.length} danger={missingRequired.length > 0} />
          <Stat label="已連結版本" value={versionId ? '目前版' : '未選'} />
        </div>

        {missingRequired.length > 0 && (
          <div style={{ padding: 10, borderRadius: 8, border: '1px solid #7f1d1d', background: '#190b12', color: '#fecaca', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
            缺少必備文件：{missingRequired.map(typeLabel).join('、')}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 13 }}>報告庫</strong>
          <select value={filterType} onChange={(event) => setFilterType(event.target.value)} style={{ ...fieldStyle, width: 170 }}>
            {REPORT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {filteredReports.length === 0 ? (
          <p style={{ color: '#475569', fontSize: 13 }}>這個分類目前沒有報告。</p>
        ) : filteredReports.map((report) => (
          <div key={report.report_id} style={{ display: 'grid', gap: 8, marginBottom: 8, padding: 10, background: preview?.report_id === report.report_id ? '#172554' : '#0f172a', borderRadius: 6, border: '1px solid #334155' }}>
            <div>
              <div style={{ color: '#bfdbfe', fontSize: 13, fontWeight: 700 }}>{report.name}</div>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{typeLabel(report.report_type)} · {new Date(report.created_at).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => previewReport(report)} style={buttonStyle}>預覽</button>
              <button type="button" onClick={() => downloadReport(report)} style={buttonStyle}>下載</button>
              <button type="button" onClick={async () => { await api.delete(`/projects/${projectId}/reports/${report.report_id}`); if (preview?.report_id === report.report_id) setPreview(null); loadReports() }} style={{ ...buttonStyle, background: '#7f1d1d' }}>刪除</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, minHeight: 420, overflow: 'hidden' }}>
        {!preview ? (
          <div style={{ height: '100%', minHeight: 420, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 13, padding: 24, textAlign: 'center' }}>
            <div>
              <strong style={{ color: '#f8fafc' }}>尚未選擇報告</strong>
              <div style={{ marginTop: 8, lineHeight: 1.5 }}>上傳或點選左側報告後，這裡會顯示預覽。也可先補齊材料測試、檢驗報告與合規文件。</div>
            </div>
          </div>
        ) : (
          <ReportPreview report={preview} typeLabel={typeLabel} onClose={() => setPreview(null)} onLoad={() => previewReport(preview)} />
        )}
      </div>
    </div>
  )
}

function ReportPreview({ report, typeLabel, onClose, onLoad }) {
  useEffect(() => {
    if (!report.file_url) onLoad()
  }, [onLoad, report.file_url])

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderBottom: '1px solid #334155' }}>
        <div>
          <strong>{report.name}</strong>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{typeLabel(report.report_type)}</div>
        </div>
        <button type="button" onClick={onClose} style={buttonStyle}>關閉</button>
      </div>
      {report.file_url ? (
        <iframe title={report.name} src={report.file_url} style={{ width: '100%', height: '100%', minHeight: 360, border: 'none', background: '#fff' }} />
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', color: '#64748b' }}>正在載入預覽...</div>
      )}
    </div>
  )
}

function Stat({ label, value, danger = false }) {
  return (
    <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 10, background: '#0f172a' }}>
      <div style={{ color: '#94a3b8', fontSize: 11 }}>{label}</div>
      <div style={{ color: danger ? '#f87171' : '#f8fafc', fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  )
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#f1f5f9',
  fontSize: 12,
}

const buttonStyle = {
  border: 'none',
  background: '#334155',
  color: '#fff',
  borderRadius: 4,
  padding: '5px 9px',
  cursor: 'pointer',
  fontSize: 12,
}

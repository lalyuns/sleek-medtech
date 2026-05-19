import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const ACTION_COLORS = {
  create: '#60a5fa',
  update: '#f59e0b',
  delete: '#f87171',
  upload: '#a78bfa',
  sign_off: '#34d399',
}

const ACTION_LABELS = {
  create: '建立',
  update: '更新',
  delete: '刪除',
  upload: '上傳',
  sign_off: '簽核',
  change_material: '變更材料',
}

const ENTITY_LABELS = {
  model_version: '模型版本',
  material: '材料',
  feedback: '回饋',
  report: '報告',
  user: '使用者',
  cost: '成本',
  project: '專案',
}

function prettyJson(value) {
  if (!value || Object.keys(value).length === 0) return '無資料'
  return JSON.stringify(value, null, 2)
}

function describeLog(log) {
  const actor = log.actor_name || `使用者 #${log.user_id}`
  const action = ACTION_LABELS[log.action] || log.action
  const project = log.project_name || '全站'
  const version = log.version_number ? ` v${log.version_number}` : ''
  const entity = log.entity_label || `${ENTITY_LABELS[log.entity_type] || log.entity_type} #${log.entity_id}`
  return `${actor} 在「${project}」${version} ${action}「${entity}」`
}

export default function AuditPanel({ compact = false }) {
  const [logs, setLogs] = useState([])
  const [entityType, setEntityType] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    const query = entityType ? `?entity_type=${entityType}&limit=50` : '?limit=50'
    api.get(`/audit/logs${query}`).then((response) => setLogs(response.data.items || [])).catch(() => setLogs([]))
  }, [entityType])

  useEffect(() => {
    load()
  }, [load])

  const download = (kind) => {
    window.open(`/api/v1/audit/logs/export.${kind}${entityType ? `?entity_type=${entityType}` : ''}`, '_blank')
  }

  return (
    <div className="audit-panel-grid" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(360px, 0.95fr) minmax(420px, 1.05fr)', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={entityType} onChange={(event) => setEntityType(event.target.value)} style={fieldStyle}>
            <option value="">全部實體</option>
            <option value="model_version">模型版本</option>
            <option value="material">材料</option>
            <option value="feedback">回饋</option>
            <option value="report">報告</option>
            <option value="user">使用者</option>
            <option value="cost">成本</option>
            <option value="project">專案</option>
          </select>
          <button onClick={() => download('csv')} style={buttonStyle}>匯出 CSV</button>
          <button onClick={() => download('pdf')} style={buttonStyle}>匯出 PDF</button>
        </div>
        <div style={{ display: 'grid', gap: 8, maxHeight: compact ? 360 : 580, overflowY: 'auto', paddingRight: 6, scrollbarColor: '#c5cfdd #f8fafc' }}>
          {logs.length === 0 ? <p style={{ color: '#64748b' }}>目前沒有稽核紀錄。</p> : logs.map((log) => (
            <button
              key={log.log_id}
              onClick={() => setSelected(log)}
              style={{
                textAlign: 'left',
                border: `1px solid ${selected?.log_id === log.log_id ? '#8fb4ff' : '#dbe3ef'}`,
                background: selected?.log_id === log.log_id ? '#e8efff' : '#fff',
                color: '#172033',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <strong style={{ lineHeight: 1.4 }}>{describeLog(log)}</strong>
                <span style={{ color: ACTION_COLORS[log.action] || '#66758f', whiteSpace: 'nowrap', fontSize: 12 }}>{ACTION_LABELS[log.action] || log.action}</span>
              </div>
              <div style={{ color: '#66758f', fontSize: 12, marginTop: 6 }}>
                {new Date(log.timestamp).toLocaleString()} · {log.ip_address || '無 IP'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {!compact && (
        <div style={{ background: '#fff', border: '1px solid #dbe3ef', borderRadius: 8, padding: 16, minHeight: 300 }}>
          {!selected ? (
            <p style={{ color: '#64748b' }}>選擇一筆稽核紀錄檢視異動前後內容。</p>
          ) : (
            <>
              <h3 style={{ marginBottom: 8 }}>稽核 #{selected.log_id}</h3>
              <p style={headlineStyle}>{describeLog(selected)}</p>
              <p style={metaStyle}>操作者：{selected.actor_name || `使用者 #${selected.user_id}`} {selected.actor_email ? `(${selected.actor_email})` : ''}</p>
              <p style={metaStyle}>專案：{selected.project_name || '全站'}{selected.version_number ? ` / v${selected.version_number}` : ''}</p>
              <p style={metaStyle}>實體：{ENTITY_LABELS[selected.entity_type] || selected.entity_type} · {selected.entity_label || `#${selected.entity_id}`}</p>
              <p style={metaStyle}>來源：{selected.ip_address || '無 IP'} / {selected.request_id || '無 request id'}</p>
              <h4 style={{ marginTop: 14, marginBottom: 6 }}>異動前</h4>
              <pre style={preStyle}>{prettyJson(selected.old_values)}</pre>
              <h4 style={{ marginTop: 14, marginBottom: 6 }}>異動後</h4>
              <pre style={preStyle}>{prettyJson(selected.new_values)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const fieldStyle = { padding: '8px 10px', borderRadius: 6, border: '1px solid #d2dbe8', background: '#f8fafc', color: '#172033' }
const buttonStyle = { padding: '8px 12px', borderRadius: 6, border: 'none', background: '#5b6b82', color: '#fff', cursor: 'pointer', fontWeight: 800 }
const headlineStyle = { color: '#172033', fontSize: 14, lineHeight: 1.45, padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #dbe3ef' }
const metaStyle = { color: '#66758f', fontSize: 12, marginBottom: 4 }
const preStyle = { whiteSpace: 'pre-wrap', overflowX: 'auto', background: '#f8fafc', color: '#324156', padding: 10, borderRadius: 6, fontSize: 11, maxHeight: 180, border: '1px solid #dbe3ef' }

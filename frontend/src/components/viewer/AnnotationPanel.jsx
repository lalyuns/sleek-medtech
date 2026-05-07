import { useState } from 'react'
import useViewerStore from '../../store/viewerStore'

export default function AnnotationPanel({ onDelete, onUpdate }) {
  const { annotations } = useViewerStore()
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  if (annotations.length === 0) return null

  const startEdit = (annotation) => {
    setEditingId(annotation.id)
    setDraft(annotation.text)
  }

  const save = async () => {
    if (!editingId || !draft.trim()) return
    await onUpdate(editingId, draft.trim())
    setEditingId(null)
    setDraft('')
  }

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      background: 'rgba(15,23,42,0.9)',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '12px 16px',
      color: '#f1f5f9',
      width: 420,
      maxHeight: 300,
      overflowY: 'auto',
    }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>註記</div>
      {annotations.map((annotation) => (
        <div key={annotation.id} style={{ borderBottom: '1px solid #1f2937', paddingBottom: 8, marginBottom: 8 }}>
          {editingId === annotation.id ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                style={{ width: '100%', minHeight: 72, boxSizing: 'border-box', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', padding: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setEditingId(null)} style={ghostButton}>取消</button>
                <button type="button" onClick={save} style={primaryButton}>儲存</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>{annotation.text}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => startEdit(annotation)} style={ghostButton}>編輯</button>
                <button type="button" onClick={() => onDelete(annotation.id)} style={{ ...ghostButton, color: '#fecaca', borderColor: '#7f1d1d' }}>刪除</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const ghostButton = {
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#cbd5e1',
  borderRadius: 6,
  padding: '5px 9px',
  cursor: 'pointer',
  fontSize: 12,
}

const primaryButton = {
  ...ghostButton,
  background: '#2563eb',
  borderColor: '#3b82f6',
  color: '#fff',
  fontWeight: 700,
}

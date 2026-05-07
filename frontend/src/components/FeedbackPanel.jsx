import { useEffect, useState } from 'react'
import api from '../api/client'

const STATUS_LABELS = { submitted: '已提出', converted: '已轉需求' }

export default function FeedbackPanel({ projectId, versionId, canWrite = true, currentUserId, canModerate = false }) {
  const [feedbacks, setFeedbacks] = useState([])
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!versionId) return
    api.get(`/projects/${projectId}/versions/${versionId}/feedbacks`)
      .then((response) => setFeedbacks(response.data))
      .catch(() => setFeedbacks([]))
  }, [projectId, versionId])

  const submit = async (event) => {
    event.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/projects/${projectId}/versions/${versionId}/feedbacks`, { content })
      setFeedbacks((items) => [...items, data])
      setContent('')
    } finally {
      setSubmitting(false)
    }
  }

  const saveEdit = async () => {
    if (!editingId || !draft.trim()) return
    const { data } = await api.put(`/projects/${projectId}/versions/${versionId}/feedbacks/${editingId}`, { content: draft.trim() })
    setFeedbacks((items) => items.map((item) => (item.feedback_id === editingId ? data : item)))
    setEditingId(null)
    setDraft('')
  }

  const deleteFeedback = async (feedbackId) => {
    await api.delete(`/projects/${projectId}/versions/${versionId}/feedbacks/${feedbackId}`)
    setFeedbacks((items) => items.filter((item) => item.feedback_id !== feedbackId))
  }

  if (!versionId) return <p style={{ color: '#475569', fontSize: 13 }}>請先選擇版本。</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10 }}>
        {feedbacks.length === 0 ? (
          <p style={{ color: '#475569', fontSize: 13 }}>目前沒有回饋。</p>
        ) : feedbacks.map((feedback) => {
          const canChange = canModerate || feedback.author_id === currentUserId
          return (
            <div key={feedback.feedback_id} style={{ background: '#0f172a', borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 13 }}>
              {editingId === feedback.feedback_id ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} style={textAreaStyle} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" onClick={() => setEditingId(null)} style={ghostButton}>取消</button>
                    <button type="button" onClick={saveEdit} style={primaryButton}>儲存</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ color: '#f1f5f9', marginBottom: 4 }}>{feedback.content}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>使用者 #{feedback.author_id}</span>
                    <span style={{ fontSize: 11, color: feedback.status === 'converted' ? '#22c55e' : '#f59e0b' }}>{STATUS_LABELS[feedback.status] || feedback.status}</span>
                  </div>
                  {canChange && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button type="button" onClick={() => { setEditingId(feedback.feedback_id); setDraft(feedback.content) }} style={ghostButton}>編輯</button>
                      <button type="button" onClick={() => deleteFeedback(feedback.feedback_id)} style={{ ...ghostButton, color: '#fecaca', borderColor: '#7f1d1d' }}>刪除</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
      {canWrite && (
        <form onSubmit={submit} style={{ display: 'flex', gap: 6 }}>
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="新增回饋..."
            disabled={!versionId || submitting}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12 }}
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12 }}
          >
            送出
          </button>
        </form>
      )}
    </div>
  )
}

const textAreaStyle = {
  width: '100%',
  minHeight: 72,
  boxSizing: 'border-box',
  borderRadius: 6,
  border: '1px solid #334155',
  background: '#111827',
  color: '#f8fafc',
  padding: 8,
}

const ghostButton = {
  border: '1px solid #334155',
  background: '#111827',
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

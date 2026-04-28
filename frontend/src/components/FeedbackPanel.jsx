import { useEffect, useState } from 'react'
import api from '../api/client'

export default function FeedbackPanel({ projectId, versionId }) {
  const [feedbacks, setFeedbacks] = useState([])
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!versionId) return
    api.get(`/projects/${projectId}/versions/${versionId}/feedbacks`)
      .then((r) => setFeedbacks(r.data))
      .catch(() => setFeedbacks([]))
  }, [projectId, versionId])

  const submit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/projects/${projectId}/versions/${versionId}/feedbacks`, { content })
      setFeedbacks((f) => [...f, data])
      setContent('')
    } finally {
      setSubmitting(false)
    }
  }

  if (!versionId) return <p style={{ color: '#475569', fontSize: 13 }}>請選擇版本</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10 }}>
        {feedbacks.length === 0
          ? <p style={{ color: '#475569', fontSize: 13 }}>尚無回饋</p>
          : feedbacks.map((f) => (
            <div key={f.feedback_id} style={{ background: '#0f172a', borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 13 }}>
              <div style={{ color: '#f1f5f9', marginBottom: 4 }}>{f.content}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>#{f.author_id}</span>
                <span style={{ fontSize: 11, color: f.status === 'converted' ? '#22c55e' : '#f59e0b' }}>{f.status}</span>
              </div>
            </div>
          ))
        }
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 6 }}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="新增回饋意見..."
          disabled={!versionId || submitting}
          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12 }}
        />
        <button
          type="submit" disabled={submitting || !content.trim()}
          style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12 }}
        >
          送出
        </button>
      </form>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const COST_LABELS = { labor: '工時成本', external_sample: '外部打樣' }

export default function CostsPanel({ projectId, onChanged }) {
  const [costs, setCosts] = useState([])
  const [form, setForm] = useState({ type: 'labor', amount: '', description: '' })

  const load = useCallback(() => {
    api.get(`/projects/${projectId}/costs`).then((response) => setCosts(response.data)).catch(() => setCosts([]))
  }, [projectId])

  useEffect(() => {
    if (projectId) load()
  }, [projectId, load])

  const submit = async (event) => {
    event.preventDefault()
    if (!form.amount) return
    await api.post(`/projects/${projectId}/costs`, {
      type: form.type,
      amount: Number(form.amount),
      description: form.description || null,
    })
    setForm({ type: 'labor', amount: '', description: '' })
    load()
    onChanged?.()
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 8 }}>
        <select value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))} style={fieldStyle}>
          <option value="labor">工時成本</option>
          <option value="external_sample">外部打樣</option>
        </select>
        <input type="number" step="0.01" placeholder="金額" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} style={fieldStyle} />
        <input placeholder="說明" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} style={fieldStyle} />
        <button style={buttonStyle}>新增</button>
      </form>
      <div style={{ display: 'grid', gap: 8 }}>
        {costs.length === 0 ? <p style={{ color: '#64748b' }}>目前沒有額外成本。</p> : costs.map((cost) => (
          <div key={cost.cost_id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
            <span>{COST_LABELS[cost.type] || cost.type}</span>
            <strong>${Number(cost.amount).toFixed(2)}</strong>
            <span style={{ color: '#94a3b8' }}>{cost.description || '尚無說明'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const fieldStyle = { padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9' }
const buttonStyle = { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }

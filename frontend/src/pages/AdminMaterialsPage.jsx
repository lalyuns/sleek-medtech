import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function AdminMaterialsPage() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState([])
  const [form, setForm] = useState({ name: '', density: '', tensile_strength: '', unit_price: '' })

  const load = () => {
    api.get('/materials/').then((response) => setMaterials(response.data)).catch(() => setMaterials([]))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (event) => {
    event.preventDefault()
    await api.post('/materials/', {
      name: form.name,
      physical_parameters: {
        density: Number(form.density),
        tensile_strength: Number(form.tensile_strength),
        unit_price: Number(form.unit_price),
        unit_price_unit: 'per_g',
      },
    })
    setForm({ name: '', density: '', tensile_strength: '', unit_price: '' })
    load()
  }

  const deactivate = async (materialId) => {
    await api.delete(`/materials/${materialId}`)
    load()
  }

  return (
    <div style={{ padding: 32, background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/projects')} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>返回</button>
        <h1>材料管理</h1>
      </div>

      <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, marginBottom: 24 }}>
        <input required placeholder="材料名稱" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} style={fieldStyle} />
        <input required type="number" step="0.0001" placeholder="密度 g/cm³" value={form.density} onChange={(event) => setForm((value) => ({ ...value, density: event.target.value }))} style={fieldStyle} />
        <input required type="number" step="0.01" placeholder="抗拉強度" value={form.tensile_strength} onChange={(event) => setForm((value) => ({ ...value, tensile_strength: event.target.value }))} style={fieldStyle} />
        <input required type="number" step="0.01" placeholder="單價/克" value={form.unit_price} onChange={(event) => setForm((value) => ({ ...value, unit_price: event.target.value }))} style={fieldStyle} />
        <button style={buttonStyle}>建立</button>
      </form>

      <div style={{ display: 'grid', gap: 10 }}>
        {materials.map((material) => (
          <div key={material.material_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center', background: '#1e293b', padding: 14, borderRadius: 8 }}>
            <strong>{material.name}</strong>
            <span>密度 {material.physical_parameters.density} g/cm³</span>
            <span>抗拉 {material.physical_parameters.tensile_strength}</span>
            <span>${material.physical_parameters.unit_price}/克</span>
            <button onClick={() => deactivate(material.material_id)} style={{ ...buttonStyle, background: '#991b1b' }}>停用</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const fieldStyle = { padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }
const buttonStyle = { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }

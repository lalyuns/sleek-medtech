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
    <div className="ops-page">
      <header className="ops-topbar">
        <div className="ops-brand">
          <span className="ops-brand-mark">睿</span>
          <span>睿程生醫 材料管理</span>
        </div>
        <nav className="ops-nav">
          <button onClick={() => navigate('/projects')}>專案列表</button>
        </nav>
      </header>

      <main className="ops-main">
        <section className="ops-title-row">
          <h1>材料管理</h1>
          <p>維護 STL 版本可選用的材料密度、強度與單價參數。</p>
        </section>

        <form onSubmit={create} className="ops-panel admin-inline-form">
          <input required placeholder="材料名稱" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
          <input required type="number" step="0.0001" placeholder="密度 g/cm³" value={form.density} onChange={(event) => setForm((value) => ({ ...value, density: event.target.value }))} />
          <input required type="number" step="0.01" placeholder="抗拉強度" value={form.tensile_strength} onChange={(event) => setForm((value) => ({ ...value, tensile_strength: event.target.value }))} />
          <input required type="number" step="0.01" placeholder="單價/克" value={form.unit_price} onChange={(event) => setForm((value) => ({ ...value, unit_price: event.target.value }))} />
          <button className="ops-primary">建立</button>
        </form>

        <section className="ops-table-panel">
          <div className="ops-section-heading">
            <h2>材料清單</h2>
            <span>{materials.length} 筆</span>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>材料</th>
                  <th>密度</th>
                  <th>抗拉強度</th>
                  <th>單價</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.material_id}>
                    <td>{material.name}</td>
                    <td>{material.physical_parameters.density} g/cm³</td>
                    <td>{material.physical_parameters.tensile_strength}</td>
                    <td>${material.physical_parameters.unit_price}/克</td>
                    <td><button onClick={() => deactivate(material.material_id)} className="ops-danger">停用</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

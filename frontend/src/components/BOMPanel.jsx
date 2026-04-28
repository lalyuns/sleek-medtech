import { useEffect, useState } from 'react'
import api from '../api/client'

export default function BOMPanel({ projectId, versionId }) {
  const [bom, setBom] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!versionId) return
    setLoading(true)
    api.get(`/projects/${projectId}/versions/${versionId}/bom`)
      .then((r) => setBom(r.data))
      .catch(() => setBom(null))
      .finally(() => setLoading(false))
  }, [projectId, versionId])

  if (!versionId) return <p style={{ color: '#475569', fontSize: 13 }}>請選擇版本</p>
  if (loading) return <p style={{ color: '#64748b', fontSize: 13 }}>載入中...</p>
  if (!bom) return <p style={{ color: '#64748b', fontSize: 13 }}>無法取得 BOM 資料</p>

  const rows = [
    { label: '材料', value: bom.material_name },
    { label: '體積', value: bom.volume != null ? `${bom.volume.toFixed(2)} mm³` : '未計算' },
    { label: '單價', value: `$${bom.unit_price.toFixed(2)}` },
    { label: '材料成本', value: bom.material_cost != null ? `$${bom.material_cost.toFixed(2)}` : '—' },
  ]

  return (
    <div>
      {rows.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: '#94a3b8' }}>{label}</span>
          <span>{value}</span>
        </div>
      ))}
      {bom.other_costs.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid #334155', margin: '10px 0' }} />
          {bom.other_costs.map((c) => (
            <div key={c.cost_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: '#94a3b8' }}>{c.type}</span>
              <span>${parseFloat(c.amount).toFixed(2)}</span>
            </div>
          ))}
        </>
      )}
      <div style={{ borderTop: '1px solid #334155', margin: '10px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
        <span>總計</span>
        <span style={{ color: '#34d399' }}>${bom.total_cost.toFixed(2)}</span>
      </div>
    </div>
  )
}

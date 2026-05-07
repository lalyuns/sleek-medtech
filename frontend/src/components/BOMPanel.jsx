import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const CURRENCIES = {
  USD: '$',
  TWD: 'NT$',
  EUR: '€',
  JPY: '¥',
}

const UNIT_PRICE_LABELS = {
  per_g: '每克',
  per_kg: '每公斤',
  per_cm3: '每立方公分',
}

export default function BOMPanel({ projectId, versionId }) {
  const [bom, setBom] = useState(null)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    if (!versionId) return
    api.get(`/projects/${projectId}/versions/${versionId}/bom`)
      .then((response) => setBom(response.data))
      .catch(() => setBom(null))
  }, [projectId, versionId])

  const quote = Number(quoteAmount)
  const margin = useMemo(() => {
    if (!bom || !quote || quote <= 0) return null
    return {
      grossProfit: quote - bom.total_cost,
      grossMargin: ((quote - bom.total_cost) / quote) * 100,
    }
  }, [bom, quote])

  if (!versionId) return <p style={{ color: '#475569', fontSize: 13 }}>請先選擇版本。</p>
  if (!bom) return <p style={{ color: '#64748b', fontSize: 13 }}>尚無 BOM 資料。</p>

  const unitPriceLabel = UNIT_PRICE_LABELS[bom.unit_price_unit] || bom.unit_price_unit || '每克'
  const rows = [
    { label: '材料', value: bom.material_name },
    { label: 'STL 體積', value: bom.volume != null ? `${bom.volume.toFixed(2)} mm³` : '待解析' },
    { label: '換算體積', value: bom.material_volume_cm3 != null ? `${bom.material_volume_cm3.toFixed(4)} cm³` : '待解析' },
    { label: '密度', value: `${bom.density.toFixed(4)} g/cm³` },
    { label: '材料重量', value: bom.material_quantity != null ? `${bom.material_quantity.toFixed(4)} g` : '待解析' },
    { label: `材料單價（${unitPriceLabel}）`, value: formatMoney(bom.unit_price, currency) },
    { label: '材料成本', value: bom.material_cost != null ? formatMoney(bom.material_cost, currency) : '待解析' },
    { label: '工時成本', value: formatMoney(bom.labor_cost, currency) },
    { label: '外部打樣', value: formatMoney(bom.external_sample_cost, currency) },
  ]

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={quoteAmount}
          onChange={(event) => setQuoteAmount(event.target.value)}
          placeholder="報價金額"
          style={fieldStyle}
        />
        <select value={currency} onChange={(event) => setCurrency(event.target.value)} style={fieldStyle}>
          {Object.keys(CURRENCIES).map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </div>

      <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#93c5fd', fontSize: 12, lineHeight: 1.5 }}>
        計算規則：STL 體積 mm³ ÷ 1000 = cm³；cm³ × 密度 g/cm³ = 材料重量 g；材料重量 × 單價 = 材料成本。
      </div>

      <div>
        {rows.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, gap: 12 }}>
            <span style={{ color: '#94a3b8' }}>{label}</span>
            <span>{value}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #334155', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
          <span>總成本</span>
          <span style={{ color: '#34d399' }}>{formatMoney(bom.total_cost, currency)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #334155' }}>
        <MarginRow label="報價" value={quote > 0 ? formatMoney(quote, currency) : '尚未輸入'} />
        <MarginRow label="毛利" value={margin ? formatMoney(margin.grossProfit, currency) : '尚未輸入'} danger={margin && margin.grossProfit < 0} />
        <MarginRow label="毛利率" value={margin ? `${margin.grossMargin.toFixed(1)}%` : '尚未輸入'} danger={margin && margin.grossMargin < 0} />
      </div>
    </div>
  )
}

function MarginRow({ label, value, danger = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <strong style={{ color: danger ? '#f87171' : '#f8fafc' }}>{value}</strong>
    </div>
  )
}

function formatMoney(value, currency) {
  const symbol = CURRENCIES[currency] || ''
  return `${symbol}${Number(value).toFixed(2)}`
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

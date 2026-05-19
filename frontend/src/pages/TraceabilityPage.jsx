import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, { Background, Controls, MiniMap, MarkerType, Position, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'
import api from '../api/client'

const STATUS_LABELS = { draft: '草稿', locked: '已鎖定', uploading: '上傳中' }
const FEEDBACK_STATUS_LABELS = { submitted: '已提出', converted: '已轉需求' }
const REPORT_TYPE_LABELS = {
  material_test: '材料測試',
  inspection: '檢驗報告',
  regulatory: '法規文件',
  manufacturing: '製造文件',
  compliance: '合規文件',
  sterilization: '滅菌文件',
}

const KIND_META = {
  model_version: { label: '模型版本', color: '#2f63e6', row: 0 },
  feedback: { label: '醫師回饋', color: '#17a978', row: 1 },
  report: { label: '報告文件', color: '#f5a70a', row: 2 },
}

function versionNumber(node) {
  const match = String(node.data?.label || '').match(/v(\d+)/i)
  return match ? Number(match[1]) : 0
}

function formatDate(value) {
  if (!value) return '未記錄'
  return new Date(value).toLocaleString()
}

function compactText(value, length = 70) {
  if (!value) return ''
  return value.length > length ? `${value.slice(0, length)}...` : value
}

function layoutGraph(traceData) {
  const rawNodes = traceData.nodes || []
  const rawEdges = traceData.edges || []
  const versions = rawNodes.filter((node) => node.data?.kind === 'model_version').sort((a, b) => versionNumber(a) - versionNumber(b))
  const feedbacks = rawNodes.filter((node) => node.data?.kind === 'feedback')
  const reports = rawNodes.filter((node) => node.data?.kind === 'report')

  const versionX = new Map()
  versions.forEach((node, index) => versionX.set(node.id, index * 320))

  const childPositions = new Map()
  const placeChildren = (items, y, rowOffset) => {
    const grouped = new Map()
    rawEdges.forEach((edge) => {
      if (!items.some((node) => node.id === edge.target)) return
      if (!grouped.has(edge.source)) grouped.set(edge.source, [])
      grouped.get(edge.source).push(edge.target)
    })
    items.forEach((node, fallbackIndex) => {
      const source = rawEdges.find((edge) => edge.target === node.id)?.source
      const siblings = grouped.get(source) || [node.id]
      const siblingIndex = Math.max(0, siblings.indexOf(node.id))
      const baseX = versionX.get(source) ?? fallbackIndex * 280
      childPositions.set(node.id, {
        x: baseX + (siblingIndex - (siblings.length - 1) / 2) * 250 + rowOffset,
        y,
      })
    })
  }
  placeChildren(feedbacks, 290, -70)
  placeChildren(reports, 560, 70)

  const positions = new Map()
  versions.forEach((node, index) => positions.set(node.id, { x: index * 320, y: 40 }))
  childPositions.forEach((position, id) => positions.set(id, position))

  const nodes = rawNodes.map((node) => {
    const meta = KIND_META[node.data?.kind] || KIND_META.model_version
    return {
      ...node,
      position: positions.get(node.id) || node.position || { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: node.data?.kind === 'model_version' ? Position.Right : Position.Top,
      data: {
        ...node.data,
        title: node.data?.label,
        label: <TraceNode data={node.data} meta={meta} />,
      },
      style: {
        borderRadius: 8,
        padding: 0,
        minWidth: node.data?.kind === 'model_version' ? 230 : 250,
        maxWidth: 280,
        background: '#fff',
        border: `1px solid ${meta.color}`,
        color: '#172033',
        boxShadow: '0 10px 26px rgba(23, 32, 51, 0.12)',
      },
    }
  })

  const edges = rawEdges.map((edge, index) => {
    const stroke = edge.style?.stroke || '#64748b'
    const isVersionEdge = edge.label === 'previous version'
    return {
      ...edge,
      type: isVersionEdge ? 'smoothstep' : 'step',
      label: translateEdge(edge.label),
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
      style: {
        stroke,
        strokeWidth: isVersionEdge ? 2.5 : 2,
        strokeDasharray: edge.label === 'report' ? '8 7' : undefined,
      },
      labelStyle: { fontSize: 11, fill: '#324156', fontWeight: 800 },
      labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.95 },
      pathOptions: { offset: 32 + index * 8 },
    }
  })

  return { nodes, edges }
}

function TraceNode({ data, meta }) {
  const isVersion = data.kind === 'model_version'
  const isReport = data.kind === 'report'
  const signoffName = data.signoff_user_snapshot?.name
  return (
    <div style={{ padding: 12, textAlign: 'left' }}>
      <div style={{ color: meta.color, fontSize: 11, fontWeight: 900, letterSpacing: 0 }}>{meta.label}</div>
      <div style={{ fontWeight: 900, fontSize: 16, marginTop: 5 }}>{data.label}</div>
      {isVersion && (
        <>
          <div style={{ color: '#324156', fontSize: 12, marginTop: 4 }}>{STATUS_LABELS[data.status] || data.status}</div>
          <div style={{ color: '#66758f', fontSize: 11, marginTop: 4 }}>{formatDate(data.timestamp)}</div>
          <div style={{ color: signoffName ? '#137447' : '#a44b00', fontSize: 11, marginTop: 4 }}>
            {signoffName ? `簽核：${signoffName}` : '尚未簽核'}
          </div>
        </>
      )}
      {data.kind === 'feedback' && (
        <>
          <div style={{ color: '#324156', fontSize: 12, marginTop: 5 }}>{compactText(data.content, 58)}</div>
          <div style={{ color: '#66758f', fontSize: 11, marginTop: 5 }}>{FEEDBACK_STATUS_LABELS[data.status] || data.status}</div>
        </>
      )}
      {isReport && (
        <>
          <div style={{ color: '#324156', fontSize: 12, marginTop: 5 }}>{REPORT_TYPE_LABELS[data.report_type] || data.report_type || '未分類'}</div>
          <div style={{ color: '#66758f', fontSize: 11, marginTop: 5 }}>{formatDate(data.created_at)}</div>
        </>
      )}
    </div>
  )
}

export default function TraceabilityPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    api.get(`/projects/${id}`).then((response) => setProject(response.data)).catch(() => setProject(null))
    api.get(`/projects/${id}/versions`).then((response) => {
      setVersions(response.data)
      if (response.data.length > 0) setSelectedVersionId(response.data[response.data.length - 1].version_id)
    }).catch(() => setVersions([]))
  }, [id])

  useEffect(() => {
    if (!selectedVersionId) return
    api.get(`/projects/${id}/versions/${selectedVersionId}/traceability`).then((response) => {
      const graph = layoutGraph(response.data)
      setNodes(graph.nodes)
      setEdges(graph.edges)
      setSelectedNode(graph.nodes.find((node) => node.id === `version-${selectedVersionId}`) || graph.nodes[0] || null)
    })
  }, [id, selectedVersionId, setEdges, setNodes])

  const summary = useMemo(() => ({
    versions: nodes.filter((node) => node.data?.kind === 'model_version').length,
    feedbacks: nodes.filter((node) => node.data?.kind === 'feedback').length,
    reports: nodes.filter((node) => node.data?.kind === 'report').length,
  }), [nodes])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f3f6fa', color: '#172033' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid #dbe3ef', background: '#fff' }}>
        <button onClick={() => navigate(`/projects/${id}`)} style={secondaryButton}>返回</button>
        <div>
          <h2 style={{ margin: 0 }}>{project?.name || `專案 #${id}`} / 溯源圖</h2>
          <div style={{ color: '#66758f', fontSize: 12, marginTop: 3 }}>
            版本脈絡、醫師回饋、報告證據與簽核資訊
          </div>
        </div>
        {versions.length > 0 && (
          <select
            value={selectedVersionId || ''}
            onChange={(event) => setSelectedVersionId(Number(event.target.value))}
            style={{ marginLeft: 'auto', padding: '8px 12px', borderRadius: 6, border: '1px solid #d2dbe8', background: '#f8fafc', color: '#172033' }}
          >
            {versions.map((version) => (
              <option key={version.version_id} value={version.version_id}>
                v{version.version_number} / {STATUS_LABELS[version.status] || version.status}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', minHeight: 0 }}>
        <div style={{ position: 'relative', minHeight: 0 }}>
          {versions.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              目前沒有模型版本可供溯源。
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => setSelectedNode(node)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.25}
              style={{ background: '#f8fafc' }}
            >
              <Background color="#d7e0eb" gap={20} />
              <Controls />
              <MiniMap
                nodeColor={(node) => (KIND_META[node.data?.kind] || KIND_META.model_version).color}
                style={{ background: '#fff', border: '1px solid #dbe3ef' }}
              />
            </ReactFlow>
          )}
        </div>

        <aside style={{ borderLeft: '1px solid #dbe3ef', background: '#fff', padding: 18, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            <MiniStat label="版本" value={summary.versions} color="#2f63e6" />
            <MiniStat label="回饋" value={summary.feedbacks} color="#137447" />
            <MiniStat label="報告" value={summary.reports} color="#a44b00" />
          </div>
          <h3 style={{ margin: '0 0 14px' }}>節點資訊</h3>
          <NodeDetails node={selectedNode} />
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #dbe3ef' }}>
            <h4 style={{ margin: '0 0 10px' }}>圖例</h4>
            {Object.entries(KIND_META).map(([kind, meta]) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#324156', fontSize: 13, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: meta.color }} />
                {meta.label}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
      <div style={{ color: '#66758f', fontSize: 11 }}>{label}</div>
      <div style={{ color, fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function NodeDetails({ node }) {
  if (!node) return <p style={{ color: '#64748b', fontSize: 13 }}>選擇節點查看詳細資料。</p>

  const data = node.data || {}
  const rows = [
    ['類型', KIND_META[data.kind]?.label || data.kind],
    ['標題', data.title || data.label],
    ['狀態', data.kind === 'feedback' ? FEEDBACK_STATUS_LABELS[data.status] : STATUS_LABELS[data.status]],
    ['建立時間', formatDate(data.timestamp || data.created_at)],
    ['簽核者', data.signoff_user_snapshot?.name],
    ['簽核時間', formatDate(data.signed_off_at)],
    ['簽核理由', data.signoff_reason],
    ['報告類型', REPORT_TYPE_LABELS[data.report_type] || data.report_type],
    ['材料 ID', data.material_id],
    ['內容', data.content],
    ['Hash', data.hash_value],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== '未記錄')

  return (
    <div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ color: '#66758f', fontSize: 12 }}>{label}</div>
          <div style={{ color: '#172033', fontSize: 13, wordBreak: label === 'Hash' ? 'break-all' : 'normal', marginTop: 3 }}>{value}</div>
        </div>
      ))}
      {data.file_url && (
        <a href={data.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', color: '#2f63e6', fontSize: 13, marginTop: 4 }}>
          開啟報告檔案
        </a>
      )}
    </div>
  )
}

function translateEdge(label) {
  return ({ 'previous version': '前一版', feedback: '回饋', report: '報告' })[label] || label
}

const secondaryButton = { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#5b6b82', color: '#fff', cursor: 'pointer', fontWeight: 800 }

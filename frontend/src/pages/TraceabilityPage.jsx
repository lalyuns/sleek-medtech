import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import api from '../api/client'

const STATUS_COLOR = {
  draft: '#3b82f6',
  locked: '#22c55e',
  uploading: '#f59e0b',
}

function buildGraph(traceData, versionId) {
  const nodes = traceData.nodes.map((n, i) => ({
    id: `v${n.version_id}`,
    position: { x: i * 200, y: n.version_number % 2 === 0 ? 80 : 0 },
    data: {
      label: (
        <div style={{ textAlign: 'center', fontSize: 12 }}>
          <div style={{ fontWeight: 700 }}>v{n.version_number}</div>
          <div style={{ fontSize: 10, color: STATUS_COLOR[n.status] || '#94a3b8' }}>{n.status}</div>
          {n.description && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{n.description}</div>}
        </div>
      ),
    },
    style: {
      background: n.version_id === versionId ? '#1d4ed8' : '#1e293b',
      border: `2px solid ${STATUS_COLOR[n.status] || '#475569'}`,
      borderRadius: 8,
      color: '#f1f5f9',
      padding: '8px 12px',
      minWidth: 90,
    },
  }))

  const edges = traceData.edges
    .filter((e) => e.target_type === 'old_version')
    .map((e) => ({
      id: `e${e.source_version_id}-${e.target_id}`,
      source: `v${e.source_version_id}`,
      target: `v${e.target_id}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: { stroke: '#64748b' },
      label: 'derives from',
      labelStyle: { fontSize: 10, fill: '#94a3b8' },
    }))

  return { nodes, edges }
}

export default function TraceabilityPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get(`/projects/${id}/versions`).then((r) => {
      setVersions(r.data)
      if (r.data.length > 0) setSelectedVersionId(r.data[r.data.length - 1].version_id)
    })
  }, [id])

  useEffect(() => {
    if (!selectedVersionId) return
    setLoading(true)
    api.get(`/projects/${id}/versions/${selectedVersionId}/traceability`)
      .then((r) => {
        const { nodes: n, edges: e } = buildGraph(r.data, selectedVersionId)
        setNodes(n)
        setEdges(e)
      })
      .finally(() => setLoading(false))
  }, [selectedVersionId, id])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid #1e293b' }}>
        <button onClick={() => navigate(`/projects/${id}`)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer' }}>← 返回</button>
        <h2>溯源圖 — 專案 #{id}</h2>
        {versions.length > 0 && (
          <select
            value={selectedVersionId || ''}
            onChange={(e) => setSelectedVersionId(Number(e.target.value))}
            style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }}
          >
            {versions.map((v) => (
              <option key={v.version_id} value={v.version_id}>
                v{v.version_number} — {v.status}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {versions.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            此專案尚無版本，請先上傳模型
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            載入中...
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            fitView
            style={{ background: '#0f172a' }}
          >
            <Background color="#1e293b" gap={20} />
            <Controls />
            <MiniMap nodeColor={(n) => n.style?.border?.includes('22c55e') ? '#22c55e' : '#3b82f6'} style={{ background: '#1e293b' }} />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}

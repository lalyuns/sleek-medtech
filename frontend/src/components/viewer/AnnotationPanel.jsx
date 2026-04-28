import useViewerStore from '../../store/viewerStore'

export default function AnnotationPanel() {
  const { annotations, removeAnnotation } = useViewerStore()
  if (annotations.length === 0) return null

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, background: 'rgba(15,23,42,0.9)',
      border: '1px solid #334155', borderRadius: 8, padding: '12px 16px', color: '#f1f5f9',
      minWidth: 180, maxHeight: 300, overflowY: 'auto',
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>標註列表</div>
      {annotations.map((a) => (
        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
          <span style={{ fontSize: 12 }}>📌 {a.text}</span>
          <button
            onClick={() => removeAnnotation(a.id)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}
          >✕</button>
        </div>
      ))}
    </div>
  )
}

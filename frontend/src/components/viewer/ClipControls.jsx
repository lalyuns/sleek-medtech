import useViewerStore from '../../store/viewerStore'

const AXES = ['x', 'y', 'z']
const COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' }

export default function ClipControls() {
  const { clipAxes, setClip } = useViewerStore()

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, background: 'rgba(15,23,42,0.9)',
      border: '1px solid #334155', borderRadius: 8, padding: '12px 16px', color: '#f1f5f9',
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>剖面控制</div>
      {AXES.map((axis) => (
        <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <button
            onClick={() => setClip(axis, { enabled: !clipAxes[axis].enabled })}
            style={{
              width: 28, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: clipAxes[axis].enabled ? COLORS[axis] : '#334155',
              color: '#fff', fontSize: 11, fontWeight: 700,
            }}
          >
            {axis.toUpperCase()}
          </button>
          <input
            type="range" min={-5} max={5} step={0.1}
            value={clipAxes[axis].constant}
            onChange={(e) => setClip(axis, { constant: parseFloat(e.target.value) })}
            disabled={!clipAxes[axis].enabled}
            style={{ width: 100, accentColor: COLORS[axis] }}
          />
          <span style={{ fontSize: 11, color: '#94a3b8', width: 32 }}>{clipAxes[axis].constant.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

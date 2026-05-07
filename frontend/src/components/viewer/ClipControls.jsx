import useViewerStore from '../../store/viewerStore'

const AXES = ['x', 'y', 'z']
const COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' }

export default function ClipControls() {
  const { clipAxes, clipRange, setClip } = useViewerStore()

  const resetCuts = () => {
    AXES.forEach((axis) => setClip(axis, { enabled: false, constant: 0 }))
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: 16,
      background: 'rgba(15,23,42,0.9)',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '14px 16px',
      color: '#f1f5f9',
      width: 300,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 800 }}>剖面切割</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>依 XYZ 軸切開模型</div>
        </div>
        <button
          type="button"
          onClick={resetCuts}
          style={{ border: '1px solid #334155', background: '#0f172a', color: '#cbd5e1', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 12 }}
        >
          重設
        </button>
      </div>
      {AXES.map((axis) => (
        <div key={axis} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 52px', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <button
            type="button"
            onClick={() => setClip(axis, { enabled: !clipAxes[axis].enabled })}
            title={`切換 ${axis.toUpperCase()} 軸剖面`}
            style={{
              height: 30,
              borderRadius: 6,
              border: `1px solid ${clipAxes[axis].enabled ? COLORS[axis] : '#334155'}`,
              cursor: 'pointer',
              background: clipAxes[axis].enabled ? COLORS[axis] : '#0f172a',
              color: clipAxes[axis].enabled ? '#fff' : '#cbd5e1',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {axis.toUpperCase()} 軸
          </button>
          <input
            type="range"
            min={clipRange.min}
            max={clipRange.max}
            step={clipRange.step}
            value={clipAxes[axis].constant}
            onChange={(event) => setClip(axis, { constant: parseFloat(event.target.value) })}
            disabled={!clipAxes[axis].enabled}
            title={`${axis.toUpperCase()} 軸切割深度`}
            style={{ width: '100%', accentColor: COLORS[axis], opacity: clipAxes[axis].enabled ? 1 : 0.35 }}
          />
          <span style={{ fontSize: 12, color: clipAxes[axis].enabled ? '#e2e8f0' : '#64748b', textAlign: 'right' }}>
            {clipAxes[axis].enabled ? clipAxes[axis].constant.toFixed(0) : '關閉'}
          </span>
        </div>
      ))}
    </div>
  )
}

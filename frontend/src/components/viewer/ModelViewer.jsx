import { Suspense, useState, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Html, Grid, Center } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import useViewerStore from '../../store/viewerStore'
import ClipControls from './ClipControls'
import AnnotationPanel from './AnnotationPanel'

function STLMesh({ url }) {
  const geometry = useLoader(STLLoader, url)
  const { clipAxes, setPendingPoint } = useViewerStore()

  const clippingPlanes = useMemo(() => {
    const planes = []
    if (clipAxes.x.enabled) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipAxes.x.constant))
    if (clipAxes.y.enabled) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), clipAxes.y.constant))
    if (clipAxes.z.enabled) planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), clipAxes.z.constant))
    return planes
  }, [clipAxes])

  return (
    <Center>
      <mesh
        geometry={geometry}
        onClick={(e) => { e.stopPropagation(); setPendingPoint(e.point) }}
      >
        <meshStandardMaterial color="#60a5fa" clippingPlanes={clippingPlanes} side={THREE.DoubleSide} />
      </mesh>
    </Center>
  )
}

function DemoBox() {
  const { setPendingPoint } = useViewerStore()
  return (
    <mesh onClick={(e) => { e.stopPropagation(); setPendingPoint(e.point) }}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#60a5fa" />
    </mesh>
  )
}

function AnnotationPins() {
  const { annotations, removeAnnotation } = useViewerStore()
  return annotations.map((a) => (
    <Html key={a.id} position={[a.position.x, a.position.y, a.position.z]} distanceFactor={5}>
      <div
        style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
        onClick={() => removeAnnotation(a.id)}
        title="點擊刪除"
      >
        📌 {a.text}
      </div>
    </Html>
  ))
}

function PendingAnnotation() {
  const { pendingPoint, addAnnotation, setPendingPoint } = useViewerStore()
  const [text, setText] = useState('')
  if (!pendingPoint) return null
  return (
    <Html position={[pendingPoint.x, pendingPoint.y, pendingPoint.z]} distanceFactor={5}>
      <div style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 6, padding: 8, display: 'flex', gap: 4 }}>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { addAnnotation(pendingPoint, text.trim()); setText('') } if (e.key === 'Escape') { setPendingPoint(null); setText('') } }}
          placeholder="標註文字 Enter 確認"
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#0f172a', color: '#f1f5f9', width: 140 }}
        />
        <button onClick={() => { setPendingPoint(null); setText('') }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
      </div>
    </Html>
  )
}

export default function ModelViewer({ fileUrl }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ localClippingEnabled: true }}
        style={{ background: '#0f172a' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <Grid infiniteGrid fadeDistance={30} cellColor="#1e293b" sectionColor="#334155" />
        <OrbitControls makeDefault />
        <Suspense fallback={null}>
          {fileUrl ? <STLMesh url={fileUrl} /> : <DemoBox />}
        </Suspense>
        <AnnotationPins />
        <PendingAnnotation />
      </Canvas>
      <ClipControls />
      <AnnotationPanel />
    </div>
  )
}

import { Suspense, useEffect, useState, useMemo, useRef, Component } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'
import useViewerStore from '../../store/viewerStore'
import ClipControls from './ClipControls'
import AnnotationPanel from './AnnotationPanel'
import api from '../../api/client'

const previousThreeConsoleFunction = THREE.getConsoleFunction?.()
THREE.setConsoleFunction?.((type, message, ...params) => {
  if (type === 'warn' && message === 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.') {
    return
  }
  if (previousThreeConsoleFunction) {
    previousThreeConsoleFunction(type, message, ...params)
    return
  }
  const consoleMethod = console[type] || console.log
  consoleMethod(message, ...params)
})

class ViewerErrorBoundary extends Component {
  state = { error: false }

  static getDerivedStateFromError() {
    return { error: true }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 13 }}>
          無法載入 3D 模型。
        </div>
      )
    }
    return this.props.children
  }
}

function STLMesh({ url, controlsRef, canWriteFeedback, onPickPoint }) {
  const loadedGeometry = useLoader(STLLoader, url)
  const { camera } = useThree()
  const { clipAxes, setClipRange } = useViewerStore()
  const geometry = useMemo(() => {
    const centeredGeometry = loadedGeometry.clone()
    centeredGeometry.center()
    return centeredGeometry
  }, [loadedGeometry])

  const clippingPlanes = useMemo(() => {
    const planes = []
    if (clipAxes.x.enabled) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipAxes.x.constant))
    if (clipAxes.y.enabled) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), clipAxes.y.constant))
    if (clipAxes.z.enabled) planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), clipAxes.z.constant))
    return planes
  }, [clipAxes])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  // Three.js camera and controls are external mutable objects; this effect fits the loaded STL into view.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const box = geometry.boundingBox
    const sphere = geometry.boundingSphere
    if (!box || !sphere) return

    const size = new THREE.Vector3()
    box.getSize(size)
    const maxSize = Math.max(size.x, size.y, size.z, 1)
    const range = Math.ceil(maxSize * 0.7)
    setClipRange({ min: -range, max: range, step: Math.max(0.1, Math.round(range / 60)) })

    const radius = Math.max(sphere.radius, maxSize * 0.5, 1)
    const distance = radius * 2.4
    /* eslint-disable react-hooks/immutability */
    camera.position.set(distance, distance * 0.9, distance)
    camera.near = Math.max(0.01, radius / 100)
    camera.far = radius * 20
    camera.updateProjectionMatrix()
    camera.lookAt(0, 0, 0)
    /* eslint-enable react-hooks/immutability */
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
      controlsRef.current.saveState()
    }
  }, [camera, controlsRef, geometry, setClipRange])

  return (
    <mesh geometry={geometry} onClick={(event) => { event.stopPropagation(); if (canWriteFeedback) onPickPoint(event.point) }}>
      <meshStandardMaterial color="#60a5fa" clippingPlanes={clippingPlanes} side={THREE.DoubleSide} />
    </mesh>
  )
}

function AnnotationPins() {
  const { annotations } = useViewerStore()
  return annotations.map((annotation) => (
    <group key={annotation.id} position={[annotation.position.x, annotation.position.y, annotation.position.z]}>
      <mesh>
        <sphereGeometry args={[0.11, 14, 14]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.25} depthTest={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.26, 24]} />
        <meshBasicMaterial color="#fde68a" side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  ))
}

function PendingAnnotationMarker() {
  const { pendingPoint } = useViewerStore()
  if (!pendingPoint) return null

  return (
    <group position={[pendingPoint.x, pendingPoint.y, pendingPoint.z]}>
      <mesh>
        <sphereGeometry args={[0.16, 18, 18]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.35} depthTest={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 32]} />
        <meshBasicMaterial color="#fde68a" side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  )
}

function SceneControls({ controlsRef, mouseButtons }) {
  const { camera, gl } = useThree()
  const controls = useMemo(() => {
    const instance = new ThreeOrbitControls(camera, gl.domElement)
    instance.enableDamping = true
    instance.enablePan = true
    instance.mouseButtons = mouseButtons
    return instance
  }, [camera, gl.domElement, mouseButtons])

  useEffect(() => {
    controlsRef.current = controls
    return () => {
      controlsRef.current = null
      controls.dispose()
    }
  }, [controls, controlsRef])

  useFrameControls(controls)
  return null
}

function useFrameControls(controls) {
  const frame = useThree((state) => state.invalidate)
  useFrame(() => {
    controls.update()
  }, -1)

  useEffect(() => {
    const invalidate = () => frame()
    controls.addEventListener('change', invalidate)
    return () => controls.removeEventListener('change', invalidate)
  }, [controls, frame])
}

export default function ModelViewer({ fileUrl, projectId, versionId, canWriteFeedback = true }) {
  const { setPendingPoint, setAnnotations, updateAnnotation, removeAnnotation } = useViewerStore()
  const [controlMode, setControlMode] = useState('rotate')
  const [modelUrl, setModelUrl] = useState(null)
  const controlsRef = useRef(null)

  const mouseButtons = useMemo(() => (
    controlMode === 'pan'
      ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
  ), [controlMode])

  useEffect(() => {
    if (!projectId || !versionId) {
      Promise.resolve().then(() => setModelUrl(fileUrl || null))
      return
    }
    api.get(`/projects/${projectId}/versions/${versionId}/file-url`)
      .then((response) => setModelUrl(response.data.file_url))
      .catch(() => setModelUrl(fileUrl || null))
  }, [fileUrl, projectId, versionId])

  useEffect(() => {
    setPendingPoint(null)
    if (!projectId || !versionId) {
      setAnnotations([])
      return
    }
    api.get(`/projects/${projectId}/versions/${versionId}/feedbacks`)
      .then((response) => {
        setAnnotations(response.data
          .filter((feedback) => feedback.coordinates)
          .map((feedback) => ({
            id: feedback.feedback_id,
            position: feedback.coordinates,
            text: feedback.content,
          })))
      })
      .catch(() => setAnnotations([]))
  }, [projectId, versionId, setAnnotations, setPendingPoint])

  const deleteAnnotation = async (feedbackId) => {
    if (!projectId || !versionId) return
    await api.delete(`/projects/${projectId}/versions/${versionId}/feedbacks/${feedbackId}`)
    removeAnnotation(feedbackId)
  }

  const saveAnnotation = async (feedbackId, content) => {
    if (!projectId || !versionId) return
    const { data } = await api.put(`/projects/${projectId}/versions/${versionId}/feedbacks/${feedbackId}`, { content })
    updateAnnotation(feedbackId, data.content)
  }

  const pickPoint = (point) => {
    setPendingPoint(point)
  }

  return (
    <ViewerErrorBoundary>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {!modelUrl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.86)', border: '1px solid #334155', borderRadius: 8, padding: 18, color: '#cbd5e1', textAlign: 'center', maxWidth: 320 }}>
              <strong style={{ color: '#f1f5f9' }}>尚未載入 STL</strong>
              <div style={{ fontSize: 13, marginTop: 6 }}>上傳模型版本後即可檢視真實幾何，並使用剖面與註記功能。</div>
            </div>
          </div>
        )}
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          gl={{ localClippingEnabled: true }}
          style={{ background: '#0f172a' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <gridHelper args={[120, 80, '#334155', '#1e293b']} />
          <SceneControls controlsRef={controlsRef} mouseButtons={mouseButtons} />
          <Suspense fallback={null}>
            {modelUrl ? <STLMesh url={modelUrl} controlsRef={controlsRef} canWriteFeedback={canWriteFeedback} onPickPoint={pickPoint} /> : null}
          </Suspense>
          <AnnotationPins />
          {canWriteFeedback && <PendingAnnotationMarker />}
        </Canvas>
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 6,
          display: 'flex',
          gap: 8,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 8,
        }}>
          <button type="button" title="左鍵拖曳旋轉模型" onClick={() => setControlMode('rotate')} style={controlButtonStyle(controlMode === 'rotate')}>旋轉</button>
          <button type="button" title="左鍵拖曳平移視角" onClick={() => setControlMode('pan')} style={controlButtonStyle(controlMode === 'pan')}>平移</button>
          <button type="button" title="重設相機" onClick={() => controlsRef.current?.reset()} style={controlButtonStyle(false)}>重設視角</button>
        </div>
        <ClipControls />
        <AnnotationPanel onDelete={deleteAnnotation} onUpdate={saveAnnotation} />
      </div>
    </ViewerErrorBoundary>
  )
}

function controlButtonStyle(active) {
  return {
    border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
    background: active ? '#2563eb' : '#0f172a',
    color: '#f8fafc',
    borderRadius: 6,
    padding: '7px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  }
}

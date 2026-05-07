import { create } from 'zustand'

const useViewerStore = create((set) => ({
  clipAxes: {
    x: { enabled: false, constant: 0 },
    y: { enabled: false, constant: 0 },
    z: { enabled: false, constant: 0 },
  },
  clipRange: { min: -60, max: 60, step: 1 },
  annotations: [],
  pendingPoint: null,

  setClip: (axis, values) =>
    set((s) => ({ clipAxes: { ...s.clipAxes, [axis]: { ...s.clipAxes[axis], ...values } } })),

  setClipRange: (clipRange) => set({ clipRange }),

  setPendingPoint: (point) => set({ pendingPoint: point }),

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (position, text, id = Date.now()) =>
    set((s) => ({
      annotations: [...s.annotations, { id, position, text }],
      pendingPoint: null,
    })),

  updateAnnotation: (id, text) =>
    set((s) => ({ annotations: s.annotations.map((a) => (a.id === id ? { ...a, text } : a)) })),

  removeAnnotation: (id) =>
    set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
}))

export default useViewerStore

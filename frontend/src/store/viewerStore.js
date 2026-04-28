import { create } from 'zustand'

const useViewerStore = create((set) => ({
  clipAxes: {
    x: { enabled: false, constant: 0 },
    y: { enabled: false, constant: 0 },
    z: { enabled: false, constant: 0 },
  },
  annotations: [],
  pendingPoint: null,

  setClip: (axis, values) =>
    set((s) => ({ clipAxes: { ...s.clipAxes, [axis]: { ...s.clipAxes[axis], ...values } } })),

  setPendingPoint: (point) => set({ pendingPoint: point }),

  addAnnotation: (position, text) =>
    set((s) => ({
      annotations: [...s.annotations, { id: Date.now(), position, text }],
      pendingPoint: null,
    })),

  removeAnnotation: (id) =>
    set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
}))

export default useViewerStore

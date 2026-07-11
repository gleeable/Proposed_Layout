import { create } from 'zustand';

export function createViewerStore() {
  return create((set) => ({
    activeView: 'iso',
    autoRotate: false,
    bounds: null,
    setActiveView: (view) => set({ activeView: view }),
    toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
    setBounds: (bounds) => set({ bounds }),
  }));
}

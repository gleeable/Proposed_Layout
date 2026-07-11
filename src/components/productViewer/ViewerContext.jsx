import { createContext, useContext } from 'react';

export const ViewerStoreContext = createContext(null);

export function useViewerStore(selector) {
  const store = useContext(ViewerStoreContext);
  if (!store) {
    throw new Error('useViewerStore must be used within a <ProductViewer>');
  }
  return store(selector);
}

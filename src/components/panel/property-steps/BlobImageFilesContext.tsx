'use client';

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

type BlobImageFilesApi = {
  registerBlob: (blobUrl: string, file: File) => void;
  unregisterBlob: (blobUrl: string) => void;
  getFileForBlob: (blobUrl: string) => File | undefined;
};

export const BlobImageFilesContext = createContext<BlobImageFilesApi | null>(null);

export function BlobImageFilesProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<Map<string, File>>(new Map());

  const registerBlob = useCallback((blobUrl: string, file: File) => {
    mapRef.current.set(blobUrl, file);
  }, []);

  const unregisterBlob = useCallback((blobUrl: string) => {
    mapRef.current.delete(blobUrl);
  }, []);

  const getFileForBlob = useCallback((blobUrl: string) => mapRef.current.get(blobUrl), []);

  const value = useMemo(
    () => ({ registerBlob, unregisterBlob, getFileForBlob }),
    [registerBlob, unregisterBlob, getFileForBlob]
  );

  return <BlobImageFilesContext.Provider value={value}>{children}</BlobImageFilesContext.Provider>;
}

export function useBlobImageFilesContext(): BlobImageFilesApi | null {
  return useContext(BlobImageFilesContext);
}

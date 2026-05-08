/**
 * Hook para usar el Web Worker de procesamiento de imágenes
 * Proporciona una API simple para procesar imágenes sin bloquear la UI
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface ProcessOptions {
  quality?: number;
  batchSize?: number;
}

interface ThumbnailOptions {
  maxSize?: number;
  batchSize?: number;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  total: number;
  completed: number;
}

interface ImageTask {
  id: number;
  imageData: Uint8Array;
}

interface ProcessedResult {
  id: number;
  data: Uint8Array;
}

interface ThumbnailResult {
  id: number;
  thumbnailUrl: string;
}

type ProcessCallback = (result: ProcessedResult) => void;
type ThumbnailCallback = (result: ThumbnailResult) => void;
type CompleteCallback = () => void;

export function useImageWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, {
    onProgress?: ProcessCallback | ThumbnailCallback;
    onComplete?: CompleteCallback;
  }>>(new Map());
  
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    total: 0,
    completed: 0
  });

  // Inicializar worker
  useEffect(() => {
    // Crear worker usando import del archivo TypeScript
    // Vite manejará automáticamente la compilación del worker
    const worker = new Worker(
      new URL('../workers/imageWorker.ts', import.meta.url),
      { type: 'module' }
    );
    
    workerRef.current = worker;
    
    worker.onmessage = (event) => {
      const { type, batchId, completed, total, result } = event.data;
      
      const callbacks = callbacksRef.current.get(batchId);
      
      switch (type) {
        case 'progress':
          setState(prev => ({
            ...prev,
            completed,
            total,
            progress: total > 0 ? (completed / total) * 100 : 0
          }));
          
          if (result && callbacks?.onProgress) {
            (callbacks.onProgress as ProcessCallback)(result);
          }
          break;
          
        case 'thumbnailProgress':
          setState(prev => ({
            ...prev,
            completed,
            total,
            progress: total > 0 ? (completed / total) * 100 : 0
          }));
          
          if (result && callbacks?.onProgress) {
            (callbacks.onProgress as ThumbnailCallback)(result);
          }
          break;
          
        case 'complete':
        case 'thumbnailsComplete':
          setState(prev => ({
            ...prev,
            isProcessing: false,
            progress: 100
          }));
          
          if (callbacks?.onComplete) {
            callbacks.onComplete();
          }
          callbacksRef.current.delete(batchId);
          break;
          
        case 'cancelled':
          setState({
            isProcessing: false,
            progress: 0,
            total: 0,
            completed: 0
          });
          callbacksRef.current.delete(batchId);
          break;
      }
    };
    
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    };
    
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  /**
   * Procesa un lote de imágenes convirtiéndolas a JPEG
   */
  const processImages = useCallback((
    images: ImageTask[],
    onProgress: ProcessCallback,
    onComplete: CompleteCallback,
    options: ProcessOptions = {}
  ): string => {
    const { quality = 0.95, batchSize = 5 } = options;
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Guardar callbacks
    callbacksRef.current.set(batchId, { onProgress, onComplete });
    
    setState({
      isProcessing: true,
      progress: 0,
      total: images.length,
      completed: 0
    });
    
    // Procesar en lotes pequeños para mejor rendimiento
    const processBatch = async () => {
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        workerRef.current?.postMessage({
          type: 'processBatch',
          images: batch,
          quality,
          batchId: `${batchId}_${i}`
        });
        
        // Pequeña pausa entre lotes para permitir actualizaciones de UI
        if (i + batchSize < images.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };
    
    processBatch();
    
    return batchId;
  }, []);

  /**
   * Genera miniaturas para un conjunto de imágenes
   */
  const generateThumbnails = useCallback((
    images: ImageTask[],
    onProgress: ThumbnailCallback,
    onComplete: CompleteCallback,
    options: ThumbnailOptions = {}
  ): string => {
    const { maxSize = 300, batchSize = 8 } = options;
    const batchId = `thumbs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    callbacksRef.current.set(batchId, { onProgress, onComplete });
    
    setState({
      isProcessing: true,
      progress: 0,
      total: images.length,
      completed: 0
    });
    
    // Procesar en lotes
    const processBatch = async () => {
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        workerRef.current?.postMessage({
          type: 'generateThumbnails',
          images: batch,
          maxSize,
          batchId: `${batchId}_${i}`
        });
        
        if (i + batchSize < images.length) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
    };
    
    processBatch();
    
    return batchId;
  }, []);

  /**
   * Cancela el procesamiento actual
   */
  const cancelProcessing = useCallback((batchId: string) => {
    workerRef.current?.postMessage({
      type: 'cancel',
      batchId
    });
  }, []);

  return {
    processImages,
    generateThumbnails,
    cancelProcessing,
    isProcessing: state.isProcessing,
    progress: state.progress,
    completed: state.completed,
    total: state.total
  };
}

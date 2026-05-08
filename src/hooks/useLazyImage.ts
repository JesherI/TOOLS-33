/**
 * Hook para lazy loading de imágenes usando Intersection Observer
 * Solo carga las imágenes cuando son visibles en el viewport
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface LazyImageOptions {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  maxSize?: number;
}

interface LazyImageState {
  isVisible: boolean;
  hasTriggered: boolean;
}

/**
 * Hook que detecta cuando un elemento entra en el viewport
 * Útil para cargar imágenes solo cuando son visibles
 */
export function useLazyImage<T extends HTMLElement = HTMLDivElement>(
  options: LazyImageOptions = {}
): [(node: T | null) => void, LazyImageState] {
  const { 
    rootMargin = '100px', // Cargar imágenes 100px antes de que sean visibles
    threshold = 0.1,
    triggerOnce = true 
  } = options;
  
  const [state, setState] = useState<LazyImageState>({
    isVisible: false,
    hasTriggered: false
  });
  
  const elementRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: T | null) => {
    // Limpiar observer anterior
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    elementRef.current = node;
    
    if (!node) return;
    
    // Si ya se disparó y solo queremos una vez, no observar de nuevo
    if (triggerOnce && state.hasTriggered) return;
    
    // Crear nuevo observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setState({
              isVisible: true,
              hasTriggered: true
            });
            
            if (triggerOnce && observerRef.current) {
              observerRef.current.disconnect();
            }
          } else if (!triggerOnce) {
            setState(prev => ({
              ...prev,
              isVisible: false
            }));
          }
        });
      },
      {
        root: null,
        rootMargin,
        threshold
      }
    );
    
    observerRef.current.observe(node);
  }, [rootMargin, threshold, triggerOnce, state.hasTriggered]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [setRef, state];
}

/**
 * Hook para cargar imágenes de forma lazy con estado de carga
 */
export function useLazyImageLoad(
  imageData: Uint8Array | null,
  options: LazyImageOptions & { enabled?: boolean } = {}
): {
  imageUrl: string | null;
  isLoading: boolean;
  isVisible: boolean;
  setRef: (node: HTMLDivElement | null) => void;
} {
  const { enabled = true, ...lazyOptions } = options;
  const [setRef, { isVisible }] = useLazyImage<HTMLDivElement>(lazyOptions);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!enabled || !imageData) {
      setImageUrl(null);
      return;
    }
    
    if (!isVisible) {
      // Aún no es visible, no cargar
      return;
    }
    
    // Crear URL para la imagen
    setIsLoading(true);
    
    // Usar requestIdleCallback si está disponible para no bloquear
    const createUrl = () => {
      try {
        const blob = new Blob([imageData]);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        setIsLoading(false);
      } catch (error) {
        console.error('Error creating image URL:', error);
        setIsLoading(false);
      }
    };
    
    if ('requestIdleCallback' in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(createUrl, { timeout: 100 });
      return () => {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
      };
    } else {
      // Fallback para navegadores sin requestIdleCallback
      const timeoutId = setTimeout(createUrl, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [imageData, isVisible, enabled]);
  
  // Cleanup URL cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);
  
  return {
    imageUrl,
    isLoading,
    isVisible,
    setRef
  };
}

/**
 * Hook para procesar imágenes en lotes pequeños
 * Útil para no bloquear el hilo principal
 */
export function useBatchProcessor<T, R>(
  processor: (item: T) => Promise<R>,
  options: { batchSize?: number; delayBetweenBatches?: number } = {}
) {
  const { batchSize = 5, delayBetweenBatches = 50 } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const abortRef = useRef(false);

  const processBatch = useCallback(async (
    items: T[],
    onItemComplete?: (result: R, index: number) => void,
    onComplete?: () => void
  ) => {
    if (items.length === 0) {
      onComplete?.();
      return;
    }
    
    setIsProcessing(true);
    setProgress({ completed: 0, total: items.length });
    abortRef.current = false;
    
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      if (abortRef.current) break;
      
      const batch = items.slice(i, i + batchSize);
      
      // Procesar batch actual
      for (let j = 0; j < batch.length; j++) {
        if (abortRef.current) break;
        
        try {
          const result = await processor(batch[j]);
          results.push(result);
          const completed = i + j + 1;
          setProgress({ completed, total: items.length });
          onItemComplete?.(result, completed - 1);
        } catch (error) {
          console.error('Error processing item:', error);
        }
      }
      
      // Pausa entre batches para permitir actualizaciones de UI
      if (i + batchSize < items.length && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    setIsProcessing(false);
    onComplete?.();
    
    return results;
  }, [processor, batchSize, delayBetweenBatches]);

  const cancel = useCallback(() => {
    abortRef.current = true;
    setIsProcessing(false);
  }, []);

  return {
    processBatch,
    cancel,
    isProcessing,
    progress
  };
}

/**
 * Web Worker para procesamiento de imágenes
 * Este worker corre en un hilo separado para no bloquear la UI
 */

interface ImageProcessMessage {
  type: 'processBatch';
  images: Array<{
    id: number;
    imageData: Uint8Array;
    targetWidth?: number;
    targetHeight?: number;
  }>;
  quality: number;
  batchId: string;
}

interface ThumbnailMessage {
  type: 'generateThumbnails';
  images: Array<{
    id: number;
    imageData: Uint8Array;
  }>;
  maxSize: number;
  batchId: string;
}

interface CancelMessage {
  type: 'cancel';
  batchId: string;
}

type WorkerMessage = ImageProcessMessage | ThumbnailMessage | CancelMessage;

// Cache para OffscreenCanvas (reutilizar entre operaciones)
let canvasCache: OffscreenCanvas | null = null;
let ctxCache: OffscreenCanvasRenderingContext2D | null = null;

/**
 * Obtiene o crea un canvas reutilizable
 */
function getCanvas(width: number, height: number): { canvas: OffscreenCanvas; ctx: OffscreenCanvasRenderingContext2D } {
  if (!canvasCache || canvasCache.width < width || canvasCache.height < height) {
    canvasCache = new OffscreenCanvas(width, height);
    ctxCache = canvasCache.getContext('2d', { alpha: false })!;
  }
  
  // Redimensionar si es necesario
  if (canvasCache.width !== width || canvasCache.height !== height) {
    canvasCache.width = width;
    canvasCache.height = height;
  }
  
  return { canvas: canvasCache, ctx: ctxCache! };
}

/**
 * Convierte una imagen a JPEG usando Canvas en el worker
 */
async function convertToJpeg(
  imageData: Uint8Array, 
  quality: number = 0.95
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageData]);
    const url = URL.createObjectURL(blob);
    
    // Crear imagen bitmap (más eficiente que Image en workers)
    createImageBitmap(blob)
      .then(bitmap => {
        const { canvas, ctx } = getCanvas(bitmap.width, bitmap.height);
        
        // Limpiar canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, bitmap.width, bitmap.height);
        
        // Dibujar imagen
        ctx.drawImage(bitmap, 0, 0);
        
        // Liberar recursos
        bitmap.close();
        URL.revokeObjectURL(url);
        
        // Convertir a blob JPEG
        canvas.convertToBlob({ type: 'image/jpeg', quality })
          .then(jpegBlob => {
            jpegBlob.arrayBuffer()
              .then(buffer => resolve(new Uint8Array(buffer)))
              .catch(reject);
          })
          .catch(reject);
      })
      .catch(error => {
        URL.revokeObjectURL(url);
        reject(error);
      });
  });
}

/**
 * Genera una miniatura de baja resolución para preview
 */
async function generateThumbnail(
  imageData: Uint8Array,
  maxSize: number = 300
): Promise<{ id: number; thumbnailUrl: string; originalSize: number; thumbnailSize: number }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageData]);
    
    createImageBitmap(blob)
      .then(bitmap => {
        // Calcular dimensiones manteniendo aspect ratio
        let { width, height } = bitmap;
        const ratio = Math.min(maxSize / width, maxSize / height);
        
        if (ratio < 1) {
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        const { canvas, ctx } = getCanvas(width, height);
        
        // Usar mejor calidad de interpolación
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        
        // Dibujar imagen escalada
        ctx.drawImage(bitmap, 0, 0, width, height);
        
        // Liberar recursos
        bitmap.close();
        
        // Convertir a blob JPEG con calidad baja para miniaturas
        canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
          .then(thumbBlob => {
            const thumbnailUrl = URL.createObjectURL(thumbBlob);
            resolve({
              id: -1, // Se actualizará afuera
              thumbnailUrl,
              originalSize: imageData.length,
              thumbnailSize: thumbBlob.size
            });
          })
          .catch(reject);
      })
      .catch(reject);
  });
}

/**
 * Procesa un lote de imágenes con pausas entre cada una
 * para permitir que el UI respire
 */
async function processBatch(
  images: Array<{ id: number; imageData: Uint8Array }>,
  quality: number,
  _batchId: string,
  onProgress: (completed: number, total: number, result?: { id: number; data: Uint8Array }) => void
): Promise<void> {
  const total = images.length;
  
  for (let i = 0; i < total; i++) {
    const { id, imageData } = images[i];
    
    try {
      const convertedData = await convertToJpeg(imageData, quality);
      onProgress(i + 1, total, { id, data: convertedData });
      
      // Pequeña pausa para permitir que otros mensajes se procesen
      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    } catch (error) {
      console.error(`Error procesando imagen ${id}:`, error);
      onProgress(i + 1, total);
    }
  }
}

/**
 * Genera miniaturas en lote
 */
async function generateThumbnailsBatch(
  images: Array<{ id: number; imageData: Uint8Array }>,
  maxSize: number,
  _batchId: string,
  onProgress: (completed: number, total: number, result?: { id: number; thumbnailUrl: string; size: number }) => void
): Promise<void> {
  const total = images.length;
  
  for (let i = 0; i < total; i++) {
    const { id, imageData } = images[i];
    
    try {
      const result = await generateThumbnail(imageData, maxSize);
      onProgress(i + 1, total, { 
        id, 
        thumbnailUrl: result.thumbnailUrl, 
        size: result.thumbnailSize 
      });
      
      // Pausa para no saturar
      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error(`Error generando thumbnail ${id}:`, error);
      onProgress(i + 1, total);
    }
  }
}

// Manejador de mensajes del worker
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { data } = event;
  
  switch (data.type) {
    case 'processBatch': {
      const { images, quality, batchId } = data;
      
      await processBatch(
        images,
        quality,
        batchId,
        (completed, total, result) => {
          self.postMessage({
            type: 'progress',
            batchId,
            completed,
            total,
            result
          });
        }
      );
      
      self.postMessage({
        type: 'complete',
        batchId
      });
      break;
    }
    
    case 'generateThumbnails': {
      const { images, maxSize, batchId } = data;
      
      await generateThumbnailsBatch(
        images,
        maxSize,
        batchId,
        (completed, total, result) => {
          self.postMessage({
            type: 'thumbnailProgress',
            batchId,
            completed,
            total,
            result
          });
        }
      );
      
      self.postMessage({
        type: 'thumbnailsComplete',
        batchId
      });
      break;
    }
    
    case 'cancel': {
      // Cancelación simple - el worker terminará el batch actual
      // pero no iniciará nuevos
      self.postMessage({
        type: 'cancelled',
        batchId: data.batchId
      });
      break;
    }
  }
};

export {};

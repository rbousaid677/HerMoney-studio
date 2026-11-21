import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

const MAX_STORAGE_IMAGE_WIDTH = 1600;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const STORAGE_UPLOAD_TIMEOUT_MS = 6500;
const MAX_EMBEDDED_DATA_URL_LENGTH = 220000;

export type ImageUploadMode = 'firebase-storage' | 'embedded-compressed';

export interface UploadedImageResult {
  url: string;
  mode: ImageUploadMode;
}

const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(?:webp|jpeg|png|gif);base64,[A-Za-z0-9+/=]+$/i;

function isSupportedImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  return IMAGE_EXT_REGEX.test(file.name);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback via FileReader in case object URL decoding fails on some mobile pickers
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          reject(new Error('Could not read the selected image file.'));
          return;
        }
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () =>
          reject(
            new Error(
              'Could not decode this image format. Please try a JPEG, PNG, or WebP image.'
            )
          );
        fallbackImg.src = result;
      };
      reader.onerror = () => reject(new Error('Could not read the selected image file.'));
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

function renderToCanvasBlob(
  img: HTMLImageElement,
  maxWidth: number,
  mimeType: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<Blob | null> {
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode compressed image.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read compressed image data.'));
    reader.readAsDataURL(blob);
  });
}

async function optimizeImageFile(file: File): Promise<{ blob: Blob; ext: string; mimeType: string }> {
  if (!isSupportedImageFile(file)) {
    throw new Error('Please choose a valid image file (JPEG, PNG, or WebP).');
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image file is too large. Please choose a file under 15 MB.');
  }

  // Keep animated GIF untouched if small enough; block SVG uploads to avoid SVG script risks
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    throw new Error('SVG files are not supported for uploads. Please use JPEG, PNG, or WebP.');
  }

  if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('GIF exceeds the 5 MB upload limit.');
    }
    return {
      blob: file,
      ext: 'gif',
      mimeType: 'image/gif',
    };
  }

  const img = await loadHtmlImage(file);
  const webpBlob = await renderToCanvasBlob(img, MAX_STORAGE_IMAGE_WIDTH, 'image/webp', 0.84);
  if (webpBlob && webpBlob.type === 'image/webp') {
    return { blob: webpBlob, ext: 'webp', mimeType: 'image/webp' };
  }

  const jpegBlob = await renderToCanvasBlob(img, MAX_STORAGE_IMAGE_WIDTH, 'image/jpeg', 0.84);
  if (jpegBlob) {
    return { blob: jpegBlob, ext: 'jpg', mimeType: 'image/jpeg' };
  }

  return {
    blob: file,
    ext: 'jpg',
    mimeType: file.type || 'image/jpeg',
  };
}

async function encodeCompactFallbackDataUrl(file: File): Promise<string> {
  if ((file.type === 'image/gif' || /\.gif$/i.test(file.name)) && file.size <= 150000) {
    const dataUrl = await blobToDataUrl(file);
    if (SAFE_DATA_IMAGE_REGEX.test(dataUrl) && dataUrl.length <= MAX_EMBEDDED_DATA_URL_LENGTH) {
      return dataUrl;
    }
  }

  const img = await loadHtmlImage(file);
  const attempts: Array<{ width: number; quality: number }> = [
    { width: 960, quality: 0.78 },
    { width: 820, quality: 0.7 },
    { width: 700, quality: 0.62 },
    { width: 580, quality: 0.54 },
  ];

  for (const { width, quality } of attempts) {
    const webpBlob = await renderToCanvasBlob(img, width, 'image/webp', quality);
    if (webpBlob && webpBlob.type === 'image/webp') {
      const dataUrl = await blobToDataUrl(webpBlob);
      if (dataUrl.length <= MAX_EMBEDDED_DATA_URL_LENGTH && SAFE_DATA_IMAGE_REGEX.test(dataUrl)) {
        return dataUrl;
      }
    }

    const jpegBlob = await renderToCanvasBlob(img, width, 'image/jpeg', quality);
    if (jpegBlob) {
      const dataUrl = await blobToDataUrl(jpegBlob);
      if (dataUrl.length <= MAX_EMBEDDED_DATA_URL_LENGTH && SAFE_DATA_IMAGE_REGEX.test(dataUrl)) {
        return dataUrl;
      }
    }
  }

  throw new Error(
    'This image is still too large after compression. Please try a smaller photo or paste an HTTPS image URL.'
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export async function uploadArticleImageDetailed(
  file: File,
  folder: 'covers' | 'inline' = 'covers'
): Promise<UploadedImageResult> {
  const { blob, ext, mimeType } = await optimizeImageFile(file);
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('Optimized image exceeds the 5 MB upload limit.');
  }

  const baseName =
    file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 40) || 'image';

  const storagePath = `articles/${folder}/${Date.now()}-${baseName}.${ext}`;
  const storageRef = ref(storage, storagePath);

  try {
    const url = await withTimeout(
      (async () => {
        const snapshot = await uploadBytes(storageRef, blob, {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000',
        });
        return getDownloadURL(snapshot.ref);
      })(),
      STORAGE_UPLOAD_TIMEOUT_MS,
      'Firebase Storage timed out.'
    );
    return { url, mode: 'firebase-storage' };
  } catch (storageErr) {
    console.warn(
      'Firebase Storage unavailable, switching to compact embedded WebP fallback:',
      storageErr
    );
    const dataUrl = await encodeCompactFallbackDataUrl(file);
    return { url: dataUrl, mode: 'embedded-compressed' };
  }
}

export async function uploadArticleImage(
  file: File,
  folder: 'covers' | 'inline' = 'covers'
): Promise<string> {
  const result = await uploadArticleImageDetailed(file, folder);
  return result.url;
}

export function isValidImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/src/assets/')) return true;
  if (SAFE_DATA_IMAGE_REGEX.test(trimmed) && trimmed.length <= 300000) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

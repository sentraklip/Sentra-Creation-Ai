export interface ApiResponseBase {
  ok?: boolean;
  message?: string;
  code?: string;
  [key: string]: unknown;
}

export async function safePostJson<T extends ApiResponseBase>(
  url: string,
  payload: unknown
): Promise<{ httpOk: boolean; status: number; data: T }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Koneksi ke server terputus (${msg}). Pastikan server aktif dan coba lagi.`);
  }

  const rawText = await res.text();
  if (!rawText) {
    return {
      httpOk: res.ok,
      status: res.status,
      data: {
        ok: false,
        message: `Server mengembalikan respons kosong (HTTP ${res.status}).`,
      } as T,
    };
  }

  try {
    const parsed = JSON.parse(rawText) as T;
    return { httpOk: res.ok, status: res.status, data: parsed };
  } catch {
    return {
      httpOk: false,
      status: res.status,
      data: {
        ok: false,
        message: `Respons server tidak berformat JSON (HTTP ${res.status}).`,
      } as T,
    };
  }
}

export async function compressImageFile(file: File, maxDimension = 1280, quality = 0.82): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca berkas gambar.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });

  // Skip canvas compression for non-raster or SVG images if any, or compress standard images
  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(rawDataUrl);
          return;
        }
        const scale = Math.min(1, maxDimension / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

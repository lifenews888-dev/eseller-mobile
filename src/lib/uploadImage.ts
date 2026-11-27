import { File } from 'expo-file-system';
import { api } from '../services/api';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'duo61k04v';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'eseller_mobile';

export async function uploadImageToCloudinary(localUri: string): Promise<string> {
  const file = new File(localUri);
  const base64 = await file.base64();

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: `data:image/jpeg;base64,${base64}`,
        upload_preset: UPLOAD_PRESET,
        folder: 'eseller/products',
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Зураг хуулахад алдаа гарлаа (${res.status})`);
  }

  const json = await res.json();
  return json.secure_url as string;
}

/**
 * eseller.mn-ийн өөрийн хадгалалт (/api/upload — вэбтэй ижил Vercel Blob) руу хуулна.
 * Нэвтэрсэн байх шаардлагатай. Амжилтгүй бол Cloudinary руу оролдоно.
 */
export async function uploadImage(localUri: string): Promise<string> {
  try {
    const name = (localUri.split('/').pop() || 'photo.jpg').replace(/[^\w.-]/g, '') || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const fd = new FormData();
    fd.append('file', { uri: localUri, name: /\.(jpe?g|png|webp|gif)$/i.test(name) ? name : `${name}.jpg`, type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' } as unknown as Blob);
    const res = (await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })) as unknown as { url?: string };
    if (res?.url) return res.url;
    throw new Error('upload returned no url');
  } catch {
    return uploadImageToCloudinary(localUri);
  }
}

export async function uploadMultipleImages(localUris: string[]): Promise<string[]> {
  return Promise.all(localUris.map(uploadImage));
}

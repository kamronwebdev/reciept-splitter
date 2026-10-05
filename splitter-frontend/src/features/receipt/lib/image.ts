import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Long side of the uploaded photo. 2000px keeps small print readable; the old 1280px/0.45 quality lost digits. */
export const RECEIPT_MAX_SIDE = 2000;
export const RECEIPT_JPEG_QUALITY = 0.8;

export interface LocalImage {
  uri: string;
  width: number;
  height: number;
}

export interface PreparedImage extends LocalImage {
  base64: string;
  mimeType: 'image/jpeg';
}

export function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
}

/** Pure: size after limiting the long side (never upscales). */
export function fitLongSide(width: number, height: number, maxSide = RECEIPT_MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const k = maxSide / longest;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/** Resize (long side ~2000px) + JPEG 0.8 + base64: what the server receives. Works for HEIC/PNG/WebP inputs too. */
export async function prepareReceiptImage(img: LocalImage): Promise<PreparedImage> {
  const ctx = ImageManipulator.manipulate(img.uri);
  const target = fitLongSide(img.width, img.height);
  if (target.width !== img.width) ctx.resize({ width: target.width });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: RECEIPT_JPEG_QUALITY, base64: true });
  if (!saved.base64) throw new Error('Could not prepare the photo');
  return { uri: saved.uri, width: saved.width, height: saved.height, base64: saved.base64, mimeType: 'image/jpeg' };
}

export async function rotateImage(img: LocalImage, degrees: number): Promise<LocalImage> {
  const ctx = ImageManipulator.manipulate(img.uri).rotate(degrees);
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

/** Crop in the image's own pixel coordinates. */
export async function cropImage(img: LocalImage, rect: { x: number; y: number; width: number; height: number }): Promise<LocalImage> {
  const ctx = ImageManipulator.manipulate(img.uri).crop({
    originX: Math.max(0, Math.round(rect.x)),
    originY: Math.max(0, Math.round(rect.y)),
    width: Math.max(1, Math.round(Math.min(rect.width, img.width - rect.x))),
    height: Math.max(1, Math.round(Math.min(rect.height, img.height - rect.y))),
  });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

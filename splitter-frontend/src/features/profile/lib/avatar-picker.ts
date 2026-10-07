import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const AVATAR_SIZE = 512;
export const AVATAR_JPEG_QUALITY = 0.8;

export type PickSource = 'camera' | 'library';

export type PickResult =
  | { status: 'ok'; uri: string; width: number; height: number }
  | { status: 'cancelled' }
  /** permission denied; `canAskAgain=false` means only the phone's Settings can fix it */
  | { status: 'denied'; canAskAgain: boolean; source: PickSource }
  | { status: 'error'; message: string };

/** Asks for the permission a source needs; on iOS/Android a permanent denial must be fixed in Settings. */
async function ensurePermission(source: PickSource): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (Platform.OS === 'web') return { granted: true, canAskAgain: true };
  const get = source === 'camera' ? ImagePicker.getCameraPermissionsAsync : ImagePicker.getMediaLibraryPermissionsAsync;
  const request = source === 'camera' ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
  let current = await get();
  if (current.granted) return { granted: true, canAskAgain: true };
  if (current.canAskAgain) current = await request();
  return { granted: current.granted, canAskAgain: current.canAskAgain };
}

/**
 * Opens the camera or the photo library with a square crop, then converts the result to a
 * <=512px JPEG (iPhone photos are HEIC and many MB: the server only accepts JPEG/PNG/WebP/GIF up to 2 MB).
 */
export async function pickAvatar(source: PickSource): Promise<PickResult> {
  try {
    const perm = await ensurePermission(source);
    if (!perm.granted) return { status: 'denied', canAskAgain: perm.canAskAgain, source };

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
    const asset = result.assets[0]!;
    return await toAvatarJpeg(asset.uri, asset.width, asset.height);
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'pick failed' };
  }
}

/** Resize (max 512x512) + convert to JPEG. Safe to call with HEIC/PNG/WebP inputs. */
export async function toAvatarJpeg(uri: string, width?: number, height?: number): Promise<PickResult> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    const longest = Math.max(width ?? AVATAR_SIZE + 1, height ?? AVATAR_SIZE + 1);
    if (longest > AVATAR_SIZE) {
      // keep the aspect ratio: limit the longer side
      if ((width ?? 0) >= (height ?? 0)) ctx.resize({ width: AVATAR_SIZE });
      else ctx.resize({ height: AVATAR_SIZE });
    }
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: AVATAR_JPEG_QUALITY });
    return { status: 'ok', uri: saved.uri, width: saved.width, height: saved.height };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'convert failed' };
  }
}

/** multipart body for POST /uploads/avatar (native file descriptor on device, a real Blob on web) */
export async function buildAvatarFormData(uri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('read failed');
    form.append('file', await response.blob(), 'avatar.jpg');
  } else {
    form.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
  }
  return form;
}

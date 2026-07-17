import type { EditorAsset, EditorAssetPurpose } from '@/api/editorAssets';

export const MEDIA_ACCEPT: Record<EditorAssetPurpose, string> = {
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
  pdf: 'application/pdf',
  file: '*/*',
};

export function editorAssetPurpose(file: Pick<File, 'type' | 'name'>): EditorAssetPurpose {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'file';
}

export function plateMediaType(purpose: EditorAssetPurpose): 'img' | 'audio' | 'video' | 'file' {
  return purpose === 'image'
    ? 'img'
    : purpose === 'audio' || purpose === 'video'
      ? purpose
      : 'file';
}

/** Stable persisted representation. Signed URLs and local blob URLs never
 * cross this boundary. */
export function mediaNodeFromAsset(asset: EditorAsset) {
  return {
    type: plateMediaType(asset.purpose),
    id: asset.assetId,
    assetId: asset.assetId,
    name: asset.name,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    children: [{ text: '' }],
  };
}

export function acceptsPurpose(file: Pick<File, 'type' | 'name'>, purpose: EditorAssetPurpose) {
  return purpose === 'file' || editorAssetPurpose(file) === purpose;
}

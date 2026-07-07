import { removeBackground } from '@imgly/background-removal';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function removeImageBackground(file, { onProgress } = {}) {
  const resultBlob = await removeBackground(file, {
    model: 'isnet_quint8',
    progress: onProgress,
  });
  return blobToDataUrl(resultBlob);
}

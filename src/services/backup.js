const STORAGE_KEY = 'space-layout-app';

export function downloadStorageBackup() {
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? '';
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `space-layout-backup-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function resetStorageAndReload() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

import { useEffect, useState } from 'react';
import { onStorageEvent } from '../services/storageEvents';
import { downloadStorageBackup, resetStorageAndReload } from '../services/backup';
import { useAppStore } from '../store/useAppStore';
import './StorageStatusBanner.css';

const QUOTA_MESSAGE = '저장공간이 부족하여 변경사항을 브라우저에 저장하지 못했습니다. 불필요한 이미지나 이전 기록을 정리해주세요.';

// Independent of the zustand store on purpose — this has to keep working
// even when the store itself is the thing that failed to load or save.
export function StorageStatusBanner() {
  const [quotaWarning, setQuotaWarning] = useState(null);
  const [hydrationError, setHydrationError] = useState(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    return onStorageEvent((event) => {
      if (event.type === 'quota-exceeded') {
        setQuotaWarning(QUOTA_MESSAGE);
      } else if (event.type === 'hydration-error') {
        setHydrationError(event.error);
      } else if (event.type === 'write-ok') {
        setQuotaWarning(null);
      }
    });
  }, []);

  async function handleRetryRecovery() {
    setRecovering(true);
    try {
      await useAppStore.persist.rehydrate();
      setHydrationError(null);
    } finally {
      setRecovering(false);
    }
  }

  return (
    <>
      {quotaWarning && (
        <div className="storage-banner" role="alert">
          <span className="storage-banner__message">{quotaWarning}</span>
          <button type="button" className="storage-banner__dismiss" onClick={() => setQuotaWarning(null)} aria-label="닫기">
            ×
          </button>
        </div>
      )}
      {hydrationError && (
        <div className="storage-recovery__backdrop">
          <div className="storage-recovery">
            <h2>저장된 데이터를 불러오지 못했습니다</h2>
            <p>
              브라우저에 저장된 레이아웃 데이터가 손상되었거나 읽을 수 없습니다. 아래 중 하나를 선택해주세요.
            </p>
            <div className="storage-recovery__actions">
              <button type="button" onClick={handleRetryRecovery} disabled={recovering}>
                {recovering ? '복구 시도 중…' : '기존 데이터 복구 시도'}
              </button>
              <button type="button" onClick={downloadStorageBackup}>
                백업 다운로드
              </button>
              <button type="button" className="is-danger" onClick={resetStorageAndReload}>
                저장 데이터 초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

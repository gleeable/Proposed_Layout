import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import './BuildingSetupForm.css';

export function BuildingSetupForm() {
  const generateBuilding = useAppStore((s) => s.generateBuilding);
  const [siteAreaM2, setSiteAreaM2] = useState('500');
  const [bcrPercent, setBcrPercent] = useState('40');
  const [farPercent, setFarPercent] = useState('200');
  const [heightM, setHeightM] = useState('');
  const [floorCountOverride, setFloorCountOverride] = useState('');
  const [sitePlanImageFile, setSitePlanImageFile] = useState(null);
  const [sitePlanPdfFile, setSitePlanPdfFile] = useState(null);
  const [address, setAddress] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const attachedFile = sitePlanPdfFile || sitePlanImageFile;
    generateBuilding({
      siteAreaM2: Number(siteAreaM2),
      bcrPercent: Number(bcrPercent),
      farPercent: Number(farPercent),
      heightM: heightM ? Number(heightM) : null,
      floorCountOverride: floorCountOverride ? Number(floorCountOverride) : null,
      sitePlanFileName: attachedFile ? attachedFile.name : null,
      address: address || null,
    });
  }

  return (
    <div className="building-setup-page">
      <form className="building-setup" onSubmit={handleSubmit}>
        <h1>건물 생성</h1>
        <p className="building-setup__hint">
          대지 면적, 건폐율, 용적률만 입력해도 층수와 대략적인 건물 외곽이 자동으로 만들어집니다.
        </p>

        <div className="building-setup__section">
          <h2>도면 / 입지 (선택)</h2>

          <label>
            도면 이미지 업로드
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSitePlanImageFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label>
            도면 PDF 업로드
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setSitePlanPdfFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label>
            주소
            <input
              type="text"
              placeholder="예: 서울시 강남구 테헤란로 123"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <p className="building-setup__note">
            자동 분석(도면 인식·주소 기반 입지 생성)은 추후 지원됩니다. 지금은 첨부한 파일/주소가 함께 저장되고,
            건물은 아래 수치를 기준으로 생성됩니다.
          </p>
        </div>

        <label>
          총 대지 면적 (㎡)
          <input
            type="number"
            min="1"
            value={siteAreaM2}
            onChange={(e) => setSiteAreaM2(e.target.value)}
            required
          />
        </label>

        <label>
          건폐율 (%)
          <input
            type="number"
            min="1"
            max="100"
            value={bcrPercent}
            onChange={(e) => setBcrPercent(e.target.value)}
            required
          />
        </label>

        <label>
          용적률 (%)
          <input
            type="number"
            min="1"
            value={farPercent}
            onChange={(e) => setFarPercent(e.target.value)}
            required
          />
        </label>

        <label>
          건물 높이 (m, 선택)
          <input type="number" min="0" value={heightM} onChange={(e) => setHeightM(e.target.value)} />
        </label>

        <label>
          층수 직접 지정 (선택, 비우면 자동 계산)
          <input
            type="number"
            min="1"
            value={floorCountOverride}
            onChange={(e) => setFloorCountOverride(e.target.value)}
          />
        </label>

        <button type="submit">건물 생성하기</button>
      </form>
    </div>
  );
}

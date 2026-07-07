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

  function handleSubmit(e) {
    e.preventDefault();
    generateBuilding({
      siteAreaM2: Number(siteAreaM2),
      bcrPercent: Number(bcrPercent),
      farPercent: Number(farPercent),
      heightM: heightM ? Number(heightM) : null,
      floorCountOverride: floorCountOverride ? Number(floorCountOverride) : null,
    });
  }

  return (
    <div className="building-setup-page">
      <form className="building-setup" onSubmit={handleSubmit}>
        <h1>건물 생성</h1>
        <p className="building-setup__hint">
          대지 면적, 건폐율, 용적률만 입력해도 층수와 대략적인 건물 외곽이 자동으로 만들어집니다.
        </p>

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

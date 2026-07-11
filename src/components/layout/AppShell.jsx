import { useAppStore } from '../../store/useAppStore';
import './AppShell.css';

const TABS = [
  { key: 'design', label: '디자인' },
  { key: 'product', label: '제품' },
];

export function AppShell({ designContent, productContent, onSavePdf, canSavePdf }) {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <span className="app-shell__title">공간 배치 스튜디오</span>
        <nav className="app-shell__tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`app-shell__tab ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="app-shell__pdf-button"
          disabled={!canSavePdf}
          onClick={onSavePdf}
        >
          PDF로 저장하기
        </button>
      </header>
      <main className="app-shell__body">
        {activeTab === 'design' ? designContent : productContent}
      </main>
    </div>
  );
}

import { Component } from 'react';
import { downloadStorageBackup, resetStorageAndReload } from '../../services/backup';
import './CanvasErrorBoundary.css';

export class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleWindowError = this.handleWindowError.bind(this);
    this.handleRejection = this.handleRejection.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface the real cause instead of just going blank — this is the
    // "white screen" failure mode the 2D editor used to hit silently.
    // eslint-disable-next-line no-console
    console.error('[2D Editor] crashed and was caught by CanvasErrorBoundary:', error, info?.componentStack);
  }

  componentDidMount() {
    // React error boundaries only catch errors thrown during render/lifecycle
    // — NOT errors thrown from inside event handlers, or from Konva's own
    // requestAnimationFrame-scheduled internal redraws (e.g. a Transformer
    // update touching an already-destroyed node). Those show up as plain
    // global 'error'/'unhandledrejection' events instead, so this boundary
    // also has to listen for those directly while the 2D editor is mounted.
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  handleWindowError(event) {
    // eslint-disable-next-line no-console
    console.error('[2D Editor] uncaught error while editor was mounted:', event.error || event.message);
    this.setState({ hasError: true });
  }

  handleRejection(event) {
    // eslint-disable-next-line no-console
    console.error('[2D Editor] unhandled rejection while editor was mounted:', event.reason);
    this.setState({ hasError: true });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="canvas-error-boundary">
          <p>2D 편집기에서 오류가 발생했습니다.</p>
          <p className="canvas-error-boundary__hint">콘솔에서 자세한 오류 내용을 확인할 수 있습니다.</p>
          <div className="canvas-error-boundary__actions">
            <button type="button" onClick={this.handleReset}>
              편집기 다시 열기
            </button>
            <button type="button" className="canvas-error-boundary__secondary" onClick={downloadStorageBackup}>
              저장 데이터 백업
            </button>
            <button type="button" className="canvas-error-boundary__secondary is-danger" onClick={resetStorageAndReload}>
              로컬 저장 데이터 초기화
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

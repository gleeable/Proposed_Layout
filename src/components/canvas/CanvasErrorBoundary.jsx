import { Component } from 'react';
import './CanvasErrorBoundary.css';

export class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface the real cause instead of just going blank — this is the
    // "White screen" failure mode the 2D editor used to hit silently.
    // eslint-disable-next-line no-console
    console.error('[2D Editor] crashed and was caught by CanvasErrorBoundary:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="canvas-error-boundary">
          <p>2D 편집 화면에 문제가 발생했습니다.</p>
          <p className="canvas-error-boundary__hint">콘솔에서 자세한 오류 내용을 확인할 수 있습니다.</p>
          <button type="button" onClick={this.handleReset}>
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

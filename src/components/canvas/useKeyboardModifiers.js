import { useEffect, useRef } from 'react';

// Tracks Ctrl/Cmd and Alt as refs (not state) so high-frequency drag/wheel
// handlers can read live modifier state without subscribing to re-renders.
// Resets on blur/visibilitychange so a modifier key released while the
// window was unfocused doesn't get "stuck" pressed.
export function useKeyboardModifiers() {
  const ctrlRef = useRef(false);
  const altRef = useRef(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Control' || e.key === 'Meta') ctrlRef.current = true;
      if (e.key === 'Alt') altRef.current = true;
    }
    function handleKeyUp(e) {
      if (e.key === 'Control' || e.key === 'Meta') ctrlRef.current = false;
      if (e.key === 'Alt') altRef.current = false;
    }
    function reset() {
      ctrlRef.current = false;
      altRef.current = false;
    }
    function handleVisibility() {
      if (document.hidden) reset();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { ctrlRef, altRef };
}

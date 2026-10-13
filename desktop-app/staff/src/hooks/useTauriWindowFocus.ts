import { useEffect } from 'react';
import { focusManager } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Refetch stale queries when the native Tauri window gains focus.
 * The webview does not emit browser-tab visibility the way a website does.
 */
export function useTauriWindowFocus(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        focusManager.setFocused(focused);
      })
      .then((stop) => {
        if (cancelled) {
          stop();
          return;
        }
        unlisten = stop;
      })
      .catch(() => {
        // Vite-only runs outside the Tauri shell keep the default focus listener.
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}

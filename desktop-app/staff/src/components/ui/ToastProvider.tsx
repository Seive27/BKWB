import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { setDownloadSavedHandler } from '../../utils/downloadFile';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  detail?: string;
}

interface ToastContextValue {
  showToast: (tone: ToastTone, message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_MS = 5000;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {
        /* no-op when provider is missing */
      },
    };
  }
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer != null) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (tone: ToastTone, message: string, detail?: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message, detail }]);
      const timer = window.setTimeout(() => dismiss(id), TOAST_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  // Auto-toast whenever downloadFile completes a save.
  useEffect(() => {
    setDownloadSavedHandler(({ path }) => {
      showToast('success', 'File saved', path);
    });
    return () => setDownloadSavedHandler(null);
  }, [showToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-sm w-full rounded-xl shadow-lg text-white px-4 py-3 flex items-start gap-3 animate-toast ${
              toast.tone === 'success'
                ? 'bg-primary-600'
                : toast.tone === 'error'
                  ? 'bg-red-600'
                  : 'bg-gray-800'
            }`}
            role="status"
          >
            <div className="mt-0.5 flex-shrink-0">
              {toast.tone === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toast.tone === 'error' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{toast.message}</p>
              {toast.detail ? (
                <p className="text-xs text-white/90 mt-0.5 break-all leading-snug">{toast.detail}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-white/15 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

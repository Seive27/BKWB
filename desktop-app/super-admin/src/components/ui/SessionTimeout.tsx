import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

interface SessionTimeoutProps {
  /** Called when the grace countdown reaches zero (should sign the user out). */
  onExpire: () => void;
  /** How long the user may stay idle before the warning appears (ms). */
  idleTimeoutMs?: number;
  /** How many seconds they get to click "Yes" before being signed out. */
  graceSeconds?: number;
}

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'wheel',
  'touchstart',
] as const;

/**
 * Renders nothing until the user has been idle for `idleTimeoutMs`. It then
 * shows an "Are you still there?" dialog with a `graceSeconds` countdown.
 * Clicking "Yes, I'm here" resets the idle timer; letting the countdown reach
 * zero (or clicking "Sign out") calls `onExpire`.
 */
export default function SessionTimeout({
  onExpire,
  idleTimeoutMs = 2 * 60 * 1000,
  graceSeconds = 30,
}: SessionTimeoutProps) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(graceSeconds);

  // Keep latest callback in a ref so listeners/timers never go stale.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Gate activity handling: while the warning is open, only the dialog buttons count.
  const warningOpenRef = useRef(false);
  warningOpenRef.current = warningOpen;

  const idleTimerRef = useRef<number | null>(null);
  const graceIntervalRef = useRef<number | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearGraceInterval = useCallback(() => {
    if (graceIntervalRef.current !== null) {
      window.clearInterval(graceIntervalRef.current);
      graceIntervalRef.current = null;
    }
  }, []);

  /** (Re)start the idle countdown from scratch. */
  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    clearGraceInterval();
    idleTimerRef.current = window.setTimeout(() => {
      setSecondsLeft(graceSeconds);
      setWarningOpen(true);
      graceIntervalRef.current = window.setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    }, idleTimeoutMs);
  }, [clearIdleTimer, clearGraceInterval, graceSeconds, idleTimeoutMs]);

  /** User clicked "Yes, I'm here" — dismiss and restart the idle clock. */
  const handleContinue = useCallback(() => {
    setWarningOpen(false);
    startIdleTimer();
  }, [startIdleTimer]);

  /** User chose to sign out, or the countdown hit zero. */
  const handleExpire = useCallback(() => {
    clearGraceInterval();
    clearIdleTimer();
    setWarningOpen(false);
    onExpireRef.current();
  }, [clearGraceInterval, clearIdleTimer]);

  // Countdown finished → sign out.
  useEffect(() => {
    if (warningOpen && secondsLeft === 0) {
      handleExpire();
    }
  }, [warningOpen, secondsLeft, handleExpire]);

  // Wire up activity listeners and the initial idle timer.
  useEffect(() => {
    const handleActivity = () => {
      if (!warningOpenRef.current) startIdleTimer();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );
    startIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      clearIdleTimer();
      clearGraceInterval();
    };
  }, [startIdleTimer, clearIdleTimer, clearGraceInterval]);

  if (!warningOpen) return null;

  const progress = Math.max(0, Math.min(100, (secondsLeft / graceSeconds) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Session timeout"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-center animate-slide-up">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary-600" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Are you still there?</h2>
        <p className="mt-1.5 text-sm leading-5 text-slate-500">
          You've been idle for a while. To stay signed in, click continue — otherwise you'll be
          signed out automatically.
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Signing out in</span>
            <span className="text-primary-700">{secondsLeft}s</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={handleExpire}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium"
          >
            Sign out
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-semibold shadow-sm"
          >
            Yes, I'm here
          </button>
        </div>
      </div>
    </div>
  );
}
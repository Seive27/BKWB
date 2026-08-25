import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEAR_SPAN = 10;

type Ymd = { y: number; m: number; d: number };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayYmd(): Ymd {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function isBeforeToday(y: number, m: number, d: number): boolean {
  const min = todayYmd();
  return y < min.y || (y === min.y && m < min.m) || (y === min.y && m === min.m && d < min.d);
}

function parseIso(iso: string | null): { date: Ymd; hours: number; minutes: number } | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    date: { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() },
    hours: dt.getHours(),
    minutes: dt.getMinutes(),
  };
}

function toIso(date: Ymd, hours: number, minutes: number): string {
  return new Date(date.y, date.m - 1, date.d, hours, minutes, 0, 0).toISOString();
}

function formatDisplay(iso: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface FutureDateTimeFieldProps {
  value: string | null;
  onChange: (iso: string | null) => void;
  hasError?: boolean;
  placeholder?: string;
}

/** Date+time picker whose calendar only allows today and future dates. */
export function FutureDateTimeField({
  value,
  onChange,
  hasError,
  placeholder = 'Select date and time',
}: FutureDateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const parsed = parseIso(value);
  const min = todayYmd();

  const [viewYear, setViewYear] = useState(parsed?.date.y ?? min.y);
  const [viewMonth, setViewMonth] = useState(parsed?.date.m ?? min.m);
  const [time, setTime] = useState(() =>
    parsed ? `${pad(parsed.hours)}:${pad(parsed.minutes)}` : '09:00'
  );

  useEffect(() => {
    if (!open) return;
    if (parsed) {
      setViewYear(parsed.date.y);
      setViewMonth(parsed.date.m);
      setTime(`${pad(parsed.hours)}:${pad(parsed.minutes)}`);
    } else {
      setViewYear(min.y);
      setViewMonth(min.m);
    }
  }, [open, parsed?.date.y, parsed?.date.m, parsed?.hours, parsed?.minutes, min.y, min.m]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = min.y; y <= min.y + YEAR_SPAN; y += 1) list.push(y);
    return list;
  }, [min.y]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();

  const apply = (date: Ymd, timeValue: string) => {
    const [hours, minutes] = timeValue.split(':').map(Number);
    onChange(toIso(date, hours || 0, minutes || 0));
  };

  const selectDay = (day: number) => {
    if (isBeforeToday(viewYear, viewMonth, day)) return;
    apply({ y: viewYear, m: viewMonth, d: day }, time);
  };

  const changeTime = (nextTime: string) => {
    setTime(nextTime);
    if (parsed) apply(parsed.date, nextTime);
  };

  const shiftMonth = (delta: number) => {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    const nextY = date.getFullYear();
    const nextM = date.getMonth() + 1;
    if (nextY < min.y || nextY > min.y + YEAR_SPAN) return;
    if (nextY === min.y && nextM < min.m) return;
    setViewYear(nextY);
    setViewMonth(nextM);
  };

  const selectedIso = parsed
    ? `${parsed.date.y}-${pad(parsed.date.m)}-${pad(parsed.date.d)}`
    : '';

  return (
    <div ref={rootRef}>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            hasError ? 'border-red-400' : 'border-gray-300'
          } ${value ? 'text-gray-800' : 'text-gray-400'}`}
        >
          {formatDisplay(value) || placeholder}
        </button>
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>

      {open && (
        <div className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous month"
              disabled={viewYear === min.y && viewMonth === min.m}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="relative min-w-0 flex-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {MONTH_NAMES.map((name, index) => {
                  const month = index + 1;
                  const disabled = viewYear === min.y && month < min.m;
                  return (
                    <option key={name} value={month} disabled={disabled}>
                      {name}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="relative w-[7rem]">
              <select
                value={viewYear}
                onChange={(e) => {
                  const nextY = Number(e.target.value);
                  setViewYear(nextY);
                  if (nextY === min.y && viewMonth < min.m) setViewMonth(min.m);
                }}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next month"
              disabled={viewYear === min.y + YEAR_SPAN && viewMonth === 12}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`empty-${index}`} className="h-10" />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const iso = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
              const selected = selectedIso === iso;
              const disabled = isBeforeToday(viewYear, viewMonth, day);
              const isToday =
                viewYear === min.y && viewMonth === min.m && day === min.d;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-primary-600 text-white'
                      : disabled
                        ? 'cursor-not-allowed text-gray-300'
                        : isToday
                          ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                          : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => changeTime(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-xs font-medium text-gray-500 hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

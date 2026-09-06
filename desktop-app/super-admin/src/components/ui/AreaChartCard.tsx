import { useState, type MouseEvent, type ReactNode } from 'react';

export type AreaPoint = {
  label: string;
  value: number;
};

type AreaChartCardProps = {
  title?: string;
  subtitle?: string;
  /** Small pill shown on the right of the header row (e.g. "7-Day Window"). */
  badge?: string;
  /** Optional right-side icon/element next to the header. */
  right?: ReactNode;
  data: AreaPoint[];
  color?: string;
  className?: string;
  footer?: ReactNode;
};

const W = 600;
const H = 176;
const PAD_TOP = 10;
const PAD_BOTTOM = 6;

function formatValue(value: number): string {
  return value.toLocaleString('en-US');
}

export function AreaChartCard({
  title,
  subtitle,
  badge,
  right,
  data,
  color = '#1F7A66',
  className = '',
  footer,
}: AreaChartCardProps) {
  const [hover, setHover] = useState<number | null>(null);
  const points = data;
  const n = points.length;

  const max = Math.max(...points.map((d) => d.value), 1);
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const yFor = (v: number) => H - PAD_BOTTOM - (v / max) * innerH;

  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + xFor(i).toFixed(2) + ' ' + yFor(p.value).toFixed(2)).join(' ');
  const area = points.length > 0 ? line + ' L' + W.toFixed(2) + ' ' + H + ' L0 ' + H + ' Z' : '';
  const gradId = 'area-fill-' + color.replace('#', '');

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (n < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    const idx = Math.round(ratio * (n - 1));
    setHover(idx);
  };

  const hoverPoint = hover !== null && hover >= 0 && hover < n ? points[hover] : null;
  const hoverX = hover !== null && hover >= 0 && hover < n ? xFor(hover) : 0;
  const hoverY = hoverPoint !== null ? yFor(hoverPoint.value) : 0;

  const labelStep = n > 8 ? Math.ceil(n / 6) : 1;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs p-5 ${className}`}>
      {(title || badge || right) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {badge && (
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70">
                {badge}
              </span>
            )}
            {right}
          </div>
        </div>
      )}

      <div className="relative h-40" onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={H * f}
              y2={H * f}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          ))}
          {n > 0 && <path d={area} fill={`url(#${gradId})`} />}
          {n > 0 && (
            <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {n > 0 &&
            points.map((p, i) => (
              <circle key={i} cx={xFor(i)} cy={yFor(p.value)} r="2.75" fill="white" stroke={color} strokeWidth="2" />
            ))}
          {hover !== null && hover >= 0 && hover < n && (
            <g>
              <line x1={hoverX} x2={hoverX} y1={PAD_TOP} y2={H - PAD_BOTTOM} stroke={color} strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hoverX} cy={hoverY} r="5" fill="white" stroke={color} strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {/* Floating tooltip (HTML so it never distorts with the stretched SVG) */}
        {hoverPoint && hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-lg"
            style={{
              left: `${n <= 1 ? 50 : (hover / (n - 1)) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="whitespace-nowrap text-[10px] font-semibold text-slate-400">{hoverPoint.label}</p>
            <p className="whitespace-nowrap text-xs font-bold tabular-nums text-slate-900">{formatValue(hoverPoint.value)}</p>
          </div>
        )}
      </div>

      {n > 0 && (
        <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
          {points
            .filter((_, i) => i % labelStep === 0)
            .map((d, i) => (
              <span key={i} className="text-[10px] font-medium text-slate-400">
                {d.label}
              </span>
            ))}
        </div>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

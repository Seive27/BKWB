import React from 'react';
import { Users, Ticket, ClipboardList, Megaphone } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import MeterReadingsTable from '../components/ui/MeterReadingsTable';
import AnnouncementsPanel from '../components/ui/AnnouncementsPanel';
import { useMeterReadings } from '../hooks/useMeterReadings';
import { useAnalytics } from '../hooks/useAnalytics';
import type { TrendPoint } from '../types';

interface DashboardProps {
  onNavigate?: (route: string) => void;
}

/** Real operational trend chart (ticket trends from analytics). */
function TrendChart({ data, color }: { data: TrendPoint[]; color: string }) {
  const width = 600;
  const height = 180;
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: height - (d.value / max) * (height - 24) - 12,
  }));
  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
  const area = line + ' L' + width + ' ' + height + ' L0 ' + height + ' Z';
  const id = 'dash-grad-' + color.replace('#', '');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Ticket Activity Trends</h2>
          <p className="text-[11px] text-slate-500">Service requests created over the last 30 days</p>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
          30-Day Window
        </span>
      </div>
      <div className="h-40">
        <svg viewBox={'0 0 ' + width + ' ' + height} preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={area} fill={'url(#' + id + ')'} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="white" stroke={color} strokeWidth="2">
              <title>{data[i].label + ': ' + data[i].value}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
        {data
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
          .map((d, i) => (
            <span key={i} className="text-[10px] font-mono text-slate-400">{d.label}</span>
          ))}
      </div>
    </div>
  );
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { readings: recentMeterReadings } = useMeterReadings({ limit: 5 });
  const { data, error } = useAnalytics(30);

  const summary = data?.summary;
  const totalTickets = summary
    ? summary.tickets.open + summary.tickets.assigned + summary.tickets.in_progress + summary.tickets.resolved + summary.tickets.closed
    : 0;
  const openTickets = summary?.tickets.open ?? 0;
  const pendingReadings = summary
    ? summary.readings.assigned + summary.readings.pending_review
    : 0;
  const approvedReadings = summary?.readings.approved ?? 0;
  const announcements = summary?.totalAnnouncements ?? 0;
  const residents = summary?.totalResidents ?? 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-2.5 text-xs flex items-center space-x-2">
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Residents"
            value={residents.toLocaleString()}
            icon={Users}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            subtitle="Registered active consumers"
          />
          <StatCard
            title="Open Tickets"
            value={openTickets.toLocaleString()}
            icon={Ticket}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
            badge={{
              text: `${totalTickets} total`,
              color: 'bg-purple-50 text-purple-700 border border-purple-200',
            }}
          />
          <StatCard
            title="Pending Readings"
            value={pendingReadings.toLocaleString()}
            icon={ClipboardList}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            badge={{
              text: `${approvedReadings} approved`,
              color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            }}
          />
          <StatCard
            title="Announcements"
            value={announcements.toLocaleString()}
            icon={Megaphone}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
            subtitle="Public service bulletins"
          />
        </div>

        {/* Real Trend Chart */}
        <div>
          {data ? (
            <TrendChart data={data.ticketTrends} color="#2563eb" />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <div className="h-40 animate-pulse bg-slate-100 rounded-lg" />
            </div>
          )}
        </div>

        {/* Bottom Section: Meter Readings and Announcements */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <MeterReadingsTable readings={recentMeterReadings} />
          </div>
          <div className="xl:col-span-1">
            <AnnouncementsPanel onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

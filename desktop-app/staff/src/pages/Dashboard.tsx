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
  const height = 200;
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: height - (d.value / max) * (height - 30) - 15,
  }));
  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
  const area = line + ' L' + width + ' ' + height + ' L0 ' + height + ' Z';
  const id = 'dash-grad-' + color.replace('#', '');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Ticket Trends</h2>
        <span className="text-xs text-gray-500">Tickets created per day (last 30 days)</span>
      </div>
      <div className="h-48">
        <svg viewBox={'0 0 ' + width + ' ' + height} preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={'url(#' + id + ')'} />
          <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2">
              <title>{data[i].label + ': ' + data[i].value}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2">
        {data
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
          .map((d, i) => (
            <span key={i} className="text-[10px] text-gray-400">{d.label}</span>
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
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Residents"
            value={residents.toLocaleString()}
            icon={Users}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Open Tickets"
            value={openTickets.toLocaleString()}
            icon={Ticket}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
            badge={{
              text: `${totalTickets} total`,
              color: 'bg-purple-100 text-purple-700',
            }}
          />
          <StatCard
            title="Pending Readings"
            value={pendingReadings.toLocaleString()}
            icon={ClipboardList}
            iconBgColor="bg-orange-50"
            iconColor="text-orange-600"
            badge={{
              text: `${approvedReadings} approved`,
              color: 'bg-green-100 text-green-700',
            }}
          />
          <StatCard
            title="Announcements"
            value={announcements.toLocaleString()}
            icon={Megaphone}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
        </div>

        {/* Real Trend Chart */}
        <div className="mb-8">
          {data ? (
            <TrendChart data={data.ticketTrends} color="#3b82f6" />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-48 animate-pulse bg-gray-100 rounded-lg" />
            </div>
          )}
        </div>

        {/* Bottom Section: Meter Readings and Announcements */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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

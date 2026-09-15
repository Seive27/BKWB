import React from 'react';
import { Users, Ticket, ClipboardList, Megaphone } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import MeterReadingsTable from '../components/ui/MeterReadingsTable';
import AnnouncementsPanel from '../components/ui/AnnouncementsPanel';
import { AreaChartCard } from '../components/ui/AreaChartCard';
import { useMeterReadings } from '../hooks/useMeterReadings';
import { useAnalytics } from '../hooks/useAnalytics';

interface DashboardProps {
  onNavigate?: (route: string) => void;
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

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page heading */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-600">Dashboard</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Operations Overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time snapshot of residents, tickets, readings and public advisories.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-500 shadow-2xs">
            {todayLabel}
          </span>
        </div>

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
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            badge={{
              text: `${totalTickets} total`,
              color: 'bg-amber-50 text-amber-700 border border-amber-200',
            }}
          />
          <StatCard
            title="Pending Readings"
            value={pendingReadings.toLocaleString()}
            icon={ClipboardList}
            iconBgColor="bg-slate-50"
            iconColor="text-slate-600"
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

        {/* Real Trend Chart (Bklit-style area chart) */}
        <div>
          {data ? (
            <AreaChartCard
              title="Ticket Activity Trends"
              subtitle="Service requests created over the last 30 days"
              badge="30-Day Window"
              data={data.ticketTrends}
              color="#1F7A66"
            />
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

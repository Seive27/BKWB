import React from 'react';
import { Users, Receipt, AlertCircle, DollarSign } from 'lucide-react';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import MeterReadingsTable from '../components/MeterReadingsTable';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import {
  dashboardStats,
  monthlyRevenue,
  recentMeterReadings,
  latestAnnouncements,
} from '../data/mockData';

const Dashboard: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Residents"
            value={dashboardStats.totalResidents.toLocaleString()}
            icon={Users}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            growth={dashboardStats.residentsGrowth}
          />
          <StatCard
            title="Bills Generated"
            value={dashboardStats.billsGenerated.toLocaleString()}
            icon={Receipt}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
            badge={{
              text: 'This Month',
              color: 'bg-purple-100 text-purple-700',
            }}
          />
          <StatCard
            title="Pending Payments"
            value={dashboardStats.pendingPayments}
            icon={AlertCircle}
            iconBgColor="bg-orange-50"
            iconColor="text-orange-600"
            badge={{
              text: 'High',
              color: 'bg-red-100 text-red-700',
            }}
          />
          <StatCard
            title="Total Revenue"
            value={`₱${dashboardStats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            growth={dashboardStats.revenueGrowth}
          />
        </div>

        {/* Revenue Chart */}
        <div className="mb-8">
          <RevenueChart data={monthlyRevenue} />
        </div>

        {/* Bottom Section: Meter Readings and Announcements */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <MeterReadingsTable readings={recentMeterReadings} />
          </div>
          <div className="xl:col-span-1">
            <AnnouncementsPanel announcements={latestAnnouncements} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

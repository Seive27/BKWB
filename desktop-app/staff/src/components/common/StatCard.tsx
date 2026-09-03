import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  growth?: number;
  badge?: {
    text: string;
    color: string;
  };
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  growth,
  badge,
  subtitle,
}) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-all duration-150">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 truncate">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
            {growth !== undefined && (
              <span
                className={`text-xs font-semibold ${
                  growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {growth > 0 ? '+' : ''}
                {growth}%
              </span>
            )}
          </div>
          {badge && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full ${badge.color}`}
              >
                {badge.text}
              </span>
            </div>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`${iconBgColor} ${iconColor} p-2.5 rounded-lg flex-shrink-0 ml-3`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;

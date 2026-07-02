import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  growth?: number;
  badge?: {
    text: string;
    color: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
  growth,
  badge,
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
          {growth !== undefined && (
            <p
              className={`text-sm font-medium ${
                growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {growth > 0 ? '+' : ''}
              {growth}%
            </p>
          )}
          {badge && (
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded ${badge.color}`}
            >
              {badge.text}
            </span>
          )}
        </div>
        <div className={`${iconBgColor} ${iconColor} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;

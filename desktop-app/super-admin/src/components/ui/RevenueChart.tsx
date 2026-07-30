import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MonthlyRevenue } from '../../types';

interface RevenueChartProps {
  data: MonthlyRevenue[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const [period, _setPeriod] = useState('Last 6 Months');

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const chartHeight = 240;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Monthly Collection Analytics</h2>
        <div className="relative">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-sm text-gray-700">{period}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="h-80">
        <svg className="w-full h-full" viewBox="0 0 600 280" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = 20 + (chartHeight - 40) * (1 - ratio);
            return (
              <g key={ratio}>
                <line x1="40" y1={y} x2="580" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                <text x="35" y={y + 4} textAnchor="end" className="text-xs" fill="#6b7280" fontSize="11">
                  ₱{(maxRevenue * ratio / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={`M ${data.map((d, i) => {
              const x = 50 + (i / (data.length - 1)) * 520;
              const y = 20 + (chartHeight - 40) * (1 - d.revenue / maxRevenue);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')} L ${50 + 520} ${chartHeight - 20} L 50 ${chartHeight - 20} Z`}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <path
            d={data.map((d, i) => {
              const x = 50 + (i / (data.length - 1)) * 520;
              const y = 20 + (chartHeight - 40) * (1 - d.revenue / maxRevenue);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = 50 + (i / (data.length - 1)) * 520;
            const y = 20 + (chartHeight - 40) * (1 - d.revenue / maxRevenue);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                <text x={x} y={chartHeight - 5} textAnchor="middle" fill="#6b7280" fontSize="11">{d.month}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default RevenueChart;

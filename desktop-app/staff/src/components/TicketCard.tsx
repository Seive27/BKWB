import React from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { AlertCircle, Clock } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  isActive: boolean;
  onClick: () => void;
}

const priorityConfig: Record<TicketPriority, { label: string; color: string; icon: React.ReactNode }> = {
  low: {
    label: 'Low',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: null,
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: <Clock className="w-3 h-3" />,
  },
  high: {
    label: 'High',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

const statusConfig: Record<TicketStatus, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const TicketCard: React.FC<TicketCardProps> = ({ ticket, isActive, onClick }) => {
  const priority = priorityConfig[ticket.priority];
  const status = statusConfig[ticket.status];

  return (
    <div
      onClick={onClick}
      className={`
        p-4 cursor-pointer transition-all duration-200 border-l-[3px]
        ${
          isActive
            ? 'bg-primary-50 border-l-primary-600 shadow-sm'
            : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono font-semibold text-gray-500">
          {ticket.ticketNumber}
        </span>
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${priority.color}`}
        >
          {priority.icon}
          <span>{priority.label}</span>
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-1 leading-snug">
        {ticket.subject}
      </h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-[9px] font-semibold text-gray-500">
              {ticket.residentInitials}
            </span>
          </div>
          <span className="text-xs text-gray-600">{ticket.residentName}</span>
        </div>
        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span>{status.label}</span>
        </span>
      </div>
    </div>
  );
};

export default TicketCard;

import React from 'react';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
} from '../../types';
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
};

const statusConfig: Record<TicketStatus, { label: string; color: string; dot: string }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  acknowledged: { label: 'Acknowledged', color: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  assigned: { label: 'Assigned', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  in_progress: { label: 'Ongoing', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  work_completed: { label: 'Work Completed', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

function residentName(ticket: Ticket): string {
  const r = ticket.resident;
  if (r) {
    return `${r.first_name} ${r.last_name}`.trim();
  }
  return 'Unknown resident';
}

function residentInitials(ticket: Ticket): string {
  const r = ticket.resident;
  if (r) {
    return `${r.first_name[0] ?? ''}${r.last_name[0] ?? ''}`.toUpperCase() || '?';
  }
  return '?';
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
          {ticket.ticket_number}
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
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-semibold text-gray-500">
              {residentInitials(ticket)}
            </span>
          </div>
          <span className="text-xs text-gray-600 truncate">{residentName(ticket)}</span>
        </div>
        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span>{TICKET_STATUS_LABELS[ticket.status]}</span>
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">
          {TICKET_CATEGORY_LABELS[ticket.category]}
        </span>
        <span className="text-[10px] text-gray-400">{formatShortDate(ticket.created_at)}</span>
      </div>
    </div>
  );
};

export default TicketCard;

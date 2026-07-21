import React, { useState } from 'react';
import {
  Search,
  Plus,
  Send,
  Paperclip,
  User,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  MessageSquare,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';
import { mockTickets } from '../data/mockTickets';
import TicketCard from '../components/TicketCard';
import CreateTicketModal from '../components/CreateTicketModal';
import {
  Ticket,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  TicketActivity,
} from '../types';

type FilterTab = 'all' | 'pending' | 'in-progress' | 'resolved' | 'closed';

const categoryLabels: Record<TicketCategory, string> = {
  billing: 'Billing Concern',
  payment: 'Payment Concern',
  'meter-reading': 'Meter Reading Concern',
  'water-service': 'Water Service Issue',
  'leak-report': 'Leak Report',
  'general-inquiry': 'General Inquiry',
};

const statusStyles: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const priorityStyles: Record<TicketPriority, { bg: string; text: string; icon: React.ReactNode }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <ArrowUpDown className="w-3 h-3" /> },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <AlertCircle className="w-3 h-3" /> },
  urgent: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
};

const ActivityIcon: React.FC<{ type: TicketActivity['type'] }> = ({ type }) => {
  switch (type) {
    case 'submitted':
      return (
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
          <FileText className="w-4 h-4 text-blue-600" />
        </div>
      );
    case 'staff-reply':
    case 'resident-reply':
      return (
        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-gray-600" />
        </div>
      );
    case 'image':
      return (
        <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
          <Paperclip className="w-4 h-4 text-purple-600" />
        </div>
      );
    case 'status-change':
      return (
        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-green-600" />
        </div>
      );
    case 'assignment':
      return (
        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
          <User className="w-4 h-4 text-amber-600" />
        </div>
      );
    default:
      return (
        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
          <Clock className="w-4 h-4 text-gray-600" />
        </div>
      );
  }
};

const Tickets: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(mockTickets[0]);
  const [replyText, setReplyText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' },
  ];

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesSearch =
      ticket.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || ticket.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleCreateTicket = (data: {
    residentName: string;
    category: TicketCategory;
    subject: string;
    description: string;
    priority: TicketPriority;
  }) => {
    console.log('Creating ticket:', data);
  };

  const handleSendReply = () => {
    if (replyText.trim()) {
      console.log('Sending reply:', replyText);
      setReplyText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const s = statusStyles[status];
    return (
      <span
        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span>
          {status === 'in-progress'
            ? 'In Progress'
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </span>
    );
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    const p = priorityStyles[priority];
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${p.bg} ${p.text}`}
      >
        {p.icon}
        <span>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
      </span>
    );
  };

  const getActionButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    enabled: boolean,
    color: string
  ) => (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        enabled
          ? `${color} shadow-sm hover:shadow`
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-gray-50">
      {/* ── Left Panel – Ticket List (30%) ── */}
      <div className="w-[30%] min-w-[300px] max-w-[420px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Search & Create */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Ticket</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[64px] px-2 py-3 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isActive={selectedTicket?.id === ticket.id}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No tickets found</h3>
              <p className="text-xs text-gray-500">Try adjusting your search or filter</p>
            </div>
          )}
        </div>

        {/* Ticket Count */}
        <div className="px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Showing {filteredTickets.length} of {mockTickets.length} tickets
          </p>
        </div>
      </div>

      {/* ── Right Panel – Ticket Details (70%) ── */}
      {selectedTicket ? (
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0 relative">
          {/* ── Ticket Header ── */}
          <div className="bg-white border-b border-gray-200 px-8 py-5">
            {/* Title Row + Actions */}
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {selectedTicket.subject}
              </h1>
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                {/* Action Buttons */}
                {getActionButton(
                  'Assign',
                  <User className="w-3.5 h-3.5" />,
                  () => console.log('Assign ticket'),
                  true,
                  'bg-white border border-gray-300 text-gray-700 hover:border-primary-300 hover:text-primary-700'
                )}
                {getActionButton(
                  'Mark In Progress',
                  <Clock className="w-3.5 h-3.5" />,
                  () => console.log('Mark in progress'),
                  selectedTicket.status === 'pending',
                  'bg-blue-600 text-white hover:bg-blue-700'
                )}
                {getActionButton(
                  'Resolve',
                  <CheckCircle className="w-3.5 h-3.5" />,
                  () => console.log('Resolve ticket'),
                  selectedTicket.status === 'in-progress',
                  'bg-green-600 text-white hover:bg-green-700'
                )}
                {getActionButton(
                  'Close Ticket',
                  <XCircle className="w-3.5 h-3.5" />,
                  () => console.log('Close ticket'),
                  selectedTicket.status === 'resolved',
                  'bg-gray-800 text-white hover:bg-gray-900'
                )}
                {/* Details Toggle */}
                <button
                  onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
                  className={`p-1.5 rounded-lg transition-all ${
                    showDetailsDrawer
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Ticket Details"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-600">
                    {selectedTicket.residentInitials}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {selectedTicket.residentName}
                </span>
              </div>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs font-mono font-semibold text-gray-500">
                {selectedTicket.ticketNumber}
              </span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-gray-500">
                {categoryLabels[selectedTicket.category]}
              </span>
              <span className="text-xs text-gray-300">|</span>
              <span>{getPriorityBadge(selectedTicket.priority)}</span>
              <span>{getStatusBadge(selectedTicket.status)}</span>
              {selectedTicket.assignedStaff && (
                <>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-500">
                    Assigned to{' '}
                    <span className="font-semibold text-gray-700">
                      {selectedTicket.assignedStaff}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Collapsible Details Drawer ── */}
          {showDetailsDrawer && (
            <div className="bg-blue-50 border-b border-blue-200 px-8 py-4 animate-slide-down">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                  Ticket Details
                </h3>
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="p-1 rounded hover:bg-blue-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Ticket No.</span>
                  <p className="text-sm font-mono font-semibold text-blue-900 mt-0.5">
                    {selectedTicket.ticketNumber}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Category</span>
                  <p className="text-sm font-medium text-blue-900 mt-0.5">
                    {categoryLabels[selectedTicket.category]}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Priority</span>
                  <p className="mt-0.5">{getPriorityBadge(selectedTicket.priority)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Status</span>
                  <p className="mt-0.5">{getStatusBadge(selectedTicket.status)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Assigned To</span>
                  <p className="text-sm font-medium text-blue-900 mt-0.5">
                    {selectedTicket.assignedStaff || (
                      <span className="text-blue-400 italic">Unassigned</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Created</span>
                  <p className="text-sm text-blue-900 mt-0.5">{selectedTicket.dateCreated}</p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Updated</span>
                  <p className="text-sm text-blue-900 mt-0.5">{selectedTicket.dateUpdated}</p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Contact</span>
                  <p className="text-sm text-blue-900 mt-0.5">
                    {selectedTicket.residentContact}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Description ── */}
          <div className="mx-8 mt-5 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Description</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selectedTicket.description}
            </p>
            {selectedTicket.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {selectedTicket.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>{att.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Scrollable: Timeline + Reply ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Activity Timeline */}
            <div className="flex-1 overflow-y-auto px-8 pt-5 pb-4">
              <div className="flex items-center space-x-2 mb-5">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Activity Timeline</h3>
              </div>

              <div className="space-y-4">
                {selectedTicket.activities.map((activity, idx) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <ActivityIcon type={activity.type} />
                      {idx < selectedTicket.activities.length - 1 && (
                        <div className="w-0.5 flex-1 min-h-[16px] bg-gray-200 mt-1" />
                      )}
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-w-0 mb-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`text-sm font-semibold ${
                            activity.userRole === 'staff' ? 'text-primary-600' : 'text-gray-900'
                          }`}
                        >
                          {activity.userName}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            activity.userRole === 'staff'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {activity.userRole === 'staff' ? 'Staff' : 'Resident'}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{activity.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {activity.message}
                      </p>
                      {activity.imageUrl && (
                        <img
                          src={activity.imageUrl}
                          alt="Attachment"
                          className="mt-3 rounded-lg border border-gray-200 max-w-xs max-h-48 object-cover"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Reply Area ── */}
            <div className="bg-white border-t border-gray-200 px-8 py-4 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
                <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  className={`p-2.5 rounded-xl transition-all ${
                    replyText.trim()
                      ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Select a ticket to view details
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Choose a ticket from the list to view details and manage resident concerns.
            </p>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTicket={handleCreateTicket}
      />
    </div>
  );
};

export default Tickets;

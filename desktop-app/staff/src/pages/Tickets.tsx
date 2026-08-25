import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  User,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  RefreshCw,
  Info,
  X,
  Trash2,
  Save,
  Loader2,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import TicketCard from '../components/ui/TicketCard';
import CreateTicketModal from '../components/modals/CreateTicketModal';
import { useAuth } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';
import {
  assignTicket,
  createTicket,
  deleteTicket,
  getMeterReaderProfiles,
  getStaffProfiles,
  getTicketById,
  updateStatus,
  updateTicket,
} from '../services/ticketService';
import {
  StaffOption,
  TicketCategory,
  TicketDraft,
  TicketPriority,
  TicketStatus,
  TicketTimelineEvent,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '../types';

type CategoryFilter = 'all' | TicketCategory;
type StatusFilter = 'all' | TicketStatus;

/** A staff member OR meter reader selectable in the assign-ticket picker. */
type AssignOption = StaffOption & { role: 'staff' | 'meter_reader' };
type PriorityFilter = 'all' | TicketPriority;
type SortKey = 'newest' | 'oldest' | 'priority' | 'status';

const STATUS_ORDER: Record<TicketStatus, number> = {
  open: 0,
  acknowledged: 1,
  assigned: 2,
  scheduled: 3,
  in_progress: 4,
  resolved: 5,
  closed: 6,
};

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const statusStyles: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  acknowledged: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  assigned: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  scheduled: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const priorityStyles: Record<TicketPriority, { bg: string; text: string; icon: React.ReactNode }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <ArrowUpDown className="w-3 h-3" /> },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <AlertCircle className="w-3 h-3" /> },
};

function fullName(person?: { first_name: string; last_name: string } | null): string {
  if (!person) return '';
  return `${person.first_name} ${person.last_name}`.trim();
}

function initials(person?: { first_name: string; last_name: string } | null): string {
  const name = fullName(person);
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const TimelineIcon: React.FC<{ type: TicketTimelineEvent['event_type'] }> = ({ type }) => {
  if (type === 'created') {
    return (
      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
        <FileText className="w-4 h-4 text-blue-600" />
      </div>
    );
  }
  if (type === 'assigned') {
    return (
      <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
        <User className="w-4 h-4 text-violet-600" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center ring-4 ring-white flex-shrink-0">
      <RefreshCw className="w-4 h-4 text-amber-600" />
    </div>
  );
};

function timelineTitle(event: TicketTimelineEvent): string {
  switch (event.event_type) {
    case 'created':
      return 'Ticket Created';
    case 'assigned':
      return 'Ticket Assigned';
    case 'status_change': {
      const desc = event.description?.toLowerCase() ?? '';
      if (desc.includes('resolved')) return 'Ticket Resolved';
      if (desc.includes('closed')) return 'Ticket Closed';
      return 'Status Updated';
    }
  }
}

const Tickets: React.FC = () => {
  const { user } = useAuth();
  const { tickets, loading, refreshing, error, refresh } = useTickets();

  // ──── Filters / sort ────
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  // ──── Selection / details ────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TicketTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  // ──── Modals / actions ────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffOptions, setStaffOptions] = useState<AssignOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // ──── Toasts ────
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  // Load staff + meter reader options once (for the assign picker).
  useEffect(() => {
    Promise.all([getStaffProfiles(), getMeterReaderProfiles()])
      .then(([staff, readers]) =>
        setStaffOptions(
          [
            ...staff.map((s) => ({ ...s, role: 'staff' as const })),
            ...readers.map((r) => ({ ...r, role: 'meter_reader' as const })),
          ].sort((a, b) => a.last_name.localeCompare(b.last_name))
        )
      )
      .catch(() => {
        // Non-fatal - the assign modal will show an error when used.
      });
  }, []);

  // Fetch the selected ticket's timeline whenever it (or its updated_at) changes.
  useEffect(() => {
    const id = selectedId;
    if (!id) {
      setTimeline([]);
      return;
    }
    let cancelled = false;
    setTimelineLoading(true);
    getTicketById(id)
      .then((data) => {
        if (!cancelled) {
          setTimeline(data?.timeline ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setTimeline([]);
      })
      .finally(() => {
        if (!cancelled) setTimelineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, selectedTicket?.updated_at]);

  // Keep the notes draft in sync with the selected ticket.
  useEffect(() => {
    setNotesDraft(selectedTicket?.internal_notes ?? '');
  }, [selectedTicket?.id, selectedTicket?.internal_notes]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = tickets.filter((ticket) => {
      const matchesSearch =
        q.length === 0 ||
        ticket.ticket_number.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        fullName(ticket.resident).toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'priority':
          return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [tickets, searchQuery, categoryFilter, statusFilter, priorityFilter, sortKey]);

  // ──── Actions ────
  const actorId = user?.id ?? '';

  const handleCreate = async (draft: TicketDraft) => {
    if (!actorId) {
      showToast('error', 'You must be logged in to create tickets.');
      return;
    }
    await createTicket(draft, actorId);
    await refresh();
    showToast('success', 'Ticket created successfully.');
  };

  const handleAssign = async () => {
    if (!selectedTicket || !selectedStaffId || actionBusy) return;
    setActionBusy(true);
    try {
      const staff = staffOptions.find((s) => s.id === selectedStaffId);
      await assignTicket(
        selectedTicket.id,
        selectedStaffId,
        actorId,
        staff ? `${staff.first_name} ${staff.last_name}`.trim() : 'staff'
      );
      await refresh();
      setShowAssignModal(false);
      showToast('success', `Ticket assigned to ${fullName(staff)}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to assign ticket.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedTicket || actionBusy) return;
    setActionBusy(true);
    try {
      await updateStatus(selectedTicket.id, status, actorId);
      await refresh();
      showToast('success', `Ticket marked as ${TICKET_STATUS_LABELS[status]}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket || actionBusy) return;
    setActionBusy(true);
    try {
      await updateStatus(
        selectedTicket.id,
        'resolved',
        actorId,
        resolutionDraft.trim().length > 0 ? resolutionDraft.trim() : undefined
      );
      await refresh();
      setShowResolveModal(false);
      setResolutionDraft('');
      showToast('success', 'Ticket marked as Resolved.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to resolve ticket.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket || actionBusy) return;
    setActionBusy(true);
    try {
      await updateTicket(selectedTicket.id, { internal_notes: notesDraft });
      await refresh();
      showToast('success', 'Internal notes saved. They are never shown to residents.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save notes.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTicket || actionBusy) return;
    setActionBusy(true);
    try {
      await deleteTicket(selectedTicket.id);
      await refresh();
      setShowDeleteModal(false);
      setSelectedId(null);
      showToast('success', 'Ticket deleted.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete ticket.');
    } finally {
      setActionBusy(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const s = statusStyles[status];
    return (
      <span
        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span>{TICKET_STATUS_LABELS[status]}</span>
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
        <span>{TICKET_PRIORITY_LABELS[priority]}</span>
      </span>
    );
  };

  const selectStyles =
    'w-full appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-gray-700';

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-gray-50">
      {/* ──── Left Panel —œ Ticket List ──── */}
      <div className="w-[30%] min-w-[300px] max-w-[420px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Search & Create */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets·¦"
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

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className={selectStyles}
              >
                <option value="all">All Categories</option>
                {(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {TICKET_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={selectStyles}
              >
                <option value="all">All Statuses</option>
                {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {TICKET_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className={selectStyles}
              >
                <option value="all">All Priorities</option>
                {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((pr) => (
                  <option key={pr} value={pr}>
                    {TICKET_PRIORITY_LABELS[pr]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={selectStyles}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority (High → Low)</option>
                <option value="status">Status (Open → Closed)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Couldn't load tickets</h3>
              <p className="text-xs text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => refresh()}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          ) : filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isActive={selectedTicket?.id === ticket.id}
                onClick={() => setSelectedId(ticket.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}
              </h3>
              <p className="text-xs text-gray-500">
                {tickets.length === 0
                  ? 'Tickets filed by residents will appear here in real time.'
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          )}
        </div>

        {/* Ticket Count */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </p>
          {refreshing && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
        </div>
      </div>

      {/* ──── Right Panel —œ Ticket Details ──── */}
      {selectedTicket ? (
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0 relative overflow-hidden">
          {/* ──── Ticket Header ──── */}
          <div className="bg-white border-b border-gray-200 px-8 py-5">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {selectedTicket.subject}
              </h1>
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-all shadow-sm hover:shadow"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{selectedTicket.assigned_staff_id ? 'Reassign' : 'Assign'}</span>
                </button>
                {/* Lifecycle actions — only valid transitions are offered, mirroring the
    DB transition enforcement. Submitted -> Acknowledged -> Assigned ->
    Scheduled -> In Progress -> Resolved -> Closed */}
{selectedTicket.status === 'open' && (
  <button
    onClick={() => handleStatusChange('acknowledged')}
    disabled={actionBusy}
    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 transition-all shadow-sm hover:shadow disabled:opacity-50"
  >
    <CheckCircle className="w-3.5 h-3.5" />
    <span>Acknowledge</span>
  </button>
)}
{selectedTicket.status === 'assigned' && (
  <button
    onClick={() => handleStatusChange('scheduled')}
    disabled={actionBusy}
    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm hover:shadow disabled:opacity-50"
  >
    <Calendar className="w-3.5 h-3.5" />
    <span>Schedule</span>
  </button>
)}
{(selectedTicket.status === 'open' ||
  selectedTicket.status === 'acknowledged' ||
  selectedTicket.status === 'assigned' ||
  selectedTicket.status === 'scheduled') && (
  <button
    onClick={() => handleStatusChange('in_progress')}
    disabled={actionBusy}
    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow disabled:opacity-50"
  >
    <Clock className="w-3.5 h-3.5" />
    <span>In Progress</span>
  </button>
)}
{(selectedTicket.status === 'scheduled' || selectedTicket.status === 'in_progress') && (
  <button
    onClick={() => setShowResolveModal(true)}
    disabled={actionBusy}
    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm hover:shadow disabled:opacity-50"
  >
    <CheckCircle className="w-3.5 h-3.5" />
    <span>Resolve</span>
  </button>
)}
{(selectedTicket.status === 'resolved' || selectedTicket.status === 'in_progress') && (
  <button
    onClick={() => handleStatusChange('closed')}
    disabled={actionBusy}
    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-white hover:bg-gray-900 transition-all shadow-sm hover:shadow disabled:opacity-50"
  >
    <XCircle className="w-3.5 h-3.5" />
    <span>Close</span>
  </button>
)}
{selectedTicket.status === 'resolved' && (
  <button
    onClick={() => handleStatusChange('in_progress')}
    disabled={actionBusy}
    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm hover:shadow disabled:opacity-50"
  >
    <RefreshCw className="w-3.5 h-3.5" />
    <span>Reopen</span>
  </button>
)}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={actionBusy}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  title="Delete ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                    {initials(selectedTicket.resident)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {fullName(selectedTicket.resident) || 'Unknown resident'}
                </span>
              </div>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs font-mono font-semibold text-gray-500">
                {selectedTicket.ticket_number}
              </span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-gray-500">
                {TICKET_CATEGORY_LABELS[selectedTicket.category]}
              </span>
              <span className="text-xs text-gray-300">|</span>
              <span>{getPriorityBadge(selectedTicket.priority)}</span>
              <span>{getStatusBadge(selectedTicket.status)}</span>
              {selectedTicket.assigned_staff && (
                <>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-500">
                    Assigned to{' '}
                    <span className="font-semibold text-gray-700">
                      {fullName(selectedTicket.assigned_staff)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ──── Collapsible Details Drawer ──── */}
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
                    {selectedTicket.ticket_number}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Category</span>
                  <p className="text-sm font-medium text-blue-900 mt-0.5">
                    {TICKET_CATEGORY_LABELS[selectedTicket.category]}
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
                  <span className="text-[11px] text-blue-600 font-medium">Resident</span>
                  <p className="text-sm font-medium text-blue-900 mt-0.5">
                    {fullName(selectedTicket.resident) || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Assigned To</span>
                  <p className="text-sm font-medium text-blue-900 mt-0.5">
                    {fullName(selectedTicket.assigned_staff) || (
                      <span className="text-blue-400 italic">Unassigned</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Created</span>
                  <p className="text-sm text-blue-900 mt-0.5">
                    {formatDateTime(selectedTicket.created_at)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-blue-600 font-medium">Updated</span>
                  <p className="text-sm text-blue-900 mt-0.5">
                    {formatDateTime(selectedTicket.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ──── Scrollable content ──── */}
          <div className="flex-1 overflow-y-auto">
            {/* Description */}
            <div className="mx-8 mt-5 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Description</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedTicket.description}
              </p>
            </div>

            {/* Resolution */}
            {selectedTicket.resolution && (
              <div className="mx-8 mt-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-emerald-800">Resolution</h3>
                </div>
                <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.resolution}
                </p>
              </div>
            )}

            {/* Internal Notes (staff only — never visible to residents) */}
            <div className="mx-8 mt-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Internal Notes</h3>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                  Staff only — never shown to residents
                </span>
              </div>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add private notes for your team·¦"
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={actionBusy}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Notes</span>
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="mx-8 my-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2 mb-5">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Activity Timeline</h3>
                {timelineLoading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
              </div>

              {timeline.length === 0 ? (
                <p className="text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, idx) => (
                    <div key={event.id} className="flex items-start space-x-3">
                      <div className="flex flex-col items-center">
                        <TimelineIcon type={event.event_type} />
                        {idx < timeline.length - 1 && (
                          <div className="w-0.5 flex-1 min-h-[16px] bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-4 min-w-0 mb-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {timelineTitle(event)}
                          </span>
                          <span className="text-xs text-gray-400">·¢</span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(event.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {fullName(event.performer) || 'System'}
                          {event.description ? ` — ${event.description}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ──── Empty State ──── */
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

      {/* ──── Create Ticket Modal ──── */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      {/* ──── Assign Modal ──── */}
      {showAssignModal && selectedTicket && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAssignModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {selectedTicket.assigned_staff_id ? 'Reassign Ticket' : 'Assign Ticket'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {selectedTicket.ticket_number} Ã‚· {selectedTicket.subject}
            </p>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Assign To
            </label>
            <div className="relative mb-5">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-gray-900"
              >
                <option value="">Select staff or meter reader</option>
                <optgroup label="Staff">
                  {staffOptions.filter((s) => s.role === 'staff').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Meter Readers">
                  {staffOptions.filter((s) => s.role === 'meter_reader').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedStaffId || actionBusy}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
              >
                {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Assign</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── Resolve Modal ──── */}
      {showResolveModal && selectedTicket && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowResolveModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-slide-up">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Resolve Ticket</h2>
            <p className="text-sm text-gray-500 mb-5">
              {selectedTicket.ticket_number} Ã‚· {selectedTicket.subject}
            </p>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Resolution <span className="text-gray-400">(recommended)</span>
            </label>
            <textarea
              value={resolutionDraft}
              onChange={(e) => setResolutionDraft(e.target.value)}
              placeholder="Describe how this concern was resolved·¦"
              rows={5}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none mb-5"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={actionBusy}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
              >
                {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Mark Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── Delete Confirmation ──── */}
      {showDeleteModal && selectedTicket && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Ticket?</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  This will remove <span className="font-semibold">{selectedTicket.ticket_number}</span>{' '}
                  from the list. Residents will no longer see it. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionBusy}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
              >
                {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── Toast ──── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-up ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Tickets;

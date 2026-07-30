import React, { useState } from 'react';
import {
  Plus, Search, RefreshCw, Eye, Edit, Trash2,
  Megaphone, CalendarClock, Bell, Archive,
  X, ChevronDown, ToggleLeft, ToggleRight,
  Wrench, AlertTriangle, Calendar, Info,
} from 'lucide-react';
import { Announcement } from '../types';
import { allAnnouncements } from '../data/mockData';

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'maintenance': return 'bg-orange-100 text-orange-700';
    case 'interruption': return 'bg-red-100 text-red-700';
    case 'schedule': return 'bg-blue-100 text-blue-700';
    case 'general': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'scheduled': return 'bg-purple-100 text-purple-700';
    case 'archived': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600';
    case 'high': return 'text-orange-600';
    case 'normal': return 'text-blue-600';
    case 'low': return 'text-gray-500';
    default: return 'text-gray-500';
  }
};

const CATEGORIES = ['All Categories', 'Maintenance', 'Interruption', 'Schedule', 'General'] as const;
const STATUSES = ['All Statuses', 'Active', 'Scheduled', 'Archived'] as const;
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
const ITEMS_PER_PAGE = 10;

const mockHandlers = {
  create: (data: Omit<Announcement, 'id'>) => console.log('Creating announcement:', data),
  update: (id: string, data: Partial<Announcement>) => console.log('Updating announcement', id, ':', data),
  delete: (id: string) => console.log('Deleting announcement:', id),
  toggleStatus: (id: string, newStatus: 'active' | 'scheduled' | 'archived') => console.log('Toggling status for', id, 'to', newStatus),
};

const Announcements: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>(allAnnouncements);

  const filteredAnnouncements = announcements.filter((a) => {
    const ms = searchQuery === '' || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const mst = statusFilter === 'All Statuses' || a.status === statusFilter.toLowerCase();
    const mc = categoryFilter === 'All Categories' || a.category === categoryFilter.toLowerCase();
    return ms && mst && mc;
  });

  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const startEntry = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(currentPage * ITEMS_PER_PAGE, filteredAnnouncements.length);

  const handleRefresh = () => {
    setSearchQuery('');
    setStatusFilter('All Statuses');
    setCategoryFilter('All Categories');
    setCurrentPage(1);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'archived' : 'active';
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus as 'active' | 'scheduled' | 'archived' } : a)),
    );
    mockHandlers.toggleStatus(id, newStatus as 'active' | 'scheduled' | 'archived');
  };

  const handleDelete = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    mockHandlers.delete(id);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Announcements</h1>
              <p className="text-gray-600">Create and manage official announcements for water schedules, interruptions, maintenance notices, and service updates.</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Create Announcement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center"><Megaphone className="w-6 h-6 text-blue-600" /></div>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Announcements</p>
              <h3 className="text-3xl font-bold text-gray-900">{announcements.length}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center"><Bell className="w-6 h-6 text-green-600" /></div>
                <span className="text-sm font-semibold text-green-600">{announcements.filter((a) => a.status === 'active').length}</span>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Active</p>
              <h3 className="text-3xl font-bold text-gray-900">{announcements.filter((a) => a.status === 'active').length}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center"><CalendarClock className="w-6 h-6 text-purple-600" /></div>
                <span className="text-sm font-semibold text-purple-600">{announcements.filter((a) => a.status === 'scheduled').length}</span>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Scheduled</p>
              <h3 className="text-3xl font-bold text-gray-900">{announcements.filter((a) => a.status === 'scheduled').length}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><Archive className="w-6 h-6 text-gray-500" /></div>
                <span className="text-sm font-semibold text-gray-600">{announcements.filter((a) => a.status === 'archived').length}</span>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Archived</p>
              <h3 className="text-3xl font-bold text-gray-900">{announcements.filter((a) => a.status === 'archived').length}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Filter by keyword..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <button onClick={() => { setShowStatusFilter(!showStatusFilter); setShowCategoryFilter(false); }} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700">{statusFilter}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showStatusFilter && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48">
                      {STATUSES.map((s) => (
                        <button key={s} onClick={() => { setStatusFilter(s); setShowStatusFilter(false); setCurrentPage(1); }}
                          className={"w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg " + (statusFilter === s ? "text-primary-600 font-medium bg-primary-50" : "text-gray-700")}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => { setShowCategoryFilter(!showCategoryFilter); setShowStatusFilter(false); }} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700">{categoryFilter}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showCategoryFilter && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-52">
                      {CATEGORIES.map((c) => (
                        <button key={c} onClick={() => { setCategoryFilter(c); setShowCategoryFilter(false); setCurrentPage(1); }}
                          className={"w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg " + (categoryFilter === c ? "text-primary-600 font-medium bg-primary-50" : "text-gray-700")}>{c}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleRefresh} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Reset filters">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Announcement Details</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Posted Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedAnnouncements.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center"><p className="text-sm text-gray-500">No announcements found matching your filters.</p></td></tr>
                  ) : (
                    paginatedAnnouncements.map((announcement) => (
                      <tr key={announcement.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start space-x-3">
                            <div className={"w-9 h-9 rounded-lg flex items-center justify-center " + getCategoryColor(announcement.category)}>
                              {announcement.category === 'maintenance' && <Wrench className="w-4 h-4" />}
                              {announcement.category === 'interruption' && <AlertTriangle className="w-4 h-4" />}
                              {announcement.category === 'schedule' && <Calendar className="w-4 h-4" />}
                              {announcement.category === 'general' && <Info className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-md">{announcement.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{announcement.description}</p>
                              <span className={"text-xs font-medium mt-1 inline-block " + getPriorityColor(announcement.priority)}>
                                {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={"px-3 py-1 text-xs font-semibold rounded-full " + getCategoryColor(announcement.category)}>
                            {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {announcement.postedDate}
                          {announcement.scheduledDate && <div className="text-xs text-gray-400 mt-0.5">Scheduled: {announcement.scheduledDate}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={"px-3 py-1 text-xs font-semibold rounded-full " + getStatusColor(announcement.status)}>
                            {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                            <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(announcement.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            <button onClick={() => handleToggleStatus(announcement.id, announcement.status)}
                              className={"p-1.5 rounded transition-colors " + (announcement.status === 'active' ? "text-green-500 hover:text-green-600 hover:bg-green-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100")}
                              title={announcement.status === 'active' ? "Archive" : "Activate"}>
                              {announcement.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">Showing {filteredAnnouncements.length > 0 ? startEntry : 0} - {endEntry} of {filteredAnnouncements.length} announcements</div>
              <div className="flex items-center space-x-2">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) { pageNum = i + 1; }
                  else if (currentPage <= 3) { pageNum = i + 1; }
                  else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                  else { pageNum = currentPage - 2 + i; }
                  return (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                      className={"px-3 py-1 text-sm rounded " + (currentPage === pageNum ? "bg-primary-600 text-white" : "text-gray-600 border border-gray-300 hover:bg-gray-50") + " transition-colors"}>{pageNum}</button>
                  );
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCreateModal && (
        <CreateAnnouncementModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => {
            const newAnnouncement: Announcement = { id: String(Date.now()), ...data };
            setAnnouncements((prev) => [newAnnouncement, ...prev]);
            mockHandlers.create(data);
            setShowCreateModal(false);
          }}
        />
      )}
    </>
  );
};

interface CreateAnnouncementModalProps {
  onClose: () => void;
  onCreate: (data: Omit<Announcement, 'id'>) => void;
}

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Announcement['category']>('general');
  const [priority, setPriority] = useState<Announcement['priority']>('normal');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [sendNotification, setSendNotification] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    const status = publishImmediately ? 'active' : 'scheduled';
    onCreate({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: status as 'active' | 'scheduled',
      postedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      scheduledDate: scheduledDate || undefined,
      publishImmediately,
      sendNotification,
    });
  };

  const isFormValid = title.trim() && description.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Announcement</h2>
            <p className="text-sm text-gray-600 mt-1">Create and publish an announcement to all residents</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="px-8 py-6 space-y-6">
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Title <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Scheduled Maintenance - Zone A" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Announcement['category'])} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="maintenance">Maintenance</option>
                <option value="interruption">Interruption</option>
                <option value="schedule">Schedule</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Announcement['priority'])} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                {PRIORITIES.map((p) => (<option key={p} value={p.toLowerCase()}>{p}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Description <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter detailed information about the announcement..." rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Schedule Date {!publishImmediately && <span className="text-red-500">*</span>}</label>
            <input type="text" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} placeholder="mm/dd/yyyy" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Publish Immediately</p>
                <p className="text-xs text-gray-500 mt-0.5">Set status to active upon saving.</p>
              </div>
              <button onClick={() => setPublishImmediately(!publishImmediately)} className={"relative w-11 h-6 rounded-full transition-colors " + (publishImmediately ? "bg-primary-600" : "bg-gray-300")}>
                <span className={"absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform " + (publishImmediately ? "translate-x-5" : "")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Send Notification to Residents</p>
                <p className="text-xs text-gray-500 mt-0.5">Notify all residents about this announcement.</p>
              </div>
              <button onClick={() => setSendNotification(!sendNotification)} className={"relative w-11 h-6 rounded-full transition-colors " + (sendNotification ? "bg-primary-600" : "bg-gray-300")}>
                <span className={"absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform " + (sendNotification ? "translate-x-5" : "")} />
              </button>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!isFormValid} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save Announcement</button>
        </div>
      </div>
    </div>
  );
};

export default Announcements;

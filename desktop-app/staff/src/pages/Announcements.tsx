import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Megaphone,
  CheckCircle2,
  FileText,
  Clock,
  X,
  ChevronDown,
  Check,
  AlertCircle,
  Calendar,
  AlertTriangle,
  Wrench,
  Receipt,
  Info,
  Siren,
} from 'lucide-react';
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementDraft,
  AnnouncementPriority,
} from '../types';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useAuth } from '../hooks/useAuth';
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from '../services/announcementService';
import { FutureDateTimeField } from '../components/ui/FutureDateTimeField';

// ── Constants ──

const CATEGORY_META: Record<AnnouncementCategory, { label: string; badge: string; icon: React.ElementType }> = {
  schedule: { label: 'Water Schedule', badge: 'bg-blue-100 text-blue-700', icon: Calendar },
  interruption: { label: 'Water Interruption', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
  maintenance: { label: 'Maintenance', badge: 'bg-orange-100 text-orange-700', icon: Wrench },
  billing: { label: 'Billing', badge: 'bg-purple-100 text-purple-700', icon: Receipt },
  general: { label: 'General Announcement', badge: 'bg-gray-100 text-gray-700', icon: Info },
  emergency: { label: 'Emergency', badge: 'bg-rose-100 text-rose-700', icon: Siren },
};

const PRIORITY_META: Record<AnnouncementPriority, { label: string; badge: string }> = {
  normal: { label: 'Normal', badge: 'bg-blue-100 text-blue-700' },
  important: { label: 'Important', badge: 'bg-amber-100 text-amber-700' },
  emergency: { label: 'Emergency', badge: 'bg-red-100 text-red-700' },
};

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'All',
  residents: 'Residents',
  meter_readers: 'Meter Readers',
  staff: 'Staff',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value: value as AnnouncementCategory,
  label: meta.label,
}));
const PRIORITY_OPTIONS = Object.entries(PRIORITY_META).map(([value, meta]) => ({
  value: value as AnnouncementPriority,
  label: meta.label,
}));
const AUDIENCE_OPTIONS = Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({
  value: value as AnnouncementAudience,
  label,
}));

const ITEMS_PER_PAGE = 10;
const MAX_TITLE_LENGTH = 150;
const MAX_CONTENT_LENGTH = 5000;

// ── Helpers ──

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export type AnnouncementStatus = 'published' | 'draft' | 'scheduled' | 'expired';

function isExpired(a: Announcement): boolean {
  return !!a.expires_at && new Date(a.expires_at).getTime() < Date.now();
}

function getStatus(a: Announcement): AnnouncementStatus {
  if (isExpired(a)) return 'expired';
  // A published announcement with a future publish time is still scheduled.
  if (a.is_published && !!a.scheduled_at && new Date(a.scheduled_at).getTime() > Date.now()) {
    return 'scheduled';
  }
  return a.is_published ? 'published' : 'draft';
}

const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  scheduled: 'Scheduled',
  expired: 'Expired',
};

const STATUS_BADGES: Record<AnnouncementStatus, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  expired: 'bg-yellow-100 text-yellow-700',
};

// ── Skeleton ──

function TableSkeleton() {
  return (
    <tbody className="divide-y divide-gray-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td className="px-6 py-4">
            <div className="h-4 w-3/5 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-gray-100" />
          </td>
          <td className="px-6 py-4"><div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-gray-100" /></td>
          <td className="px-6 py-4"><div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-16 animate-pulse rounded bg-gray-100" /></td>
          <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-gray-100" /></td>
        </tr>
      ))}
    </tbody>
  );
}

// ── Announcement Form Modal ──

interface AnnouncementFormModalProps {
  initial?: Announcement | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

const emptyDraft = (): AnnouncementDraft => ({
  title: '',
  content: '',
  category: 'general',
  priority: 'normal',
  target_audience: 'all',
  is_published: true,
  expires_at: null,
  scheduled_at: null,
});

function AnnouncementFormModal({ initial, onClose, onSaved, onError }: AnnouncementFormModalProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<AnnouncementDraft>(() =>
    initial
      ? {
          title: initial.title,
          content: initial.content,
          category: initial.category,
          priority: initial.priority,
          target_audience: initial.target_audience,
          is_published: initial.is_published,
          expires_at: initial.expires_at,
          scheduled_at: initial.scheduled_at,
        }
      : emptyDraft()
  );
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!draft.title.trim()) errors.title = 'Title is required.';
    else if (draft.title.trim().length > MAX_TITLE_LENGTH) {
      errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
    }
    if (!draft.content.trim()) errors.content = 'Content is required.';
    else if (draft.content.trim().length > MAX_CONTENT_LENGTH) {
      errors.content = `Content must be ${MAX_CONTENT_LENGTH} characters or fewer.`;
    }
    // Past dates are rejected on the frontend (the backend trigger enforces
    // the same rules server-side).
    if (draft.expires_at && new Date(draft.expires_at).getTime() <= Date.now()) {
      errors.expires_at = 'Expiration must be in the future.';
    }
    // A past schedule time is only an error on create — when editing an
    // announcement whose schedule already fired, the value is simply cleared.
    if (!initial && draft.scheduled_at && new Date(draft.scheduled_at).getTime() <= Date.now()) {
      errors.scheduled_at = 'Schedule time must be in the future.';
    }
    if (
      draft.expires_at &&
      draft.scheduled_at &&
      new Date(draft.expires_at).getTime() <= new Date(draft.scheduled_at).getTime()
    ) {
      errors.expires_at = 'Expiration must be after the scheduled publish time.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: AnnouncementDraft = {
        ...draft,
        title: draft.title.trim(),
        content: draft.content.trim(),
        expires_at: draft.expires_at || null,
        // Clear a schedule time that already fired (the announcement is live).
        scheduled_at:
          draft.scheduled_at && new Date(draft.scheduled_at).getTime() > Date.now()
            ? draft.scheduled_at
            : null,
      };
      if (initial) {
        await updateAnnouncement(initial.id, payload);
        onSaved('Announcement updated successfully.');
      } else {
        if (!user?.id) throw new Error('You must be signed in to create an announcement.');
        await createAnnouncement(payload, user.id);
        onSaved('Announcement created successfully.');
      }
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {initial ? 'Edit Announcement' : 'Create New Announcement'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {initial ? 'Update the details below and save your changes.' : 'Create and publish an announcement to your audience.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g., Scheduled Water Interruption - Zone 4"
              maxLength={MAX_TITLE_LENGTH}
              className={inputClass(!!fieldErrors.title)}
            />
            {fieldErrors.title ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">{draft.title.length}/{MAX_TITLE_LENGTH}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Category</label>
              <select
                value={draft.category}
                onChange={(e) => set('category', e.target.value as AnnouncementCategory)}
                className={inputClass(false)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Priority</label>
              <select
                value={draft.priority}
                onChange={(e) => set('priority', e.target.value as AnnouncementPriority)}
                className={inputClass(false)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Target Audience</label>
              <select
                value={draft.target_audience}
                onChange={(e) => set('target_audience', e.target.value as AnnouncementAudience)}
                className={inputClass(false)}
              >
                {AUDIENCE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={draft.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder="Enter the full announcement details..."
              rows={5}
              maxLength={MAX_CONTENT_LENGTH}
              className={`${inputClass(!!fieldErrors.content)} resize-none`}
            />
            {fieldErrors.content ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.content}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">{draft.content.length}/{MAX_CONTENT_LENGTH}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                Expiration Date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <FutureDateTimeField
                value={draft.expires_at}
                onChange={(iso) => set('expires_at', iso)}
                hasError={!!fieldErrors.expires_at}
              />
              {fieldErrors.expires_at && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.expires_at}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                Publish At <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <FutureDateTimeField
                value={draft.scheduled_at}
                onChange={(iso) => set('scheduled_at', iso)}
                hasError={!!fieldErrors.scheduled_at}
              />
              {fieldErrors.scheduled_at ? (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.scheduled_at}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">
                  Leave empty to publish immediately. Past dates are disabled.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Publish Immediately</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When off, the announcement is saved as a draft and hidden from audiences.
              </p>
            </div>
            <button
              onClick={() => {
                set('is_published', !draft.is_published);
                // Publishing now conflicts with a future schedule time.
                if (!draft.is_published) set('scheduled_at', null);
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${draft.is_published ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  draft.is_published ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-700 leading-5">
              <strong>Tip:</strong> to schedule an announcement for a future time, set a future
              <em> Publish At</em> date above and keep <em>Publish Immediately</em> on. It will stay
              hidden from residents and staff until the scheduled time, then become visible automatically.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Announcement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──

interface DeleteModalProps {
  announcement: Announcement;
  onClose: () => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
}

function DeleteConfirmationModal({ announcement, onClose, onDeleted, onError }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAnnouncement(announcement.id);
      onDeleted('Announcement deleted.');
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete announcement.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Delete Announcement</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{announcement.title}"</span>?
              This will remove it from all apps immediately.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center space-x-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Modal ──

function ViewAnnouncementModal({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  const Meta = CATEGORY_META[announcement.category];
  const Priority = PRIORITY_META[announcement.priority];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-5 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${Meta.badge}`}>
              <Meta.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{announcement.title}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${Meta.badge}`}>
                  {Meta.label}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${Priority.badge}`}>
                  {Priority.label} Priority
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGES[getStatus(announcement)]}`}>
                  {STATUS_LABELS[getStatus(announcement)]}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-8 py-6">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">{announcement.content}</p>
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Target Audience</p>
              <p className="text-gray-700 font-medium">{AUDIENCE_LABELS[announcement.target_audience]}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Created By</p>
              <p className="text-gray-700 font-medium">
                {announcement.creator
                  ? `${announcement.creator.first_name} ${announcement.creator.last_name}`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Created</p>
              <p className="text-gray-700 font-medium">{formatDate(announcement.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Publishes</p>
              <p className="text-gray-700 font-medium">{formatDateTime(announcement.scheduled_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Expires</p>
              <p className="text-gray-700 font-medium">{formatDateTime(announcement.expires_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

const Announcements: React.FC = () => {
  const { announcements, loading, refreshing, error, refresh } = useAnnouncements();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AnnouncementCategory>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | AnnouncementPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AnnouncementStatus>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending toast timer on unmount to avoid setState warnings.
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

  const stats = useMemo(() => {
    const published = announcements.filter((a) => getStatus(a) === 'published').length;
    const drafts = announcements.filter((a) => getStatus(a) === 'draft').length;
    const scheduled = announcements.filter((a) => getStatus(a) === 'scheduled').length;
    const expired = announcements.filter((a) => getStatus(a) === 'expired').length;
    return { total: announcements.length, published, drafts, scheduled, expired };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = announcements.filter((a) => {
      const matchesSearch =
        q === '' ||
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
      const matchesPriority = priorityFilter === 'all' || a.priority === priorityFilter;
      const matchesStatus = statusFilter === 'all' || getStatus(a) === statusFilter;
      return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === 'newest' ? -diff : diff;
    });
  }, [announcements, searchQuery, categoryFilter, priorityFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredAnnouncements.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  const startEntry = filteredAnnouncements.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(safePage * ITEMS_PER_PAGE, filteredAnnouncements.length);

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Announcements</h1>
              <p className="text-gray-600">
                Create and manage official announcements for water schedules, interruptions, maintenance notices, and service updates.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Create Announcement</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                <Megaphone className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Announcements</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.total}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Published</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.published}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-blue-700" />
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Scheduled</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.scheduled}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Drafts</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.drafts}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Expired</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.expired}</h3>
            </div>
          </div>

          {/* Error banner */}
          {error && !loading && (
            <div className="mb-6 flex items-start justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">Unable to load announcements</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
              <button
                onClick={() => refresh()}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or content..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-3">
                {/* Category filter */}
                <div className="relative">
                  <button
                    onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowPriorityDropdown(false); setShowStatusDropdown(false); setShowSortDropdown(false); }}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {categoryFilter === 'all' ? 'All Categories' : CATEGORY_META[categoryFilter].label}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-52">
                      <button onClick={() => { setCategoryFilter('all'); setShowCategoryDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg ${categoryFilter === 'all' ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                        All Categories
                      </button>
                      {CATEGORY_OPTIONS.map((c) => (
                        <button key={c.value} onClick={() => { setCategoryFilter(c.value); setShowCategoryDropdown(false); setCurrentPage(1); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors last:rounded-b-lg ${categoryFilter === c.value ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority filter */}
                <div className="relative">
                  <button
                    onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowCategoryDropdown(false); setShowStatusDropdown(false); setShowSortDropdown(false); }}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {priorityFilter === 'all' ? 'All Priorities' : PRIORITY_META[priorityFilter].label}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showPriorityDropdown && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48">
                      <button onClick={() => { setPriorityFilter('all'); setShowPriorityDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg ${priorityFilter === 'all' ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                        All Priorities
                      </button>
                      {PRIORITY_OPTIONS.map((p) => (
                        <button key={p.value} onClick={() => { setPriorityFilter(p.value); setShowPriorityDropdown(false); setCurrentPage(1); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors last:rounded-b-lg ${priorityFilter === p.value ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status filter */}
                <div className="relative">
                  <button
                    onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowCategoryDropdown(false); setShowPriorityDropdown(false); setShowSortDropdown(false); }}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {statusFilter === 'all' ? 'All Statuses' : STATUS_LABELS[statusFilter]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44">
                      <button onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg ${statusFilter === 'all' ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                        All Statuses
                      </button>
                      {(Object.keys(STATUS_LABELS) as AnnouncementStatus[]).map((s) => (
                        <button key={s} onClick={() => { setStatusFilter(s); setShowStatusDropdown(false); setCurrentPage(1); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors last:rounded-b-lg ${statusFilter === s ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sort */}
                <div className="relative">
                  <button
                    onClick={() => { setShowSortDropdown(!showSortDropdown); setShowCategoryDropdown(false); setShowPriorityDropdown(false); setShowStatusDropdown(false); }}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{sortBy === 'newest' ? 'Newest' : 'Oldest'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-40">
                      {(['newest', 'oldest'] as const).map((s) => (
                        <button key={s} onClick={() => { setSortBy(s); setShowSortDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${sortBy === s ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                          {s === 'newest' ? 'Newest First' : 'Oldest First'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { resetFilters(); refresh(); }}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Reset filters & refresh"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Announcement</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Audience</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Posted</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                {loading ? (
                  <TableSkeleton />
                ) : paginated.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-base font-semibold text-gray-700">
                          {announcements.length === 0 ? 'No announcements yet' : 'No matching announcements'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                          {announcements.length === 0
                            ? 'Create your first announcement to start sharing updates with residents and staff.'
                            : 'Try adjusting your search or filters to find what you are looking for.'}
                        </p>
                        {announcements.length === 0 ? (
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-5 inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-medium">Create Announcement</span>
                          </button>
                        ) : (
                          <button
                            onClick={resetFilters}
                            className="mt-5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            Clear Filters
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y divide-gray-200">
                    {paginated.map((announcement) => {
                      const Meta = CATEGORY_META[announcement.category];
                      const Priority = PRIORITY_META[announcement.priority];
                      const status = getStatus(announcement);
                      return (
                        <tr key={announcement.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-start space-x-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${Meta.badge}`}>
                                <Meta.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{announcement.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{announcement.content}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${Meta.badge}`}>{Meta.label}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${Priority.badge}`}>{Priority.label}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {AUDIENCE_LABELS[announcement.target_audience]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(announcement.created_at)}
                            {announcement.scheduled_at && (
                              <div className="text-xs text-blue-500 mt-0.5">Publishes {formatDateTime(announcement.scheduled_at)}</div>
                            )}
                            {announcement.expires_at && (
                              <div className="text-xs text-gray-400 mt-0.5">Expires {formatDateTime(announcement.expires_at)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_BADGES[status]}`}>
                              {STATUS_LABELS[status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setViewingAnnouncement(announcement)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingAnnouncement(announcement)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingAnnouncement(announcement)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredAnnouncements.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startEntry} - {endEntry} of {filteredAnnouncements.length} announcements
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (safePage <= 3) {
                      pageNum = i + 1;
                    } else if (safePage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = safePage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          safePage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <AnnouncementFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(m) => showToast('success', m)}
          onError={(m) => showToast('error', m)}
        />
      )}
      {editingAnnouncement && (
        <AnnouncementFormModal
          initial={editingAnnouncement}
          onClose={() => setEditingAnnouncement(null)}
          onSaved={(m) => showToast('success', m)}
          onError={(m) => showToast('error', m)}
        />
      )}
      {viewingAnnouncement && (
        <ViewAnnouncementModal
          announcement={viewingAnnouncement}
          onClose={() => setViewingAnnouncement(null)}
        />
      )}
      {deletingAnnouncement && (
        <DeleteConfirmationModal
          announcement={deletingAnnouncement}
          onClose={() => setDeletingAnnouncement(null)}
          onDeleted={(m) => showToast('success', m)}
          onError={(m) => showToast('error', m)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[60] flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
};

export default Announcements;

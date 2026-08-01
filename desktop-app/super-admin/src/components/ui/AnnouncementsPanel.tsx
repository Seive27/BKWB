import React from 'react';
import {
  Plus,
  Wrench,
  AlertTriangle,
  Calendar,
  Info,
  Receipt,
  Siren,
  Megaphone,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import type { AnnouncementCategory } from '../../types';

interface AnnouncementsPanelProps {
  /** Optional navigation callback, e.g. jump to the announcements page. */
  onNavigate?: (route: string) => void;
}

const CATEGORY_META: Record<AnnouncementCategory, { label: string; badge: string; icon: React.ElementType }> = {
  schedule: { label: 'Water Schedule', badge: 'bg-blue-100 text-blue-700', icon: Calendar },
  interruption: { label: 'Water Interruption', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
  maintenance: { label: 'Maintenance', badge: 'bg-orange-100 text-orange-700', icon: Wrench },
  billing: { label: 'Billing', badge: 'bg-purple-100 text-purple-700', icon: Receipt },
  general: { label: 'General Announcement', badge: 'bg-gray-100 text-gray-700', icon: Info },
  emergency: { label: 'Emergency', badge: 'bg-rose-100 text-rose-700', icon: Siren },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({ onNavigate }) => {
  const { announcements, loading, error, refresh } = useAnnouncements({ limit: 5 });
  const latest = announcements.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Latest Announcements</h2>
          {onNavigate && (
            <button
              onClick={() => onNavigate('announcements')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View All
            </button>
          )}
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('announcements')}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Announcement</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200 mb-2" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Unable to load announcements</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            <button
              onClick={() => refresh()}
              className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : latest.length === 0 ? (
          <div className="text-center py-10">
            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No announcements yet</p>
            <p className="text-xs text-gray-500 mt-1">Create your first announcement to get started.</p>
          </div>
        ) : (
          latest.map((announcement) => {
            const Meta = CATEGORY_META[announcement.category];
            return (
              <div
                key={announcement.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg shrink-0 ${Meta.badge}`}>
                    <Meta.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold uppercase ${Meta.badge}`}>{Meta.label}</span>
                      <span className="text-xs text-gray-500">{formatDate(announcement.created_at)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{announcement.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">{announcement.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPanel;

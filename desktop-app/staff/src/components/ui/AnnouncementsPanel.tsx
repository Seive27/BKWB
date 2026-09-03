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
  ArrowUpRight,
} from 'lucide-react';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import type { AnnouncementCategory } from '../../types';

interface AnnouncementsPanelProps {
  /** Optional navigation callback, e.g. jump to the announcements page. */
  onNavigate?: (route: string) => void;
}

const CATEGORY_META: Record<AnnouncementCategory, { label: string; badge: string; icon: React.ElementType }> = {
  schedule: { label: 'Schedule', badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar },
  interruption: { label: 'Interruption', badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle },
  maintenance: { label: 'Maintenance', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: Wrench },
  billing: { label: 'Billing', badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: Receipt },
  general: { label: 'General', badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: Info },
  emergency: { label: 'Emergency', badge: 'bg-red-50 text-red-700 border-red-200', icon: Siren },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({ onNavigate }) => {
  const { announcements, loading, error, refresh } = useAnnouncements({ limit: 5 });
  const latest = announcements.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Announcements</h2>
            <p className="text-[11px] text-slate-500">Public notices & service advisories</p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('announcements')}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('announcements')}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200 mb-2" />
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Unable to load announcements</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{error}</p>
            <button
              onClick={() => refresh()}
              className="mt-3 inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        ) : latest.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">No active announcements</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Notices posted will appear here.</p>
          </div>
        ) : (
          latest.map((announcement) => {
            const Meta = CATEGORY_META[announcement.category];
            const Icon = Meta.icon;
            return (
              <div
                key={announcement.id}
                onClick={() => onNavigate?.('announcements')}
                className="p-3 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer bg-white group"
              >
                <div className="flex items-start space-x-2.5">
                  <div className={`p-1.5 rounded-md shrink-0 border ${Meta.badge}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border ${Meta.badge}`}>
                        {Meta.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(announcement.created_at)}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {announcement.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                      {announcement.content}
                    </p>
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

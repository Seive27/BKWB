import React from 'react';
import { Plus, Wrench, AlertTriangle, Calendar, Info } from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementsPanelProps {
  announcements: Announcement[];
}

const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({ announcements }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance':
        return Wrench;
      case 'interruption':
        return AlertTriangle;
      case 'schedule':
        return Calendar;
      default:
        return Info;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'bg-orange-100 text-orange-700';
      case 'interruption':
        return 'bg-red-100 text-red-700';
      case 'schedule':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Latest Announcements</h2>
          <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View All
          </button>
        </div>
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Announcement</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {announcements.map((announcement) => {
          const Icon = getCategoryIcon(announcement.category);

          return (
            <div
              key={announcement.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${getCategoryColor(announcement.category)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold uppercase ${getCategoryColor(
                        announcement.category
                      )}`}
                    >
                      {announcement.category}
                    </span>
                    <span className="text-xs text-gray-500">{announcement.postedDate}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {announcement.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {announcement.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnnouncementsPanel;

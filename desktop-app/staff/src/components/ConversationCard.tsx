import React from 'react';
import { Conversation } from '../types';

interface ConversationCardProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'billing':
        return 'bg-blue-100 text-blue-700';
      case 'complaint':
        return 'bg-red-100 text-red-700';
      case 'inquiry':
        return 'bg-purple-100 text-purple-700';
      case 'payment':
        return 'bg-green-100 text-green-700';
      case 'technical':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'billing':
        return 'BILLING CONCERN';
      case 'complaint':
        return 'COMPLAINT';
      case 'inquiry':
        return 'INQUIRY';
      case 'payment':
        return 'PAYMENT CONCERN';
      case 'technical':
        return 'TECHNICAL';
      default:
        return category.toUpperCase();
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 cursor-pointer transition-all border-l-4
        ${
          isActive
            ? 'bg-blue-50 border-l-blue-600'
            : 'bg-white border-l-transparent hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-blue-600">
            {conversation.residentInitials}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {conversation.residentName}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {conversation.lastMessageTime}
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {conversation.lastMessage}
          </p>

          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getCategoryColor(
                conversation.category
              )}`}
            >
              {getCategoryLabel(conversation.category)}
            </span>

            {conversation.unreadCount > 0 && (
              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">
                  {conversation.unreadCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationCard;

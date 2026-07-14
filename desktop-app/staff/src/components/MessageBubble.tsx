import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  senderInitials?: string;
  showAvatar?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  senderInitials,
  showAvatar = false,
}) => {
  const isStaff = message.senderType === 'staff';

  if (isStaff) {
    // Staff message - right aligned, blue background
    return (
      <div className="flex justify-end mb-4">
        <div className="flex flex-col items-end max-w-[70%]">
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm leading-relaxed">{message.text}</p>
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Attachment"
                className="mt-2 rounded-lg max-w-full"
              />
            )}
            {message.attachmentUrl && (
              <div className="mt-2 p-2 bg-blue-700 rounded-lg flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                <span className="text-xs">{message.attachmentName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <span className="text-xs text-gray-500">{message.timestamp}</span>
            {message.read && (
              <span className="text-xs text-blue-600 font-medium">• Read</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Resident message - left aligned, white background
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-3 max-w-[70%]">
        {/* Avatar */}
        {showAvatar && (
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-600">
              {senderInitials}
            </span>
          </div>
        )}

        <div className="flex flex-col">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm leading-relaxed text-gray-900">{message.text}</p>
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Attachment"
                className="mt-2 rounded-lg max-w-full"
              />
            )}
            {message.attachmentUrl && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                <span className="text-xs text-gray-700">{message.attachmentName}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 mt-1 ml-2">{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

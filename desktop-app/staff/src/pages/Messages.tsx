import React, { useState } from 'react';
import {
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Send,
  User,
  Tag,
} from 'lucide-react';
import { mockConversations } from '../data/mockMessages';
import ConversationCard from '../components/ConversationCard';
import MessageBubble from '../components/MessageBubble';
import { Conversation } from '../types';

const Messages: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    mockConversations[0]
  );
  const [messageInput, setMessageInput] = useState('');

  const quickReplies = [
    'Technical check scheduled',
    'Payment confirmed',
    'Verification needed',
  ];

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesSearch = conv.residentName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || conv.unreadCount > 0;
    return matchesSearch && matchesTab;
  });

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // In a real app, this would send the message
      console.log('Sending message:', messageInput);
      setMessageInput('');
    }
  };

  const handleQuickReply = (reply: string) => {
    setMessageInput(reply);
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-gray-50">
      {/* Left - Conversation List Panel */}
      <div className="w-[350px] bg-white border-r border-gray-200 flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search residents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'unread'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              isActive={selectedConversation?.id === conversation.id}
              onClick={() => setSelectedConversation(conversation)}
            />
          ))}
        </div>
      </div>

      {/* Right - Chat Panel */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Resident Avatar */}
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">
                    {selectedConversation.residentInitials}
                  </span>
                </div>

                {/* Resident Info */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedConversation.residentName}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {selectedConversation.accountNo}
                    </span>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          selectedConversation.status === 'online'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}
                      ></div>
                      <span className="text-sm text-gray-600 capitalize">
                        {selectedConversation.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">View Profile</span>
                </button>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Date Divider */}
          <div className="flex items-center justify-center py-4">
            <span className="px-4 py-1 bg-gray-200 text-xs text-gray-600 rounded-full">
              OCTOBER 24, 2023
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedConversation.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                senderInitials={selectedConversation.residentInitials}
                showAvatar={message.senderType === 'resident'}
              />
            ))}
          </div>

          {/* Quick Replies */}
          <div className="px-6 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xs text-gray-600 uppercase font-medium flex items-center space-x-1">
                <span>Quick Reply:</span>
              </span>
              <div className="flex items-center space-x-2 flex-wrap">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
                <button className="p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center space-x-1">
                  <Tag className="w-3 h-3" />
                  <span className="text-xs font-medium">Assign Tag</span>
                </button>
              </div>
            </div>

            {/* Message Composer */}
            <div className="flex items-center space-x-3">
              {/* Attachment Buttons */}
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No conversation selected
            </h3>
            <p className="text-sm text-gray-600">
              Select a conversation from the list to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;

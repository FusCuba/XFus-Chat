import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ChatList = ({ chats, selectedChat, onSelectChat, t }) => {
  if (!chats || chats.length === 0) {
    return (
      <div className="chat-list-empty">
        <p>{t('noChats')}</p>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return t('now');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('minAgo')}`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  return (
    <div className="chat-list">
      {chats.map((chat) => (
        <div
          key={chat.friend.id}
          className={`chat-item ${selectedChat?.friend.id === chat.friend.id ? 'active' : ''}`}
          onClick={() => onSelectChat(chat)}
        >
          <div className="chat-avatar">
            {chat.friend.displayName?.charAt(0).toUpperCase() || chat.friend.username?.charAt(0).toUpperCase() || '?'}
            {chat.friend.online && <span className="online-indicator"></span>}
          </div>
          <div className="chat-info">
            <div className="chat-header">
              <h3 className="chat-name">{chat.friend.displayName || chat.friend.username}</h3>
              <span className="chat-time">{formatTime(chat.lastMessage?.timestamp)}</span>
            </div>
            <div className="chat-preview">
              <p className="chat-last-message">
                {chat.lastMessage?.senderId === chat.friend.id && '📩 '}
                {chat.lastMessage?.text || t('noMessages')}
              </p>
              {chat.unreadCount > 0 && (
                <span className="unread-badge">{chat.unreadCount}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;

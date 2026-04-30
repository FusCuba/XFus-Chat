import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../hooks/useLanguage';
import ChatWindow from './ChatWindow';
import ChatList from './ChatList';
import UserSearch from './UserSearch';
import Header from './Header';
import './Chat.css';

const Chat = () => {
  const { t } = useTranslation();
  const { user, socket, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();
  
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  // Load chat list
  useEffect(() => {
    loadChatList();

    if (socket) {
      socket.on('new_message', handleNewMessage);
      socket.on('chat_list_update', loadChatList);
      socket.on('message_deleted', handleMessageDeleted);
      socket.on('messages_read', handleMessagesRead);
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('chat_list_update', loadChatList);
        socket.off('message_deleted', handleMessageDeleted);
        socket.off('messages_read', handleMessagesRead);
        socket.off('user_online', handleUserOnline);
        socket.off('user_offline', handleUserOffline);
      };
    }
  }, [socket]);

  const loadChatList = async () => {
    try {
      const response = await fetch('/api/messages/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatList(data);
      }
    } catch (error) {
      console.error('Failed to load chat list:', error);
    }
  };

  const handleNewMessage = (message) => {
    setChatList(prev => {
      const existingChatIndex = prev.findIndex(
        chat => chat.friend.id === message.sender._id || 
                chat.friend.id === message.receiver
      );

      if (existingChatIndex >= 0) {
        const updated = [...prev];
        updated[existingChatIndex] = {
          ...updated[existingChatIndex],
          lastMessage: {
            text: message.text,
            timestamp: message.timestamp,
            read: message.read,
            senderId: message.sender._id
          },
          unreadCount: message.receiver === user.id && !message.read 
            ? updated[existingChatIndex].unreadCount + 1 
            : updated[existingChatIndex].unreadCount
        };
        // Move to top
        const chat = updated.splice(existingChatIndex, 1)[0];
        updated.unshift(chat);
        return updated;
      } else {
        return prev;
      }
    });
  };

  const handleMessageDeleted = ({ messageId }) => {
    setChatList(prev => prev.map(chat => {
      if (chat.lastMessage?._id === messageId) {
        return {
          ...chat,
          lastMessage: null
        };
      }
      return chat;
    }));
  };

  const handleMessagesRead = ({ senderId, receiverId }) => {
    setChatList(prev => prev.map(chat => {
      if (chat.friend.id === senderId) {
        return {
          ...chat,
          unreadCount: 0
        };
      }
      return chat;
    }));
  };

  const handleUserOnline = ({ userId }) => {
    setChatList(prev => prev.map(chat => {
      if (chat.friend.id === userId) {
        return {
          ...chat,
          friend: { ...chat.friend, online: true }
        };
      }
      return chat;
    }));
  };

  const handleUserOffline = ({ userId, lastSeen }) => {
    setChatList(prev => prev.map(chat => {
      if (chat.friend.id === userId) {
        return {
          ...chat,
          friend: { ...chat.friend, online: false, lastSeen }
        };
      }
      return chat;
    }));
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setShowSearch(false);
  };

  const handleAddFriend = (friendId) => {
    loadChatList();
  };

  return (
    <div className="chat-container">
      <Header
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        currentLanguage={currentLanguage}
        changeLanguage={changeLanguage}
        logout={logout}
        t={t}
      />

      <div className="chat-main">
        <div className={`chat-sidebar ${showSearch ? 'show-search' : ''}`}>
          <div className="sidebar-header">
            <h2>{t('chats')}</h2>
            <button 
              className="search-btn"
              onClick={() => setShowSearch(!showSearch)}
            >
              🔍
            </button>
          </div>

          {showSearch && (
            <UserSearch 
              onAddFriend={handleAddFriend}
              onClose={() => setShowSearch(false)}
              t={t}
            />
          )}

          <ChatList
            chats={chatList}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            t={t}
          />
        </div>

        <div className="chat-content">
          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              socket={socket}
              userId={user.id}
              onBack={() => setSelectedChat(null)}
              t={t}
            />
          ) : (
            <div className="no-chat-selected">
              <div className="no-chat-icon">💬</div>
              <p>{t('selectChat')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;

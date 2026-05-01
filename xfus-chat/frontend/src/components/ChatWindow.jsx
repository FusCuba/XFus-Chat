import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './ChatWindow.css';

const ChatWindow = ({ chat, socket, userId, onBack, t }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [deleteModal, setDeleteModal] = useState({ show: false, messageId: null });
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    loadMessages();
    if (socket) {
      socket.on(`messages_${chat.friend.id}`, handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);
      return () => {
        socket.off(`messages_${chat.friend.id}`, handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [chat, socket]);

  useEffect(() => {
    scrollToBottom();
    if (messagesContainerRef.current && socket) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const messageId = entry.target.dataset.messageId;
              const message = messages.find((m) => m._id === messageId);
              if (message && !message.read && message.sender !== userId) {
                socket.emit('mark_read', { messageId, senderId: chat.friend.id });
              }
            }
          });
        },
        { threshold: 0.5 }
      );
      document.querySelectorAll('.message-item').forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${chat.friend.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        setTimeout(() => {
          const unreadIds = data.filter((m) => !m.read && m.sender !== userId).map((m) => m._id);
          if (unreadIds.length > 0 && socket) {
            socket.emit('mark_read_bulk', { senderId: chat.friend.id, messageIds: unreadIds });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleNewMessage = (message) => {
    setMessages((prev) => [...prev, { ...message, read: false }]);
  };

  const handleMessageDeleted = ({ messageId, deletedForEveryone }) => {
    if (deletedForEveryone) {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } else {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, hiddenForMe: true } : m))
      );
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    const messageData = { receiverId: chat.friend.id, text: newMessage.trim() };
    socket.emit('send_message', messageData);
    setNewMessage('');
    setTimeout(scrollToBottom, 50);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteClick = (messageId, e) => {
    e.stopPropagation();
    setDeleteModal({ show: true, messageId });
  };

  const handleDelete = async (deleteType) => {
    if (!deleteModal.messageId || !socket) return;
    try {
      const response = await fetch(`/api/messages/${deleteModal.messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deleteType }),
      });
      if (response.ok) {
        if (deleteType === 'everyone') {
          socket.emit('message_deleted_for_all', {
            messageId: deleteModal.messageId,
            receiverId: chat.friend.id,
          });
        }
        setMessages((prev) => prev.filter((m) => m._id !== deleteModal.messageId));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
    setDeleteModal({ show: false, messageId: null });
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderStatus = (message) => {
    if (message.deletedForEveryone) return <span className="message-deleted">{t('messageDeleted')}</span>;
    if (message.hiddenForMe || message.sender !== userId) return null;
    if (message.read) return <span className="message-status read">✓✓</span>;
    if (message.delivered) return <span className="message-status delivered">✓✓</span>;
    return <span className="message-status sent">✓</span>;
  };

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="chat-window-info">
          <h3>{chat.friend.displayName || chat.friend.username}</h3>
          {chat.friend.online ? (
            <span className="online-status">{t('online')}</span>
          ) : (
            <span className="offline-status">
              {t('lastSeen')} {formatTime(chat.friend.lastSeen)}
            </span>
          )}
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {messages.filter((m) => !m.hiddenForMe).map((message) => (
          <div
            key={message._id}
            data-message-id={message._id}
            className={`message-item ${message.sender === userId ? 'own' : ''} ${
              message.deletedForEveryone ? 'deleted' : ''
            }`}
          >
            {!message.deletedForEveryone && !message.hiddenForMe && (
              <button className="delete-btn" onClick={(e) => handleDeleteClick(message._id, e)}>
                🗑️
              </button>
            )}
            <div className="message-bubble">
              <p>{message.text}</p>
              <div className="message-meta">
                <span className="message-time">{formatTime(message.timestamp)}</span>
                {renderStatus(message)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('typeMessage')}
          className="message-input"
        />
        <button type="submit" className="send-btn">➤</button>
      </form>

      {deleteModal.show && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, messageId: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('deleteMessage')}</h3>
            <div className="modal-buttons">
              <button onClick={() => handleDelete('me')}>{t('deleteForMe')}</button>
              <button onClick={() => handleDelete('everyone')} className="danger">
                {t('deleteForEveryone')}
              </button>
              <button onClick={() => setDeleteModal({ show: false, messageId: null })}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;

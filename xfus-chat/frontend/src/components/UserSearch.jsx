import { useState } from 'react';
import './UserSearch.css';

const UserSearch = ({ onAddFriend, onClose, t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        const err = await response.json();
        setError(err.message || t('searchFailed'));
      }
    } catch (err) {
      setError(t('searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId: userId })
      });

      if (response.ok) {
        onAddFriend(userId);
        setSearchResults(prev => prev.filter(u => u._id !== userId));
      } else {
        const err = await response.json();
        setError(err.message || t('addFriendFailed'));
      }
    } catch (err) {
      setError(t('addFriendFailed'));
    }
  };

  return (
    <div className="user-search">
      <div className="search-header">
        <h3>{t('searchUsers')}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="search-input-wrapper">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('searchByUsernameOrEmail')}
          className="search-input"
        />
        <button onClick={handleSearch} disabled={loading} className="search-action-btn">
          {loading ? '...' : '🔍'}
        </button>
      </div>

      {error && <div className="search-error">{error}</div>}

      <div className="search-results">
        {searchResults.map((user) => (
          <div key={user._id} className="search-result-item">
            <div className="result-avatar">
              {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="result-info">
              <h4>{user.displayName || user.username}</h4>
              <p>@{user.username}</p>
            </div>
            <button 
              onClick={() => handleAddFriend(user._id)}
              className="add-friend-btn"
            >
              {t('addFriend')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserSearch;

const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Search users by username or email
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { displayName: { $regex: query, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.userId } } // Exclude current user
      ]
    })
    .select('username displayName avatar online lastSeen')
    .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

// Add friend (instant acceptance)
router.post('/friends/add/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    if (targetUserId === req.userId) {
      return res.status(400).json({ message: 'Cannot add yourself as a friend' });
    }

    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already friends
    if (currentUser.friends.includes(targetUserId)) {
      return res.status(400).json({ message: 'Already in your friends list' });
    }

    // Add to friends
    currentUser.friends.push(targetUserId);
    
    // Add current user to target's addedMe list
    if (!targetUser.addedMe.includes(req.userId)) {
      targetUser.addedMe.push(req.userId);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ message: 'Server error while adding friend' });
  }
});

// Remove friend
router.delete('/friends/remove/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from friends
    currentUser.friends = currentUser.friends.filter(
      id => id.toString() !== targetUserId
    );

    // Remove from addedMe
    targetUser.addedMe = targetUser.addedMe.filter(
      id => id.toString() !== req.userId
    );

    // Also remove reverse relationships
    currentUser.addedMe = currentUser.addedMe.filter(
      id => id.toString() !== targetUserId
    );
    targetUser.friends = targetUser.friends.filter(
      id => id.toString() !== req.userId
    );

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error while removing friend' });
  }
});

// Get mutual friends (users you can chat with)
router.get('/friends/mutual', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username displayName avatar online lastSeen');

    // Filter to only mutual friends (they also added you)
    const mutualFriends = user.friends.filter(friend => 
      user.addedMe.some(id => id.toString() === friend._id.toString())
    );

    res.json(mutualFriends);
  } catch (error) {
    console.error('Get mutual friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all friends (including non-mutual)
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username displayName avatar online lastSeen');

    res.json(user.friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('username email phone displayName avatar');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update current user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { displayName, avatar } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only allow updating displayName and avatar
    if (displayName !== undefined) {
      user.displayName = displayName.trim();
    }
    
    if (avatar !== undefined) {
      user.avatar = avatar;
    }
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        username: user.username,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

module.exports = router;

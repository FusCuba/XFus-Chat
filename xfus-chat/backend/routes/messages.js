const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get messages with a specific user
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.userId;

    // Verify mutual friendship
    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser.friends.some(id => id.toString() === otherUserId)) {
      return res.status(403).json({ message: 'Not friends with this user' });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser.addedMe.some(id => id.toString() === currentUserId)) {
      return res.status(403).json({ message: 'Friendship is not mutual' });
    }

    // Get messages (not deleted for current user and not deleted for everyone)
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ],
      deletedForEveryone: false,
      deletedFor: { $ne: currentUserId }
    })
    .sort({ timestamp: 1 })
    .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat list with last message preview
router.get('/list', auth, async (req, res) => {
  try {
    const currentUserId = req.userId;

    // Get mutual friends
    const user = await User.findById(currentUserId)
      .populate('friends', 'username displayName avatar online lastSeen');

    const mutualFriends = user.friends.filter(friend =>
      user.addedMe.some(id => id.toString() === friend._id.toString())
    );

    // Get last message for each mutual friend
    const chatList = await Promise.all(
      mutualFriends.map(async (friend) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: currentUserId, receiver: friend._id },
            { sender: friend._id, receiver: currentUserId }
          ],
          deletedForEveryone: false,
          deletedFor: { $ne: currentUserId }
        })
        .sort({ timestamp: -1 })
        .select('text timestamp read sender');

        // Count unread messages
        const unreadCount = await Message.countDocuments({
          sender: friend._id,
          receiver: currentUserId,
          read: false,
          deletedForEveryone: false,
          deletedFor: { $ne: currentUserId }
        });

        return {
          friend: {
            id: friend._id,
            username: friend.username,
            displayName: friend.displayName,
            avatar: friend.avatar,
            online: friend.online
          },
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            timestamp: lastMessage.timestamp,
            read: lastMessage.read,
            senderId: lastMessage.sender.toString()
          } : null,
          unreadCount
        };
      })
    );

    // Sort by last message timestamp
    chatList.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
    });

    res.json(chatList);
  } catch (error) {
    console.error('Get chat list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete message for me
router.delete('/:messageId/delete-for-me', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is sender or receiver
    if (message.sender.toString() !== req.userId && 
        message.receiver.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Add to deletedFor if not already there
    if (!message.deletedFor.some(id => id.toString() === req.userId)) {
      message.deletedFor.push(req.userId);
      await message.save();
    }

    res.json({ message: 'Message deleted for you' });
  } catch (error) {
    console.error('Delete for me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete message for everyone (only sender can do this)
router.delete('/:messageId/delete-for-everyone', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete for everyone
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only sender can delete for everyone' });
    }

    message.deletedForEveryone = true;
    await message.save();

    res.json({ message: 'Message deleted for everyone' });
  } catch (error) {
    console.error('Delete for everyone error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

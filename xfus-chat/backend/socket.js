const Message = require('./models/Message');
const User = require('./models/User');

// Store online users and their socket IDs
const onlineUsers = new Map(); // userId -> Set of socketIds

function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate socket connection
    socket.on('authenticate', async (data) => {
      try {
        const { userId } = data;
        
        if (!userId) {
          return socket.emit('auth_error', { message: 'User ID required' });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
          return socket.emit('auth_error', { message: 'User not found' });
        }

        // Store user's socket ID
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Update user online status
        await User.findByIdAndUpdate(userId, { 
          online: true,
          lastSeen: new Date()
        });

        socket.userId = userId;
        socket.join(`user:${userId}`);

        // Broadcast online status to friends
        const friends = await User.find({
          $or: [
            { _id: { $in: user.friends } },
            { _id: { $in: user.addedMe } }
          ]
        }).select('_id username displayName online');

        friends.forEach(friend => {
          const isMutual = user.friends.some(id => id.toString() === friend._id.toString()) &&
                          user.addedMe.some(id => id.toString() === friend._id.toString());
          if (isMutual) {
            socket.to(`user:${friend._id}`).emit('user_online', {
              userId: user._id,
              online: true
            });
          }
        });

        socket.emit('auth_success', { userId });
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
      } catch (error) {
        console.error('Socket auth error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { senderId, receiverId, text } = data;

        if (!senderId || !receiverId || !text) {
          return socket.emit('message_error', { message: 'Invalid message data' });
        }

        // Verify mutual friendship
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
          return socket.emit('message_error', { message: 'User not found' });
        }

        const isMutual = sender.friends.some(id => id.toString() === receiverId) &&
                        receiver.addedMe.some(id => id.toString() === senderId);

        if (!isMutual) {
          return socket.emit('message_error', { message: 'Cannot send message - not mutual friends' });
        }

        // Create message
        const message = new Message({
          sender: senderId,
          receiver: receiverId,
          text
        });

        await message.save();

        // Populate sender info
        await message.populate('sender', 'username displayName avatar');

        // Send to receiver
        io.to(`user:${receiverId}`).emit('new_message', {
          _id: message._id,
          sender: message.sender,
          receiver: receiverId,
          text: message.text,
          timestamp: message.timestamp,
          read: false,
          delivered: false
        });

        // Confirm to sender with delivered status
        socket.emit('message_sent', {
          _id: message._id,
          messageId: message._id.toString(),
          delivered: true
        });

        // Update chat list for both users
        io.to(`user:${senderId}`).emit('chat_list_update');
        io.to(`user:${receiverId}`).emit('chat_list_update');

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as delivered
    socket.on('message_delivered', async (data) => {
      try {
        const { messageId, receiverId } = data;

        await Message.findByIdAndUpdate(messageId, { delivered: true });

        // Notify sender
        io.to(`user:${receiverId}`).emit('message_status_update', {
          messageId,
          delivered: true,
          read: false
        });
      } catch (error) {
        console.error('Message delivered error:', error);
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      try {
        const { senderId, receiverId } = data;

        // Mark all messages from sender to receiver as read
        await Message.updateMany(
          {
            sender: senderId,
            receiver: receiverId,
            read: false
          },
          { read: true }
        );

        // Notify sender
        io.to(`user:${senderId}`).emit('messages_read', {
          senderId,
          receiverId
        });

        // Update chat list
        io.to(`user:${receiverId}`).emit('chat_list_update');
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { senderId, receiverId, isTyping } = data;
      socket.to(`user:${receiverId}`).emit('user_typing', {
        senderId,
        isTyping
      });
    });

    // Delete message for everyone
    socket.on('delete_for_everyone', async (data) => {
      try {
        const { messageId, senderId, receiverId } = data;

        const message = await Message.findById(messageId);
        if (!message || message.sender.toString() !== senderId) {
          return socket.emit('delete_error', { message: 'Cannot delete this message' });
        }

        message.deletedForEveryone = true;
        await message.save();

        // Notify both users
        io.to(`user:${senderId}`).emit('message_deleted', {
          messageId,
          deletedForEveryone: true
        });
        io.to(`user:${receiverId}`).emit('message_deleted', {
          messageId,
          deletedForEveryone: true
        });

        // Update chat lists
        io.to(`user:${senderId}`).emit('chat_list_update');
        io.to(`user:${receiverId}`).emit('chat_list_update');
      } catch (error) {
        console.error('Delete for everyone error:', error);
        socket.emit('delete_error', { message: 'Failed to delete message' });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        const userSockets = onlineUsers.get(socket.userId);
        if (userSockets) {
          userSockets.delete(socket.id);

          // If no more sockets for this user, set offline
          if (userSockets.size === 0) {
            onlineUsers.delete(socket.userId);

            await User.findByIdAndUpdate(socket.userId, {
              online: false,
              lastSeen: new Date()
            });

            // Broadcast offline status to friends
            const user = await User.findById(socket.userId);
            if (user) {
              const friends = await User.find({
                $or: [
                  { _id: { $in: user.friends } },
                  { _id: { $in: user.addedMe } }
                ]
              }).select('_id');

              friends.forEach(friend => {
                const isMutual = user.friends.some(id => id.toString() === friend._id.toString()) &&
                                user.addedMe.some(id => id.toString() === friend._id.toString());
                if (isMutual) {
                  io.to(`user:${friend._id}`).emit('user_offline', {
                    userId: socket.userId,
                    lastSeen: new Date()
                  });
                }
              });
            }
          }
        }
      }
    });
  });

  return io;
}

module.exports = setupSocketIO;

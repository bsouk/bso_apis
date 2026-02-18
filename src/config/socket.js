const jwt = require('jsonwebtoken');
const utils = require('../utils/utils');

let io = null;

const ROOM_PREFIX = 'user:';

/**
 * Initialize Socket.io with auth: client sends { auth: { token } }, we verify JWT and join room user:userId
 * @param {object} ioInstance - Socket.io server instance
 */
function initSocket(ioInstance) {
  io = ioInstance;

  io.on('connection', (socket) => {
    try {
      const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
      if (!token) {
        socket.disconnect(true);
        return;
      }

      let decoded;
      try {
        const raw = typeof utils.decrypt === 'function' ? utils.decrypt(token) : token;
        decoded = jwt.verify(typeof raw === 'string' ? raw : token, process.env.JWT_SECRET);
      } catch (e) {
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e2) {
          throw e;
        }
      }

      const userId = decoded?.data?._id?.toString?.() || decoded?.data?.userId?.toString?.() || decoded?.sub;
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      const room = ROOM_PREFIX + userId;
      socket.join(room);
      socket.userId = userId;
    } catch (err) {
      console.error('[Socket] Auth error:', err.message);
      socket.disconnect(true);
    }
  });

  console.log('✅ Socket.io notification server initialized');
}

/**
 * Emit a new_notification event to a specific user (all their connected sockets).
 * Call this after saving a Notification so the frontend updates in real time.
 * @param {string|object} userId - User _id (ObjectId or string)
 * @param {object} [payload] - Optional payload sent to client (e.g. { notification } or {} to just trigger refresh)
 */
function emitNotificationToUser(userId, payload = {}) {
  if (!io) return;
  const id = userId && typeof userId.toString === 'function' ? userId.toString() : String(userId);
  if (!id) return;
  io.to(ROOM_PREFIX + id).emit('new_notification', payload);
}

module.exports = {
  initSocket,
  emitNotificationToUser,
};

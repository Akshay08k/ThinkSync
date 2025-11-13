import { prisma } from "../config/db.js";
import { getDirectRoomId, getUserRoomId } from "../utils/socketRooms.js";

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  details: {
    select: {
      avatar: true,
      coverImage: true,
      bio: true,
      occupation: true,
      location: true,
      website: true,
    },
  },
};

const ensureConnection = async (userId, otherUserId) => {
  const connection = await prisma.follows.findFirst({
    where: {
      OR: [
        { followerId: userId, followingId: otherUserId },
        { followerId: otherUserId, followingId: userId },
      ],
    },
  });

  return Boolean(connection);
};

const formatUserProfile = (user) => {
  if (!user) return null;
  const avatar = user.details?.avatar || null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    details: user.details ? { ...user.details } : null,
    avatar,
    profileImage: avatar,
  };
};

const buildConversationSummary = async (viewerId, otherUserId) => {
  const [user, lastMessage, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: userSummarySelect,
    }),
    prisma.message.findFirst({
      where: {
        OR: [
          { senderId: viewerId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: viewerId },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.count({
      where: {
        senderId: otherUserId,
        receiverId: viewerId,
        read: false,
      },
    }),
  ]);

  if (!user || !lastMessage) return null;

  return {
    ...formatUserProfile(user),
    lastMessage,
    unreadCount,
  };
};

const emitConversationUpdate = async (io, viewerId, otherUserId) => {
  const conversation = await buildConversationSummary(viewerId, otherUserId);
  if (!conversation) return;

  io.to(getUserRoomId(viewerId)).emit("chat:conversation-updated", {
    conversation,
  });
};

const emitUnreadTotal = async (io, userId) => {
  const count = await prisma.message.count({
    where: { receiverId: userId, read: false },
  });

  io.to(getUserRoomId(userId)).emit("chat:unread-total", { count });
};

const sendMessage = (io) => async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: "Invalid message payload" });
    }

    const canMessage = await ensureConnection(senderId, receiverId);

    if (!canMessage) {
      return res
        .status(403)
        .json({ message: "You can only message your connections." });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: content.trim(),
        read: false,
      },
    });

    const roomId = getDirectRoomId(senderId, receiverId);
    io.to(roomId).emit("chat:message", { message, roomId });

    await Promise.all([
      emitConversationUpdate(io, senderId, receiverId),
      emitConversationUpdate(io, receiverId, senderId),
      emitUnreadTotal(io, receiverId),
    ]);

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

const getMessages = (io) => async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    const canView = await ensureConnection(userId, otherUserId);

    if (!canView) {
      return res
        .status(403)
        .json({ message: "You can only view messages with your connections." });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    const updateResult = await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      data: { read: true },
    });

    if (updateResult.count > 0) {
      await Promise.all([
        emitConversationUpdate(io, userId, otherUserId),
        emitConversationUpdate(io, otherUserId, userId),
        emitUnreadTotal(io, userId),
      ]);
    }

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

const getRecentChats = (io) => async (req, res) => {
  try {
    const userId = req.user.id;

    const participants = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      select: { senderId: true, receiverId: true },
      orderBy: { createdAt: "desc" },
    });

    const uniquePartnerIds = [];
    const seen = new Set();

    participants.forEach((entry) => {
      const partnerId =
        entry.senderId === userId ? entry.receiverId : entry.senderId;
      if (!seen.has(partnerId)) {
        seen.add(partnerId);
        uniquePartnerIds.push(partnerId);
      }
    });

    const conversations = await Promise.all(
      uniquePartnerIds.map((partnerId) =>
        buildConversationSummary(userId, partnerId)
      )
    );

    const filtered = conversations
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
      );

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch recent chats" });
  }
};

const getUnreadCount = (io) => async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await prisma.message.count({
      where: { receiverId: userId, read: false },
    });
    res.json({ unreadCount: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

const markMessagesRead = (io) => async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    const canUpdate = await ensureConnection(userId, otherUserId);

    if (!canUpdate) {
      return res
        .status(403)
        .json({ message: "You can only update messages for connections." });
    }

    const result = await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      data: { read: true },
    });

    if (result.count > 0) {
      await Promise.all([
        emitConversationUpdate(io, userId, otherUserId),
        emitConversationUpdate(io, otherUserId, userId),
        emitUnreadTotal(io, userId),
      ]);

      const roomId = getDirectRoomId(userId, otherUserId);
      io.to(roomId).emit("chat:messages-read", {
        readerId: userId,
        otherUserId,
      });
    }

    res.json({ message: "Messages marked as read", rowsUpdated: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
};

export {
  sendMessage,
  getMessages,
  getRecentChats,
  getUnreadCount,
  markMessagesRead,
};

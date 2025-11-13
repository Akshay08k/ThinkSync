import express from "express";
import {
  sendMessage,
  getMessages,
  getRecentChats,
  getUnreadCount,
  markMessagesRead,
} from "../controllers/message.controller.js";
import { ensureAuth } from "../middleware/ensureAuth.middleware.js";

const messageRoutes = (io) => {
  const router = express.Router();

  router.post("/send", ensureAuth, sendMessage(io));

  router.get("/recent", ensureAuth, getRecentChats(io));
  router.get("/unread-count", ensureAuth, getUnreadCount(io));
  router.post("/:userId/mark-read", ensureAuth, markMessagesRead(io));
  router.get("/:userId", ensureAuth, getMessages(io));

  return router;
};

export default messageRoutes;

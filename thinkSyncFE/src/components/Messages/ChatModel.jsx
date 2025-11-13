import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import api from "../../utils/axios";
import { useAuth } from "../../contexts/AuthContext";
import { log } from "../../utils/Logger.js";
import { IoArrowBack, IoSend } from "react-icons/io5";
import { useSocket } from "../../contexts/SocketContext";

export default function ChatModal({ user, goBack, onMarkRead }) {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const roomId = useMemo(
    () => [user.id, currentUser.id].sort().join("_"),
    [user.id, currentUser.id]
  );

  const markConversationRead = useCallback(async () => {
    try {
      const response = await api.post(
        `/messages/${user.id}/mark-read`,
        {},
        { withCredentials: true }
      );
      if (response.data?.rowsUpdated > 0) {
        onMarkRead(user.id);
      }
    } catch (err) {
      console.error("❌ Failed to mark messages as read:", err);
    }
  }, [user.id, onMarkRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return undefined;

    log("✅ Socket ready (Chat):", socket.id);
    socket.emit("joinRoom", roomId);

    const handleIncomingMessage = ({ message, roomId: incomingRoom }) => {
      if (!message || incomingRoom !== roomId) return;
      log("💬 Message received:", message);
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
      if (message.senderId === user.id) {
        onMarkRead(user.id);
        markConversationRead();
      }
    };

    const handleMessagesRead = ({ readerId, otherUserId }) => {
      if (!readerId || !otherUserId) return;
      const isConversationEvent =
        (readerId === currentUser.id && otherUserId === user.id) ||
        (readerId === user.id && otherUserId === currentUser.id);
      if (!isConversationEvent) return;

      if (readerId !== currentUser.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUser.id ? { ...msg, read: true } : msg
          )
        );
      }
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:messages-read", handleMessagesRead);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:messages-read", handleMessagesRead);
      socket.emit("leaveRoom", roomId);
    };
  }, [socket, roomId, user.id, currentUser.id, onMarkRead, markConversationRead]);

  // Fetch messages on load
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id) return;
      try {
        const res = await api.get(`/messages/${user.id}`, {
          withCredentials: true,
        });
        setMessages(res.data);

        // Mark locally as read
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === user.id ? { ...msg, read: true } : msg
          )
        );

        // Mark read in backend
        await markConversationRead();
      } catch (err) {
        console.error("❌ Failed to fetch messages:", err);
      }
    };
    fetchMessages();
  }, [user?.id, markConversationRead]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;

    try {
      const res = await api.post(
        "/messages/send",
        { receiverId: user.id, content: input },
        { withCredentials: true }
      );
      setMessages((prev) =>
        prev.some((m) => m.id === res.data.id)
          ? prev
          : [...prev, res.data]
      );
      setInput("");
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  }, [input, user.id]);

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] h-full w-full sm:rounded-2xl shadow-2xl flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 z-[10000]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <IoArrowBack size={20} />
          </button>
          <h4 className="font-bold text-lg">{user.username}</h4>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl ${
                  isMine
                    ? "bg-blue-500 dark:bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-none"
                }`}
              >
                <p className="text-sm font-medium break-words">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    isMine
                      ? "text-blue-100"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-b-2xl">
        <textarea
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          className="flex-1 px-4 py-2 rounded-full text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="p-2.5 rounded-full bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white disabled:opacity-50 transition transform hover:scale-110"
        >
          <IoSend size={18} />
        </button>
      </div>
    </div>
  );
}



import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { IoChatbubbles, IoClose } from "react-icons/io5";
import ChatModal from "./ChatModel";
import api from "../../utils/axios";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";

const FALLBACK_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-pink-500",
];

const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("data:") || /^https?:\/\//i.test(url)) {
    return url;
  }
  const base =
    import.meta.env.VITE_ASSET_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    api.defaults.baseURL ||
    "";
  if (!base) return url;
  const normalizedBase = base.endsWith("/")
    ? base.slice(0, -1)
    : base;
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${normalizedBase}${normalizedPath}`;
};

const sortConversations = (list) => {
  return [...list].sort((a, b) => {
    if (a.lastMessage && b.lastMessage) {
      return (
        new Date(b.lastMessage.createdAt) -
        new Date(a.lastMessage.createdAt)
      );
    }
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
};

function AvatarBubble({ displayName, username, avatar, index }) {
  const [hasError, setHasError] = useState(false);
  const fallbackInitial = useMemo(() => {
    const source = displayName || username || "?";
    return source.trim().charAt(0).toUpperCase() || "?";
  }, [displayName, username]);

  const resolvedAvatar = useMemo(
    () => (avatar && !hasError ? resolveImageUrl(avatar) : null),
    [avatar, hasError]
  );

  if (!resolvedAvatar) {
    const color =
      FALLBACK_COLORS[index % FALLBACK_COLORS.length] || FALLBACK_COLORS[0];
    return (
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${color}`}
        aria-hidden="true"
      >
        {fallbackInitial}
      </div>
    );
  }

  return (
    <img
      src={resolvedAvatar}
      alt={`${displayName || username || "User"} avatar`}
      onError={() => setHasError(true)}
      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
      loading="lazy"
    />
  );
}

export default function FloatingChatButton() {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const normalizeConversation = useCallback((raw) => {
    if (!raw) return null;
    return {
      id: raw.id,
      username: raw.username,
      displayName: raw.displayName || raw.username || "Unknown user",
      avatar:
        raw.profileImage ||
        raw.avatar ||
        raw?.details?.avatar ||
        null,
      profileImage:
        raw.profileImage ||
        raw.avatar ||
        raw?.details?.avatar ||
        null,
      details: raw.details || null,
      lastMessage: raw.lastMessage ? { ...raw.lastMessage } : null,
      unreadCount:
        typeof raw.unreadCount === "number" ? raw.unreadCount : 0,
    };
  }, []);

  useEffect(() => setMounted(true), []);

  const fetchUsers = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [recentRes, followRes, unreadRes] = await Promise.all([
        api.get("/messages/recent", { withCredentials: true }),
        api.get("/follower/following", { withCredentials: true }),
        api.get("/messages/unread-count", { withCredentials: true }),
      ]);

      const recentUsers = Array.isArray(recentRes.data)
        ? recentRes.data
            .map(normalizeConversation)
            .filter(Boolean)
        : [];

      const existingIds = new Set(recentUsers.map((u) => u.id));

      const followingUsers = Array.isArray(followRes.data?.data)
        ? followRes.data.data
            .filter(
              (u) => u.id && u.id !== currentUser.id && !existingIds.has(u.id)
            )
            .map((u) =>
              normalizeConversation({
                ...u,
                lastMessage: null,
                unreadCount: 0,
              })
            )
            .filter(Boolean)
        : [];

      const combined = sortConversations([
        ...recentUsers,
        ...followingUsers,
      ]);

      setUsers(combined);

      const unreadCount =
        unreadRes.data?.unreadCount ?? unreadRes.data ?? 0;
      setUnreadTotal(unreadCount);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, normalizeConversation]);

  useEffect(() => {
    fetchUsers();

    // Expose global function to open chat from anywhere
    window.handleOpenChat = (user) => {
      const normalized = normalizeConversation(user) || user;
      setSelectedUser(normalized);
      setIsOpen(true);
    };

    return () => {
      delete window.handleOpenChat;
    };
  }, [fetchUsers, normalizeConversation]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleConversationUpdate = ({ conversation }) => {
      const normalized = normalizeConversation(conversation);
      if (!normalized) return;
      setUsers((prev) => {
        let exists = false;
        const updated = prev.map((u) => {
          if (u.id === normalized.id) {
            exists = true;
            return {
              ...u,
              ...normalized,
              lastMessage: normalized.lastMessage || u.lastMessage,
            };
          }
          return u;
        });

        const result = exists
          ? updated
          : [...updated, normalized];

        return sortConversations(result);
      });
    };

    const handleUnreadTotal = ({ count }) => {
      setUnreadTotal(
        typeof count === "number" && count >= 0 ? count : 0
      );
    };

    socket.on("chat:conversation-updated", handleConversationUpdate);
    socket.on("chat:unread-total", handleUnreadTotal);

    return () => {
      socket.off("chat:conversation-updated", handleConversationUpdate);
      socket.off("chat:unread-total", handleUnreadTotal);
    };
  }, [socket, normalizeConversation]);

  // Memoized mark read callback
  const handleMarkRead = useCallback((userId) => {
    setUsers((prev) => {
      let decrement = 0;
      const updated = prev.map((u) => {
        if (u.id === userId) {
          decrement = u.unreadCount || 0;
          return {
            ...u,
            unreadCount: 0,
            lastMessage: u.lastMessage
              ? { ...u.lastMessage, read: true }
              : u.lastMessage,
          };
        }
        return u;
      });

      if (decrement) {
        setUnreadTotal((prevTotal) =>
          Math.max(prevTotal - decrement, 0)
        );
      }

      return sortConversations(updated);
    });
  }, []);

  if (!mounted) return null;
  const portalRoot = document.getElementById("floating-chat-root");
  if (!portalRoot) return null;

  return createPortal(
    <>
      {/* Floating button */}
      {!isOpen && (
        <div className="fixed bottom-28 sm:bottom-6 right-4 sm:right-6 z-[100]">
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-blue-600 hover:scale-110 active:scale-95 transition relative"
          >
            <IoChatbubbles size={24} />
            {unreadTotal > 0 && (
              <span className="absolute -top-2 -right-1 min-w-[22px] h-6 px-2 rounded-full bg-green-500 text-xs font-semibold flex items-center justify-center shadow-lg">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat list modal */}
      {isOpen && !selectedUser && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-96 sm:max-h-[500px] h-full w-full sm:rounded-2xl shadow-2xl flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 z-[10001]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-2xl">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <IoChatbubbles size={22} className="text-blue-500" />
              Messages
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            >
              <IoClose size={20} />
            </button>
          </div>

          {/* Users list */}
          <div className="overflow-y-auto flex-1 bg-white dark:bg-slate-900">
            {users.length > 0 ? (
              users.map((user, idx) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    idx === users.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <AvatarBubble
                    displayName={user.displayName}
                    username={user.username}
                    avatar={user.profileImage}
                    index={idx}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{user.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user.lastMessage?.content || "Start a new chat"}
                    </p>
                  </div>
                  {user.unreadCount > 0 && (
                    <div className="min-w-[20px] h-5 px-1 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white">
                      {user.unreadCount}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                {loading ? "Loading conversations..." : "No users available"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat modal */}
      {selectedUser && (
        <ChatModal
          user={selectedUser}
          goBack={() => setSelectedUser(null)}
          onMarkRead={handleMarkRead}
        />
      )}
    </>,
    portalRoot
  );
}

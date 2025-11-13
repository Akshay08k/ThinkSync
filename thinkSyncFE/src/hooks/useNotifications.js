import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/axios";
import { log } from "../utils/Logger.js";
import { useSocket } from "../contexts/SocketContext";

export function useNotifications() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications once or on demand
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.data || []);
    } catch (e) {
      console.error(
        "Error fetching notifications:",
        e.response?.data || e.message
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !socket) return undefined;

    const handleNewNotification = (notif) => {
      log("🔔 New notification:", notif);
      setNotifications((prev) => [notif, ...prev]);
    };

    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("newNotification", handleNewNotification);
    };
  }, [socket, user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    if (!socket) return;
    if (isConnected) {
      fetchNotifications();
    }
  }, [user, socket, isConnected, fetchNotifications]);

  const markAsRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, seen: true } : n))
    );
  };

  const markAllAsRead = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.seen)
        .map((n) => api.post(`/notifications/${n.id}/read`))
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
  };

  const deleteNotification = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unread = notifications.filter((n) => !n.seen);
  const unreadCount = unread.length;
  const latestUnread = unread.slice(0, 3);

  return {
    notifications,
    setNotifications,
    unreadCount,
    latestUnread,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications,
  };
}

export default useNotifications;

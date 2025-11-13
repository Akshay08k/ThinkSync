import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

const SOCKET_STATUS = {
  CONNECTED: "connected",
  CONNECTING: "connecting",
  DISCONNECTED: "disconnected",
  ERROR: "error",
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const [status, setStatus] = useState(SOCKET_STATUS.DISCONNECTED);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setStatus(SOCKET_STATUS.DISCONNECTED);
      return;
    }

    if (socketRef.current && currentUserIdRef.current === user.id) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      currentUserIdRef.current = null;
    }

    const backendUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      "http://localhost:3000";

    setStatus(SOCKET_STATUS.CONNECTING);

    const socket = io(backendUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;
    currentUserIdRef.current = user.id;

    const handleConnect = () => {
      setStatus(SOCKET_STATUS.CONNECTED);
      socket.emit("registerUser", user.id);
    };

    const handleDisconnect = () => {
      setStatus(SOCKET_STATUS.DISCONNECTED);
    };

    const handleError = (error) => {
      console.error("Socket connection error:", error);
      setStatus(SOCKET_STATUS.ERROR);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);
    socket.on("error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
      socket.off("error", handleError);
      socket.disconnect();
      socketRef.current = null;
      currentUserIdRef.current = null;
      setStatus(SOCKET_STATUS.DISCONNECTED);
    };
  }, [isAuthenticated, user?.id]);

  const value = {
    socket: socketRef.current,
    status,
    isConnected: status === SOCKET_STATUS.CONNECTED,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};



import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import {
  FaBrain,
  FaSignOutAlt,
  FaBell,
  FaHome,
  FaCompass,
  FaLink,
  FaCog,
  FaBars,
  FaTimes,
  FaUser,
  FaCheck,
  FaTrash,
} from "react-icons/fa";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

const Navbar = ({ isAuthenticated, setIsAuthenticated }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Reuse hook!
  const {
    unreadCount,
    latestUnread,
    markAsRead,
    deleteNotification,
    loading: notificationsLoading,
  } = useNotifications();

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err.response?.data || err.message);
    }
  };

  const navItems = [
    { path: "/", label: "Home", icon: FaHome, auth: false },
    { path: "/explore", label: "Explore", icon: FaCompass, auth: false },
    { path: "/connections", label: "Connections", icon: FaLink, auth: true },
    { path: "/settings", label: "Settings", icon: FaCog, auth: true },
  ];

  const handleProtectedClick = (authRequired, path) => {
    if (authRequired && !isAuthenticated) {
      alert("Please log in first to access this page!");
      navigate("/login");
    } else {
      navigate(path);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed inset-x-0 top-1.5 sm:top-2 z-[101] px-3 sm:px-4"
      >
        <div className="max-w-7xl mx-auto backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl">
          <div className="px-4 lg:px-6 h-[3.75rem] flex items-center justify-between gap-3">
            {/* Logo */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/"
                className="flex items-center gap-2 text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <div className="flex items-center gap-3 text-3xl font-bold">
                    <FaBrain className="text-3xl text-blue-600 dark:text-blue-400 animate-pulse" />
                  </div>
                </motion.div>
                <span className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  ThinkSync
                </span>
              </Link>
            </motion.div>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                // Hide auth-only items if guest
                if (item.auth && !isAuthenticated) return null;
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <button
                      onClick={() => handleProtectedClick(item.auth, item.path)}
                      className={`cursor-pointer relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                      }`}
                    >
                      <Icon className="text-sm" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-blue-600 rounded-xl -z-10"
                          initial={false}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Right-side actions */}
            <div className="flex items-center gap-2">
              {/* Dark Mode */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-300"
                title={
                  isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
              >
                <motion.div
                  animate={{ rotate: isDarkMode ? 180 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {isDarkMode ? (
                    <MdLightMode className="text-lg" />
                  ) : (
                    <MdDarkMode className="text-lg" />
                  )}
                </motion.div>
              </motion.button>

              {/* Notifications - only auth */}
              {isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative p-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-300"
                  title="Notifications"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <FaBell className="text-lg" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </motion.button>
              )}

              {/* Profile menu - only auth */}
              {isAuthenticated && (
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 px-3 py-2 rounded-xl transition-all duration-300"
                  >
                    <img
                      src={
                        user.details.avatar ||
                        `https://placehold.co/32x32/667eea/ffffff?text=${user.displayName[0].toUpperCase()}`
                      }
                      alt="User Avatar"
                      className="w-8 h-8 rounded-full ring-2 ring-blue-500/20"
                    />
                    <span className="text-gray-700 dark:text-gray-200 hidden xl:block font-medium">
                      {user.displayName}
                    </span>
                  </motion.button>

                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl py-2"
                      >
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <FaUser className="text-sm" />
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setShowProfileMenu(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
                        >
                          <FaSignOutAlt className="text-sm" />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Notification popup outside profile menu*/}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl py-3 z-50"
                  >
                    <div className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-20">
                      Notifications
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="px-4 py-6 text-center text-gray-400">
                          Loading...
                        </div>
                      ) : latestUnread.length > 0 ? (
                        latestUnread.map((notif, i) => (
                          <div
                            key={notif.id}
                            className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors cursor-pointer flex gap-2 items-start"
                            onClick={(e) => {
                              // prevent click if child action button is clicked
                              if (e.target.closest(".notif-action-btn")) return;
                              const type =
                                notif.content.includes("comment") ||
                                notif.content.includes("like")
                                  ? "post"
                                  : notif.content.includes("follow")
                                  ? "profile"
                                  : null;
                              if (type === "post" && notif.post?.id)
                                navigate(`/post/${notif.post.id}`);
                              if (type === "profile" && notif.sender?.username)
                                navigate(`/profile/${notif.sender.username}`);
                              setShowNotifications(false);
                            }}
                          >
                            <img
                              src={
                                notif.sender?.details?.avatar ||
                                "https://placehold.co/24x24/667eea/fff?text=U"
                              }
                              className="w-6 h-6 rounded-full mr-2"
                              alt="avatar"
                            />
                            <div className="flex-1">
                              <span className="font-medium">
                                {notif.sender?.displayName}
                              </span>
                              <span className="ml-1 text-xs text-gray-400">
                                @{notif.sender?.username}{" "}
                              </span>
                              <div className="">{notif.content}</div>
                            </div>
                            <span className="ml-2 mt-0.5 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(notif.createdAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                            {!notif.seen && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1.5 mx-0.5 notif-action-btn text-gray-400 hover:text-green-500 rounded-full transition-colors"
                                title="Mark as read"
                                type="button"
                                tabIndex={-1}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await markAsRead(notif.id);
                                }}
                              >
                                <FaCheck />
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-1.5 notif-action-btn text-gray-400 hover:text-red-500 rounded-full transition-colors"
                              title="Delete"
                              type="button"
                              tabIndex={-1}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await deleteNotification(notif.id);
                              }}
                            >
                              <FaTrash />
                            </motion.button>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-gray-400">
                          No unread notifications
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2 text-center">
                      <Link
                        to="/notifications"
                        className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                        onClick={() => setShowNotifications(false)}
                      >
                        View all
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile Menu Button */}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed top-[5.5rem] inset-x-0 px-4 z-[100]"
          >
            <div className="backdrop-blur-xl w-full max-w-md mx-auto bg-white/95 dark:bg-gray-900/95 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-2xl p-6">
              <div className="space-y-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  // Hide auth-only items if guest
                  if (item.auth && !isAuthenticated) return null;
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <button
                        onClick={() =>
                          handleProtectedClick(item.auth, item.path)
                        }
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                        }`}
                      >
                        <Icon className="text-lg" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/25 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {showProfileMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </>
  );
};

export default Navbar;

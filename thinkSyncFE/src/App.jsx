import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Home from "./components/Home";
import Login from "./components/Login";
import Profile from "./components/Profile/Profile";
import Settings from "./components/Settings";
import PostDetail from "./components/PostDetail/PostDetails";
import Explore from "./components/Explore";
import Connections from "./components/Connections";
import Notifications from "./components/Notifications";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import MainLayout from "./layouts/MainLayout";
import LoadingScreen from "./components/LoadingScreen";
import ProtectedRoute from "./utils/ProtectedRoutes";
import { useAuth } from "./contexts/AuthContext";
import NotFound from "./components/UtilComponents/NotFound";
import Bookmarks from "./components/Bookmarks";
import { pageVariants } from "./utils/animations";
import Topics from "./components/Topics";
import FloatingChatButton from "./components/Messages/FloatingButton";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { Toaster } from "react-hot-toast";
import AdminLayout from "./components/Admin/AdminLayout";
import AdminDashboard from "./components/Admin/Dashboard";
import AdminReports from "./components/Admin/Reports";
import AdminUsers from "./components/Admin/Users";
import AdminAnnouncements from "./components/Admin/Announcements";
import AdminGuidelines from "./components/Admin/Guidelines";
import AdminFlaggedContent from "./components/Admin/FlaggedContent";
import AdminAuditLogs from "./components/Admin/AuditLogs";
import ProtectedAdminRoute from "./utils/ProtectedAdminRoute";
import About from "./components/StaticPages/About";
import Contact from "./components/StaticPages/Contact";
import Privacy from "./components/StaticPages/Privacy";
import Guidelines from "./components/StaticPages/Guidelines";

function App() {
  const { isAuthenticated, loading, setIsAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;

  const publicRoutes = [
    { path: "/", element: <Home /> },
    { path: "/explore", element: <Explore /> },
  ];

  const protectedRoutes = [
    { path: "/profile", element: <Profile /> },
    { path: "/profile/:username", element: <Profile /> },
    { path: "/settings", element: <Settings /> },
    { path: "/post/:id", element: <PostDetail /> },
    { path: "/connections", element: <Connections /> },
    { path: "/notifications", element: <Notifications /> },
    { path: "/bookmarks", element: <Bookmarks /> },
    { path: "/topic/:selectedTopic", element: <Topics /> },
  ];

  return (
    <SocketProvider>
      <NotificationProvider>
        <Router>
          <AnimatePresence mode="wait">
            <Routes>
              <Route
                path="/login"
                element={
                  <motion.div
                    variants={pageVariants}
                    initial="initial"
                    animate="in"
                    exit="out"
                    style={{ willChange: "transform, opacity" }}
                  >
                    <Login
                      isAuthenticated={isAuthenticated}
                      setIsAuthenticated={setIsAuthenticated}
                    />
                  </motion.div>
                }
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Static Pages */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/guidelines" element={<Guidelines />} />

              <Route element={<MainLayout />}>
                {publicRoutes.map(({ path, element }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="in"
                        exit="out"
                        style={{ willChange: "transform, opacity" }}
                      >
                        {element}
                      </motion.div>
                    }
                  />
                ))}

                {protectedRoutes.map(({ path, element }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <ProtectedRoute
                        isAuthenticated={isAuthenticated}
                        setIsAuthenticated={setIsAuthenticated}
                        redirectTo="/login"
                      >
                        {element}
                      </ProtectedRoute>
                    }
                  />
                ))}

                <Route path="/*" element={<NotFound />} />
              </Route>

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminReports />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminUsers />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminAnnouncements />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/guidelines"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminGuidelines />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/flagged"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminFlaggedContent />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <AdminAuditLogs />
                    </AdminLayout>
                  </ProtectedAdminRoute>
                }
              />
            </Routes>
          </AnimatePresence>
        </Router>

        {isAuthenticated && <FloatingChatButton />}
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom: 24,
            zIndex: 9999,
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1f2937",
              color: "#f9fafb",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.25rem",
              boxShadow:
                "0 10px 25px -10px rgba(30, 64, 175, 0.45), 0 6px 15px -8px rgba(15, 23, 42, 0.35)",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#10b981",
                secondary: "#f9fafb",
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#f9fafb",
              },
            },
          }}
        />
      </NotificationProvider>
    </SocketProvider>
  );
}

export default App;

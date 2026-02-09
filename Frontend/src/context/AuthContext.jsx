import { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/api";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Optimization: Skip auth check for public Live Display to speed up load
    if (window.location.pathname.startsWith("/live")) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/auth/me/");
      setUser(res.data.data);
      setIsAuthenticated(true);
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      await api.post("/auth/login/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // After login success, cookie is set. Fetch user.
      await checkAuth();
      return true;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout/");
    } catch (e) {
      console.error("Logout failed", e);
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  // Axios interceptor for 401
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      },
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

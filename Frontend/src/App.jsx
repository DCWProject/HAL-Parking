import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ParkingProvider } from "@/context/ParkingContext";
import LoginPage from "@/pages/LoginPage";
import AppLayout from "@/layouts/AppLayout";
import BlankLayout from "@/layouts/BlankLayout";
import Dashboard from "@/pages/Dashboard";
import LiveDisplay from "@/pages/LiveDisplay";
import LedDisplay from "@/pages/LedDisplay";
import LedGridDisplay from "./pages/LedGridDisplay";
import LedGridVerticalDisplay from "./pages/LedGridVerticalDisplay";
import ParkingList from "@/pages/Parking/ParkingList";
import ParkingDetail from "@/pages/Parking/ParkingDetail";
import ManageParking from "@/pages/Parking/ManageParking/index";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-white">
        Loading...
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" />;

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ParkingProvider>
            <Routes>
              {/* Public / Blank Layout Routes */}
              <Route element={<BlankLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/live" element={<LiveDisplay />} />
                <Route path="/live/:id" element={<LiveDisplay />} />
                <Route path="/led/:id" element={<LedDisplay />} />
                <Route path="/led-grid/:id" element={<LedGridDisplay />} />
                <Route
                  path="/led-grid-vertical/:id"
                  element={<LedGridVerticalDisplay />}
                />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" />} />

              {/* Protected App Layout Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<Dashboard />} />

                {/* Parking Routes */}
                <Route path="parking" element={<ParkingList />} />
                <Route path="parking/:id" element={<ParkingDetail />} />
                <Route path="parking/:id/manage" element={<ManageParking />} />
              </Route>
            </Routes>
          </ParkingProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

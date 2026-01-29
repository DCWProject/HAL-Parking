import { useState, useEffect } from "react";
import api from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import ConfirmLogoutModal from "@/components/ConfirmLogoutModal";
import ParkingAreaList from "@/components/ParkingAreaList";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const navItems = [
    { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { name: "Parking", path: "/parking", icon: Car },
  ];

  const SidebarContent = ({ collapsed = false }) => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div
        className={cn(
          "p-6 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src="/images/logo.png"
              alt="InteliPark Logo"
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-purple-500 drop-shadow-sm truncate">
                InteliPark
              </h1>
              <p className="text-[9px] text-muted-foreground tracking-widest uppercase font-semibold">
                Admin Console
              </p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center cursor-default hover:scale-105 transition-transform">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Scrollable Main Content (Nav + Parking List) */}
      <div className="flex-1 overflow-y-auto px-3 mt-4 space-y-6">
        {/* Main Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                to={item.path}
                key={item.path}
                onClick={() => setSidebarOpen(false)}
              >
                <div
                  className={cn(
                    "flex items-center p-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    collapsed ? "justify-center" : "space-x-3"
                  )}
                >
                  <Icon
                    size={22}
                    className={cn(
                      "shrink-0 transition-transform duration-300",
                      isActive ? "scale-110" : "group-hover:scale-110"
                    )}
                  />
                  {!collapsed && (
                    <span className="font-medium whitespace-nowrap">
                      {item.name}
                    </span>
                  )}

                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-sm border animate-in fade-in slide-in-from-left-2">
                      {item.name}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Monitoring Areas List */}
        {!collapsed && (
          <div className="space-y-2">
            <ParkingAreaList />
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div
        className={cn(
          "p-4 m-2 rounded-xl bg-muted/30 border border-border/40 backdrop-blur-md",
          collapsed ? "flex flex-col items-center gap-4" : ""
        )}
      >
        {!collapsed && (
          <div className="mb-4 px-2">
            <p className="text-sm font-semibold truncate text-foreground">
              {user?.email}
            </p>
            <div className="flex items-center space-x-2 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-xs text-muted-foreground font-medium">
                Online
              </p>
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex items-center",
            collapsed ? "flex-col gap-2" : "gap-2"
          )}
        >
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={toggleTheme}
            className={cn(
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              !collapsed && "flex-1 justify-start"
            )}
            title={collapsed ? "Toggle Theme" : undefined}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span className="ml-2">Theme</span>}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn(
              "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
              !collapsed && "flex-1 justify-start"
            )}
            onClick={() => setLogoutModalOpen(true)}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background/50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile (Drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-background/95 backdrop-blur-2xl border-r shadow-2xl transition-transform duration-300 ease-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <SidebarContent collapsed={false} />
      </aside>

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-[calc(100vh-2rem)] m-4 rounded-3xl border shadow-xl transition-all duration-300 ease-in-out relative z-30",
          "bg-background/80 dark:bg-card/40 backdrop-blur-xl border-border/50", // Improved background mix
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <SidebarContent collapsed={isCollapsed} />

        {/* Toggle Button (Absolute on border) */}
        <div className="absolute -right-3 top-9 z-50">
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 rounded-full shadow-md bg-background border hover:bg-accent transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col h-screen">
        <div className="flex-1 p-4 md:p-6 w-full max-w-[1700px] mx-auto flex flex-col">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-6 bg-background/80 backdrop-blur-md p-4 rounded-2xl border shadow-sm sticky top-0 z-20">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </Button>
            <div className="flex items-center gap-2">
              <img
                src="/images/logo.png"
                alt="InteliPark Logo"
                className="h-12 w-auto object-contain"
              />
              <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                InteliPark
              </h1>
            </div>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Outlet />
          </div>

          <div className="mt-8">
            <Footer />
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmLogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={() => {
          logout();
          setLogoutModalOpen(false);
        }}
      />
    </div>
  );
}

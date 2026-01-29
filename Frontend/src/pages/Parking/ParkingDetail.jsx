import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import {
  Settings,
  Loader2,
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpotCard from "@/components/SpotCard";
import ParkingStatsCards from "./ParkingStatsCard";
import api from "@/services/api";

export default function ParkingDetail() {
  const { id } = useParams();
  const [parkingArea, setParkingArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState("all");

  useEffect(() => {
    const fetchParkingArea = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/parking-areas/${id}`);
        setParkingArea(res.data.data);
      } catch (error) {
        console.error("Failed to fetch parking area", error);
      } finally {
        setLoading(false);
      }
    };

    fetchParkingArea();
  }, [id]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  // Show error state
  if (!parkingArea) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Parking Area Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The parking area you're looking for doesn't exist.
          </p>
          <Link to="/parking">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Parking Areas
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Derived Logic
  const allSpots =
    parkingArea.sections?.flatMap((section) =>
      section.spots.map((s) => ({ ...s, section_name: section.name }))
    ) || [];
  const totalSpots = allSpots.length;
  const occupiedSpots = allSpots.filter((s) => s.status === "OCCUPIED").length;
  const availableSpots = allSpots.filter(
    (s) => s.status === "AVAILABLE"
  ).length;

  // Filter spots based on selection
  const displayedSpots =
    selectedSectionId === "all"
      ? allSpots
      : parkingArea.sections
          ?.find((s) => String(s.id) === selectedSectionId)
          ?.spots.map((spot) => ({
            ...spot,
            section_name: parkingArea.sections.find(
              (s) => String(s.id) === selectedSectionId
            )?.name,
          })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/parking">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {parkingArea.name}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
                Code: {parkingArea.area_code}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
                Max Capacity: {parkingArea.total_spots}
              </span>
            </div>
          </div>
        </div>
        <Link to={`/parking/${parkingArea.id}/manage`}>
          <Button className="gap-2">
            <Settings className="h-4 w-4" />
            Manage Parking
          </Button>
        </Link>
      </div>

      {/* Main Content Area starting from KPIs */}
      <div className="flex-1 -mx-4 px-4 pb-8 space-y-6">
        {/* KPI Cards */}
        <ParkingStatsCards
          totalSpots={totalSpots}
          occupiedSpots={occupiedSpots}
          availableSpots={availableSpots}
          allSpots={allSpots}
        />

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Visual Layout (Left/Center) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="mr-1">
                  <LayoutGrid size={18} />
                </span>
                <h2 className="text-lg font-semibold text-foreground">
                  Parking Layout
                </h2>
              </div>

              {/* Legend (Same as before) */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>{" "}
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>{" "}
                  <span className="text-muted-foreground">Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>{" "}
                  <span className="text-muted-foreground">Offline</span>
                </div>
              </div>
            </div>

            {/* TABS - Refactored for Sections */}
            {parkingArea.sections?.length > 0 && (
              <div className="space-y-4">
                <Tabs
                  defaultValue="all"
                  value={selectedSectionId}
                  onValueChange={setSelectedSectionId}
                  className="w-full"
                >
                  <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-muted/30 p-1">
                    <TabsTrigger
                      value="all"
                      className="data-[state=active]:bg-primary hover:text-primary data-[state=active]:text-primary-foreground min-w-[80px]"
                    >
                      All Sections
                    </TabsTrigger>
                    {parkingArea.sections.map((section) => (
                      <TabsTrigger
                        key={section.id}
                        value={String(section.id)}
                        className="data-[state=active]:bg-primary hover:text-primary data-[state=active]:text-primary-foreground min-w-[80px]"
                      >
                        {section.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Progress Bar for Selected Section */}
                <AnimatePresence>
                  {selectedSectionId !== "all" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-card/50 border border-border/50 p-4 rounded-xl backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-2 text-sm">
                          <span className="font-semibold text-foreground">
                            {parkingArea.sections?.find(
                              (s) => String(s.id) === selectedSectionId
                            )?.name + " Capacity"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {
                              displayedSpots.filter(
                                (s) => s.status === "OCCUPIED"
                              ).length
                            }{" "}
                            / {displayedSpots.length} Occupied
                          </span>
                        </div>
                        <div className="flex h-3 w-full rounded-full bg-muted overflow-hidden">
                          {/* Occupied Segment */}
                          <div
                            className="h-full bg-red-500 transition-all duration-700 ease-out relative"
                            style={{
                              width: `${
                                displayedSpots.length > 0
                                  ? (displayedSpots.filter(
                                      (s) => s.status === "OCCUPIED"
                                    ).length /
                                      displayedSpots.length) *
                                    100
                                  : 0
                              }%`,
                            }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{" "}
                              Occupied
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>{" "}
                              Offline (
                              {
                                displayedSpots.filter(
                                  (s) => s.status === "OFFLINE"
                                ).length
                              }
                              )
                            </span>
                          </div>
                          <span className="text-green-500">
                            {
                              displayedSpots.filter(
                                (s) => s.status === "AVAILABLE"
                              ).length
                            }{" "}
                            Available
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Spots Grid */}
            <motion.div
              key={selectedSectionId} // Triggers re-animation when tab changes
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.03, // Fast stagger for "one by one" effect
                  },
                },
              }}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 shadow-inner min-h-[100px] max-h-[600px] overflow-y-auto pr-2 custom-scrollbar content-start"
            >
              {displayedSpots.map((spot) => (
                <motion.div
                  key={spot.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.9 },
                    show: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                      },
                    },
                  }}
                >
                  <SpotCard spot={spot} />
                </motion.div>
              ))}

              {displayedSpots.length === 0 && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1 },
                  }}
                  className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-muted rounded-xl"
                >
                  No spots found for this area. Please go to manage parking to
                  add spots.
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right Sidebar (Devices) */}
          <div className="lg:col-span-1 space-y-6 border border-muted rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Devices</h3>
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
                {parkingArea.devices?.length || 0} Connected
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {parkingArea.devices && parkingArea.devices.length > 0 ? (
                parkingArea.devices.map((device) => (
                  <div
                    key={device.id}
                    className="p-3 rounded-xl bg-card border border-border/50 shadow-sm hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="font-mono text-sm font-bold text-foreground truncate"
                        title={device.device_uid}
                      >
                        {device.device_uid}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`relative flex h-2 w-2`}>
                          {device.is_online && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              device.is_online ? "bg-green-500" : "bg-red-500"
                            }`}
                          ></span>
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {device.is_online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {device.ip_address && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            IP Address
                          </span>
                          <span className="font-mono text-foreground/80">
                            {device.ip_address}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Last Seen</span>
                        <span className="text-foreground/80">
                          {device.last_seen
                            ? new Date(device.last_seen).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-muted rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    No devices connected
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";

import api from "@/services/api";
import ConfirmDialog from "@/components/ConfirmDialog";

// Sub-components
import ParkingHeader from "./ParkingDetails/ParkingHeader";
import ParkingStatsCards from "./ParkingDetails/ParkingStatsCard";
import ParkingLayout from "./ParkingDetails/ParkingLayout";
import DeviceList from "./ParkingDetails/DeviceList";

export default function ParkingDetail() {
  const { id } = useParams();
  const [parkingArea, setParkingArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    deviceId: null, 
    deviceUid: "",
    action: "restart", // 'restart', 'debug', 'reset_spots' or 'delete'
    nextDebugState: false
  });
  const [actionLoading, setActionLoading] = useState(false);
  

  useEffect(() => {
    const fetchParkingArea = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/parking-areas/${id}/`);
        setParkingArea(res.data.data);
      } catch (error) {
        console.error("Failed to fetch parking area", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchParkingArea();
  }, [id]);



  const handleConfirmAction = async () => {
    if (!confirmDialog.deviceId) return;
    setActionLoading(true);
    try {
        if (confirmDialog.action === "restart") {
            await api.post(`/devices/${confirmDialog.deviceId}/restart/`);
        } else if (confirmDialog.action === "debug") {
            await api.patch(`/devices/${confirmDialog.deviceId}/`, {
                debug_mode: confirmDialog.nextDebugState
            });
            // Optimistically update local state
            setParkingArea(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    devices: prev.devices.map(d => 
                        d.id === confirmDialog.deviceId 
                            ? { ...d, debug_mode: confirmDialog.nextDebugState } 
                            : d
                    )
                };
            });
            
        } else if (confirmDialog.action === "delete") {
             await api.delete(`/devices/${confirmDialog.deviceId}/`);
             window.location.reload();
             return; // Reload handles cleanup
        } else if (confirmDialog.action === "reset_spots") {
             await api.post(`/devices/${confirmDialog.deviceId}/reset_spots/`);
        }
    } catch (error) {
        console.error(`Failed to ${confirmDialog.action}`, error);
    } finally {
        setActionLoading(false);
        setConfirmDialog({ 
            isOpen: false, 
            deviceId: null, 
            deviceUid: "", 
            action: "restart",
            nextDebugState: false 
        });
    }
  };

  // WebSocket Logic
  useEffect(() => {
    if (!parkingArea || !parkingArea.area_code) return;

    const base = import.meta.env.VITE_API_BASE;
    let wsUrl;
    if (base.startsWith("https")) {
      wsUrl = base.replace("https", "wss");
    } else {
      wsUrl = base.replace("http", "ws");
    }
    const finalWsUrl = `${wsUrl}/ws/parking_detail/${parkingArea.area_code}/`;

    console.log("Connecting to Parking Detail WS:", finalWsUrl);
    const ws = new WebSocket(finalWsUrl);

    ws.onopen = () => {
      console.log("Parking Detail WS Connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "spot_update") {
        // Update the spots in state
        const updatedSpotsData = data.data; // Array of {id, spot_code, status, section_id}

        setParkingArea((prev) => {
          if (!prev) return prev;

          // Deep clone to modify
          const newArea = { ...prev };
          newArea.sections = newArea.sections.map((section) => {
            return {
              ...section,
              spots: section.spots.map((spot) => {
                const update = updatedSpotsData.find((u) => u.id === spot.id);
                if (update) {
                  return { ...spot, status: update.status };
                }
                return spot;
              }),
            };
          });

          return newArea;
        });
      }
    };

    ws.onclose = () => {
      console.log("Parking Detail WS Disconnected");
    };

    return () => {
      ws.close();
    };
  }, [parkingArea?.area_code]);

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
      section.spots.map((s) => ({ ...s, section_name: section.name })),
    ) || [];
  const totalSpots = allSpots.length;
  const occupiedSpots = allSpots.filter((s) => s.status === "OCCUPIED").length;
  const availableSpots = allSpots.filter(
    (s) => s.status === "AVAILABLE",
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
              (s) => String(s.id) === selectedSectionId,
            )?.name,
          })) || [];

  return (
    <div className="space-y-6">
      {/* Confirm Dialog */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={
            confirmDialog.action === "restart" ? "Restart Device" : 
            confirmDialog.action === "delete" ? "Delete Device" : "Reset Spot Status"
        }
        description={
            confirmDialog.action === "restart" 
            ? `Are you sure you want to restart device ${confirmDialog.deviceUid}? This may take a few moments.`
            : confirmDialog.action === "delete"
            ? `Are you sure you want to delete device ${confirmDialog.deviceUid}? This action cannot be undone.`
            :  `Are you sure you want to manually reset all spots for ${confirmDialog.deviceUid} to AVAILABLE? This is for synchronization only.`
        }
        confirmText={
            confirmDialog.action === "restart" ? "Restart" : 
            confirmDialog.action === "delete" ? "Delete" :
            confirmDialog.action === "reset_spots" ? "Reset" :
            "Confirm"
        }
        variant={
            confirmDialog.action === "restart" || confirmDialog.action === "delete" || confirmDialog.action === "reset_spots" ? "destructive" : "default"
        }
        loading={actionLoading}
      />

      <ParkingHeader parkingArea={parkingArea} />

      {/* Main Content Area starting from KPIs */}
      <div className="flex-1 -mx-4 px-4 pb-8 space-y-6">
        <ParkingStatsCards
          totalSpots={totalSpots}
          occupiedSpots={occupiedSpots}
          availableSpots={availableSpots}
          allSpots={allSpots}
        />

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ParkingLayout 
            parkingArea={parkingArea}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            displayedSpots={displayedSpots}
          />

          <DeviceList 
            devices={parkingArea.devices}
            onRestart={(id, uid) => setConfirmDialog({ isOpen: true, deviceId: id, deviceUid: uid, action: "restart" })}
            onDelete={(id, uid) => setConfirmDialog({ isOpen: true, deviceId: id, deviceUid: uid, action: "delete" })}
            onResetSpots={(id, uid) => setConfirmDialog({ isOpen: true, deviceId: id, deviceUid: uid, action: "reset_spots" })}
          />
        </div>
      </div>
    </div>
  );
}

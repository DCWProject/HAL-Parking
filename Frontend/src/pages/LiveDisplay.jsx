import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

// Placeholder for Logo - replace with actual path if available or use a text placeholder
const YOUR_LOGO = "/logo.png"; // Replace with actual logo path
const VENDOR_LOGO = "/logo.png"; // Replace with actual vendor logo

export default function LiveDisplay() {
  const { id } = useParams();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [areaName, setAreaName] = useState("Smart Parking");
  const [totalSections, setTotalSections] = useState(0);

  // WebSocket Connection Logic
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = (targetAreaId) => {
    // Prevent multiple connections to same ID
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Connect using area_code
    const urlParams = targetAreaId ? `?area_code=${targetAreaId}` : "";
    const wsUrl = `ws://localhost:8000/ws/live${urlParams}`;
    console.log("Connecting to WS:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Live Display Connected to WS");
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = () => {
      console.log("Live Display Disconnected from WS");
      setIsConnected(false);
      wsRef.current = null;

      // Auto Reconnect
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connectWebSocket(targetAreaId);
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error("WS Error:", err);
      ws.close();
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "init_live_display") {
        if (msg.area_name) setAreaName(msg.area_name);
        setSections(msg.sections || []);
        setTotalSections(msg.total_sections || 0);
        setLoading(false);
      } else if (msg.type === "live_slots_update") {
        // Update spots for a specific section (replace entire list with new available spots)
        const sectionId = msg.section_id;
        const newSpots = msg.data || []; // top (max 4) available spots

        if (sectionId) {
          setSections((prevSections) => {
            return prevSections.map((section) => {
              if (section.id === sectionId) {
                return { ...section, spots: newSpots };
              }
              return section;
            });
          });
        }
      }
    };
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      connectWebSocket(id);
    } else {
      setAreaName("Unknown Area");
      setLoading(false);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
    };
  }, [id]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        <div className="text-4xl animate-pulse">Initializing Display...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans select-none cursor-none">
      {/* --- HEADER (15%) --- */}
      <header className="h-[15%] flex items-center justify-between px-10 bg-neutral-900 border-b-4 border-neutral-800 shadow-2xl z-10">
        {/* Left: Our Logo */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-3xl font-black tracking-tighter">IP</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-blue-400">INTELI</span>
            <span className="text-xl font-bold text-white tracking-widest">
              PARK
            </span>
          </div>
        </div>

        {/* Center: Area Name */}
        <div className="flex flex-col items-center">
          <h1
            onDoubleClick={toggleFullScreen}
            className="text-6xl font-black tracking-tight text-white uppercase drop-shadow-md select-none cursor-pointer hover:text-gray-200 transition-colors"
            title="Double click to toggle Full Screen"
          >
            {areaName}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi size={24} className="text-green-500" />
              ) : (
                <WifiOff size={24} className="text-red-500" />
              )}
            </div>
            <span className="text-lg text-green-400 font-medium tracking-wide">
              LIVE AVAILABILITY
            </span>
          </div>
        </div>

        {/* Right: Vendor Logo */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-neutral-400">POWERED BY</span>
            <span className="text-xl font-bold text-orange-400">
              INTELISPARKZ
            </span>
          </div>
          <div className="h-20 w-20 bg-neutral-800 rounded-lg flex items-center justify-center border border-neutral-700">
            <img src={"/images/logo.png"} alt="Vendor" />
          </div>
        </div>
      </header>

      {/* --- BODY (Sections Grid) --- */}
      <main className="flex-1 p-8">
        <div
          className="h-full w-full grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${Math.max(
              1,
              sections.length
            )}, minmax(0, 1fr))`,
            gridTemplateRows: "1fr",
          }}
        >
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-4 flex flex-col shadow-xl backdrop-blur-sm"
            >
              {/* Section Header */}
              <div className="text-center mb-4 pb-2">
                <h2 className="text-6xl font-black text-neutral-300 tracking-wide uppercase">
                  {section.section_code}
                </h2>
              </div>

              {/* Spots Grid (Always 4 slots) */}
              <div className="flex-1 grid grid-cols-1 grid-rows-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => {
                  const spot = section.spots[i];
                  // Logic: If spot exists AND is available -> Green. Else -> Red (Occupied or Placeholder)
                  const isAvailable = spot && spot.status === "AVAILABLE";

                  return (
                    <motion.div
                      key={spot ? spot.id : `placeholder-${section.id}-${i}`}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`relative rounded-2xl flex flex-col items-center justify-center overflow-hidden shadow-lg border-t border-white/10 ${
                        isAvailable
                          ? "bg-gradient-to-br from-green-500 to-green-700 shadow-green-900/50"
                          : "bg-gradient-to-br from-red-600 to-red-800 shadow-red-900/50 grayscale-[0.2]"
                      }`}
                    >
                      {/* Status Text */}
                      <span className="text-sm md:text-lg font-bold text-white/80 mb-0 md:mb-1 uppercase tracking-widest">
                        {isAvailable ? "Available" : ""}
                      </span>

                      {/* Spot Code or Icon */}
                      {isAvailable && spot ? (
                        <span className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-md">
                          {spot.spot_code}
                          {/* Showing only the number part if preferred, or full code */}
                        </span>
                      ) : (
                        <span className="text-3xl md:text-4xl font-bold text-white/80 tracking-widest uppercase transform -rotate-12">
                          FULL
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

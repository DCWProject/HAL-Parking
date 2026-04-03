import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

export default function LiveDisplay() {
  const { id } = useParams();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [areaName, setAreaName] = useState("Smart Parking");

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

    const base = import.meta.env.VITE_API_BASE;
    let wsUrl;
    if (base.startsWith("https")) {
      wsUrl = base.replace("https", "wss");
    } else {
      wsUrl = base.replace("http", "ws");
    }
    // Connect using area_code
    const urlParams = targetAreaId ? `?area_code=${targetAreaId}` : "";
    const finalWsUrl = wsUrl + `/ws/live/${urlParams}`;
    console.log("Connecting to WS:", finalWsUrl);

    const ws = new WebSocket(finalWsUrl);
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
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
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
    <div className="h-screen w-screen live-body-bg text-white overflow-hidden flex flex-col font-sans select-none cursor-none">
      {/* --- HEADER (15%) --- */}
      <header
        className="h-[15%] flex items-center justify-between live-header-bg border-b-4 border-gray-500 shadow-2xl z-10"
        style={{ paddingInline: "3vw" }}
      >
        {/* Left: Our Logo */}
        <div className="flex items-center" style={{ gap: "1vw" }}>
          <img
            src={"/images/logo_full_dark.png"}
            style={{ height: "10vh" }}
            className="w-auto object-contain"
            alt="Logo"
          />
        </div>

        {/* Center: Area Name */}
        <div className="flex flex-col items-center">
          <h1
            onDoubleClick={toggleFullScreen}
            className="font-black tracking-tight text-white uppercase drop-shadow-md select-none cursor-pointer hover:text-gray-200 transition-colors"
            style={{ fontSize: "7vh", lineHeight: 1.1 }}
            title="Double click to toggle Full Screen"
          >
            {areaName}
          </h1>
          <div
            className="flex items-center"
            style={{ gap: "1vw", marginTop: "0.5vh" }}
          >
            {isConnected ? (
              <div className="flex items-center" style={{ gap: "0.8vw" }}>
                <Wifi
                  style={{ width: "2.5vh", height: "2.5vh" }}
                  className="text-green-500"
                />
                <span
                  className="text-green-400 font-semibold tracking-widest uppercase"
                  style={{ fontSize: "2.2vh" }}
                >
                  LIVE AVAILABILITY
                </span>
              </div>
            ) : (
              <div className="flex items-center" style={{ gap: "0.8vw" }}>
                <WifiOff
                  style={{ width: "2.5vh", height: "2.5vh" }}
                  className="text-red-500"
                />
                <span
                  className="text-red-400 font-semibold tracking-widest uppercase"
                  style={{ fontSize: "2.2vh" }}
                >
                  OFFLINE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Vendor Logo */}
        <div className="flex items-center" style={{ gap: "1vw" }}>
          <img
            src={"/images/vendor_logo.png"}
            style={{ height: "10vh" }}
            className="w-auto object-contain"
            alt="Vendor"
          />
        </div>
      </header>

      {/* --- BODY (Sections Grid) --- */}
      <main className="flex-1 p-8">
        <div
          className="h-full w-full grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${Math.max(
              1,
              sections.length,
            )}, minmax(0, 1fr))`,
            gridTemplateRows: "1fr",
          }}
        >
          {sections.map((section) => (
            <div
              key={section.id}
              className="border border-white/30 rounded-3xl p-4 flex flex-col shadow-xl backdrop-blur-sm live-header-bg"
            >
              {/* SECTION HEADER */}
              <div className="text-center mb-4 pb-2">
                <h2 className="text-6xl font-black text-white tracking-wide uppercase">
                  {section.section_code}
                </h2>
              </div>

              {/* SPOTS GRID */}
              <div className="flex-1 grid grid-cols-1 grid-rows-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => {
                  const spot = section.spots[i];
                  const isAvailable = spot && spot.status === "AVAILABLE";
                  const isOffline = spot && spot.status === "OFFLINE";

                  /* ---------------------------
               CARD STYLE CONFIG
            ---------------------------- */
                  let bgClass = "bg-red-600 border border-red-400/20";
                  let glowColor = "rgba(239,68,68,0.55)";
                  let text = "FULL";

                  if (isAvailable) {
                    bgClass = "bg-green-500 border border-green-400/20";
                    glowColor = "rgba(16,185,129,0.6)";
                    //text = "AVAILABLE";
                  }

                  return (
                    <motion.div
                      key={spot ? spot.id : `placeholder-${section.id}-${i}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={`relative rounded-2xl flex flex-col items-center justify-center
                            overflow-hidden shadow-lg ${bgClass}`}
                    >
                      {/* NEON GLOW OVERLAY */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        animate={{
                          opacity: isAvailable ? [0.25, 0.45, 0.25] : 0.35,
                        }}
                        transition={{
                          duration: isAvailable ? 3 : 0,
                          repeat: isAvailable ? Infinity : 0,
                          ease: "easeInOut",
                        }}
                        style={{
                          boxShadow: `0 0 40px ${glowColor}`,
                        }}
                      />

                      {/* OFFLINE ICON */}
                      {isOffline && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-black/30 rounded-full flex items-center justify-center z-10">
                          <WifiOff size={14} className="text-white" />
                        </span>
                      )}

                      {/* SPOT CODE BADGE (WHEN FULL/OFFLINE) */}
                      {!isAvailable && spot && (
                        <span
                          className="absolute bottom-2 right-2 text-sm px-2 h-6
                                   bg-black/30 rounded-md flex items-center justify-center z-10 text-white"
                        >
                          {spot.spot_code}
                        </span>
                      )}

                      {/* STATUS LABEL */}
                      {/* <span className="text-sm md:text-lg font-bold text-white/80 mb-1 uppercase tracking-widest z-10">
                        {text === "AVAILABLE" ? "Available" : ""}
                      </span> */}

                      {/* MAIN CONTENT */}
                      {isAvailable && spot ? (
                        <span className="text-5xl md:text-7xl font-black text-white tracking-tight z-10">
                          {spot.spot_code}
                        </span>
                      ) : (
                        <span className="text-3xl md:text-6xl font-bold text-white/80 tracking-widest uppercase  z-10">
                          {text}
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

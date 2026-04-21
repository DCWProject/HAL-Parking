import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

export default function LedDisplay() {
  const { id } = useParams();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [areaName, setAreaName] = useState("Smart Parking");

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = (targetAreaId) => {
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

    const urlParams = targetAreaId ? `?area_code=${targetAreaId}` : "";
    const finalWsUrl = wsUrl + `/ws/live/${urlParams}`;

    const ws = new WebSocket(finalWsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket(targetAreaId);
        }, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "init_live_display") {
        if (msg.area_name) setAreaName(msg.area_name);
        setSections(msg.sections || []);
        setLoading(false);
      }

      if (msg.type === "live_slots_update") {
        const sectionId = msg.section_id;
        const newSpots = msg.data || [];

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
    }

    return () => {
      if (wsRef.current) wsRef.current.close();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [id]);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        <div style={{ fontSize: "20px" }}>Initializing Display...</div>
      </div>
    );
  }

  return (
    <div
      className="text-white overflow-hidden flex flex-col select-none"
      style={{
        width: "480px",
        height: "320px",
        background: "#090235",
        fontFamily: "sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          height: "48px",
          background: "#090224",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: "8px",
          paddingRight: "8px",
          borderBottom: "1px solid #555",
        }}
      >
        <img
          src="/images/logo_full_dark.png"
          alt="logo"
          style={{ height: "32px" }}
        />

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {areaName}
          </div>

          <div
            style={{
              fontSize: "9px",
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            {isConnected ? (
              <div
                style={{
                  color: "#4ade80",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Wifi size={10} style={{ marginRight: "4px" }} />
                <span style={{ fontSize: "12px" }}>LIVE</span>
              </div>
            ) : (
              <div
                style={{
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <WifiOff size={10} style={{ marginRight: "4px" }} />
                <span style={{ fontSize: "12px" }}>OFFLINE</span>
              </div>
            )}
          </div>
        </div>

        <img
          src="/images/vendor_logo.png"
          alt="vendor"
          style={{ height: "32px" }}
        />
      </header>

      {/* BODY */}
      <main
        style={{
          padding: "6px",
          height: "272px",
        }}
      >
        <div
          style={{
            height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(
              1,
              sections.length
            )}, 1fr)`,
            gap: "6px",
          }}
        >
          {sections.map((section) => {
            // 1. Sort spots: "AVAILABLE" first, then ordered by spot_code alphanumerically
            const sortedSpots = [...(section.spots || [])].sort((a, b) => {
              const isA_Avail = a.status === "AVAILABLE";
              const isB_Avail = b.status === "AVAILABLE";

              // Prioritize AVAILABLE status
              if (isA_Avail && !isB_Avail) return -1;
              if (!isA_Avail && isB_Avail) return 1;

              // If statuses are the same, sort by spot_code (numeric: true handles A-2 vs A-10 correctly)
              if (a.spot_code && b.spot_code) {
                return a.spot_code.localeCompare(b.spot_code, undefined, {
                  numeric: true,
                });
              }
              return 0;
            });

            return (
              <div
                key={section.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  background: "#090224",
                }}
              >
                {/* SECTION TITLE */}
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {section.section_code}
                  </div>
                </div>

                {/* SPOTS */}
                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateRows: "repeat(6, 1fr)",
                    gap: "4px",
                  }}
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    // 2. Safely grab from the sorted array
                    const spot = sortedSpots[i];
                    const isAvailable = spot && spot.status === "AVAILABLE";

                    let bgColor = "#dc2626";
                    let glowColor = "rgba(239,68,68,0.5)";
                    let text = "FULL";

                    if (isAvailable) {
                      bgColor = "#22c55e";
                      glowColor = "rgba(16,185,129,0.5)";
                    }

                    return (
                      <motion.div
                        key={spot ? spot.id : `${section.id}-${i}`}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          background: bgColor,
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                          boxShadow: `0 0 16px ${glowColor}`,
                        }}
                      >
                        {isAvailable && spot ? (
                          <span
                            style={{
                              fontSize: "22px",
                              fontWeight: 900,
                            }}
                          >
                            {spot.spot_code}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "16px",
                              fontWeight: 700,
                            }}
                          >
                            {text}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
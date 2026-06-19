import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

const styles = `
.vgd-container {
  width: 480px;
  height: 320px;
  background: #090235;
  color: white;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.vgd-header {
  height: 44px;
  background: #090224;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 6px;
  padding-right: 6px;
  border-bottom: 1px solid #e4e4e4;
}

.vgd-logo {
  height: 28px;
  width: auto;
}

.vgd-header-center {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vgd-header-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vgd-header-title {
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
}

.vgd-header-status {
  font-size: 10px;
  margin-top: 1px;
}

.vgd-datetime-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: monospace;
  font-size: 12px;
  font-weight: bold;
  line-height: 1.2;
}

.vgd-date-display {
  color: #9ca3af;
}

.vgd-time-display {
  color: #38bdf8;
}

.vgd-live {
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.vgd-offline {
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.vgd-body {
  flex: 1;
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 5px;
  padding: 5px;
}

.vgd-section-block {
  display: grid;
  grid-template-columns: 36px 1fr;
  grid-template-rows: repeat(2, 1fr);
  gap: 3px;
  background: #090224;
  border-radius: 6px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.vgd-section-name {
  grid-row: span 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  color: white;
}

.vgd-spot-row {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 3px;
}

.vgd-spot {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  border-radius: 3px;
  letter-spacing: 0.5px;
  position: relative;
}

.vgd-spot.vgd-available {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
  animation: vgd-blinkAvailable 2s infinite;
}

.vgd-spot.vgd-full {
  background: #dc2626;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
}

.vgd-spot.vgd-power-offline {
  background: #4b5563;
  color: rgba(255, 255, 255, 0.5);
  box-shadow: none;
  animation: none;
}

.vgd-loading {
  width: 480px;
  height: 320px;
  background: black;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

// @keyframes vgd-blinkAvailable {
//   0% { opacity: 1; }
//   50% { opacity: 0.75; }
//   100% { opacity: 1; }
// }
`;

export default function LedGridVerticalDisplay() {
  const { id } = useParams();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [areaName, setAreaName] = useState("Smart Parking");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  const formatDate = (date) => {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday}, ${day} ${month}`;
  };

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

      if (wsRef.current === ws) {
        wsRef.current = null;

        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket(targetAreaId);
          }, 3000);
        }
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
                return {
                  ...section,
                  spots: newSpots,
                };
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
      if (wsRef.current) {
        const socketToClose = wsRef.current;
        wsRef.current = null;
        socketToClose.close();
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="vgd-loading">Initializing Display...</div>
      </>
    );
  }

  const abSections = sections.filter(s => ['A', 'B'].includes(s.section_code?.trim().toUpperCase()));
  const cdSections = sections.filter(s => ['C', 'D'].includes(s.section_code?.trim().toUpperCase()));

  const abSpots = abSections.flatMap(s => s.spots || []).filter(Boolean);
  const isABOffline = abSpots.length > 0 && abSpots.every(spot => spot.current_status === "OFFLINE");

  const cdSpots = cdSections.flatMap(s => s.spots || []).filter(Boolean);
  const isCDOffline = cdSpots.length > 0 && cdSpots.every(spot => spot.current_status === "OFFLINE");

  return (
    <div className="vgd-container">
      <style>{styles}</style>
      {/* HEADER */}

      <header className="vgd-header">
        <img src="/images/logo_full_dark.png" alt="logo" className="vgd-logo" />

        <div className="vgd-header-center">
          <div className="vgd-header-info">
            <div className="vgd-header-title">{areaName}</div>

            <div className="vgd-header-status">
              {isConnected ? (
                <span className="vgd-live">
                  <Wifi size={10} />
                  LIVE
                </span>
              ) : (
                <span className="vgd-offline">
                  <WifiOff size={10} />
                  OFFLINE
                </span>
              )}
            </div>
          </div>

          <div className="vgd-datetime-container">
            <div className="vgd-date-display">{formatDate(currentTime)}</div>
            <div className="vgd-time-display">{formatTime(currentTime)}</div>
          </div>
        </div>

        <img src="/images/vendor_logo.png" alt="vendor" className="vgd-logo" />
      </header>

      {/* BODY */}

      <div className="vgd-body">
        {sections.map((section) => {
          const code = section.section_code?.trim().toUpperCase();
          let isPowerOffline = false;
          if (!isConnected) {
            isPowerOffline = true;
          } else if (['A', 'B'].includes(code)) {
            isPowerOffline = isABOffline;
          } else if (['C', 'D'].includes(code)) {
            isPowerOffline = isCDOffline;
          }
          return (
            <SectionBlock
              key={section.id}
              section={section}
              isPowerOffline={isPowerOffline}
            />
          );
        })}
      </div>
    </div>
  );
}

/* SECTION BLOCK */

function SectionBlock({ section, isPowerOffline }) {
  return (
    <div className="vgd-section-block">
      {/* SECTION LETTER */}

      <div className="vgd-section-name">{section.section_code}</div>

      {/* ROW 1 */}

      <div className="vgd-spot-row">
        {Array.from({ length: 9 }).map((_, i) => {
          const spot = section.spots[i];

          return (
            <SpotBox key={i} spot={spot} sectionId={section.id} index={i} isPowerOffline={isPowerOffline} />
          );
        })}
      </div>

      {/* ROW 2 */}

      <div className="vgd-spot-row">
        {Array.from({ length: 9 }).map((_, i) => {
          const index = i + 9;

          const spot = section.spots[index];

          return (
            <SpotBox
              key={index}
              spot={spot}
              sectionId={section.id}
              index={index}
              isPowerOffline={isPowerOffline}
            />
          );
        })}
      </div>
    </div>
  );
}

/* SPOT */

function SpotBox({ spot, isPowerOffline }) {
  const isAvailable = spot && spot.status === "AVAILABLE";

  let numberText = "--";

  if (spot && spot.spot_code) {
    const parts = spot.spot_code.split("-");

    // numberText = spot.spot_code;
    numberText = parts.length > 1 ? parts[1] : spot.spot_code;
  }

  let spotClassName = "vgd-spot vgd-full";
  if (isPowerOffline) {
    spotClassName = "vgd-spot vgd-power-offline";
  } else if (isAvailable) {
    spotClassName = "vgd-spot vgd-available";
  }

  return (
    <motion.div
      className={spotClassName}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {numberText}
      {isPowerOffline && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 90 90"
          preserveAspectRatio="none"
        >
          <line x1="10" y1="10" x2="80" y2="80" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" />
          <line x1="80" y1="10" x2="10" y2="80" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" />
        </svg>
      )}
    </motion.div>
  );
}

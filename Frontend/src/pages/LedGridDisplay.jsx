import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";

const styles = `
.lgd-container {
  width: 480px;
  height: 320px;
  background: #090235;
  color: white;
  font-family: sans-serif;
  overflow: hidden;
}

.lgd-loading {
  width: 480px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: black;
  color: white;
  font-size: 18px;
}

.lgd-sections-grid {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 4px;
}

.lgd-section-box {
  display: flex;
  flex-direction: column;
  background: #090224;
  border-radius: 6px;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.lgd-section-title {
  text-align: center;
  font-size: 22px;
  font-weight: 900;
  margin-bottom: 2px;
}

.lgd-spot-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(9, 1fr);
  gap: 2px;
}

.lgd-spot {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 900;
  border-radius: 4px;
}

.lgd-spot.lgd-available {
  background: #22c55e;
}

.lgd-spot.lgd-full {
  background: #dc2626;
}
`;

export default function LedGridDisplay() {
  const { id } = useParams();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  /* ------------------------------
     WEBSOCKET CONNECTION
  ------------------------------ */

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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = () => {
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
      if (wsRef.current) wsRef.current.close();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="lgd-loading">Initializing Display...</div>
      </>
    );
  }

  return (
    <div className="lgd-container">
      <style>{styles}</style>
      <div className="lgd-sections-grid">
        {sections.map((section) => (
          <SectionGrid key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------
   SECTION GRID
------------------------------ */

function SectionGrid({ section }) {
  return (
    <div className="lgd-section-box">
      <div className="lgd-section-title">{section.section_code}</div>

      <div className="lgd-spot-grid">
        {Array.from({ length: 18 }).map((_, i) => {
          const spot = section.spots[i];
          const isAvailable = spot && spot.status === "AVAILABLE";
          let numberText = "--";
          if (spot && spot.spot_code) {
            const parts = spot.spot_code.split("-");

            //numberText = spot.spot_code;
            numberText = parts.length > 1 ? parts[1] : spot.spot_code;
          }
          return (
            <motion.div
              key={spot ? spot.id : `${section.id}-${i}`}
              className={isAvailable ? "lgd-spot lgd-available" : "lgd-spot lgd-full"}
              layout
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.2,
              }}
            >
              {numberText}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

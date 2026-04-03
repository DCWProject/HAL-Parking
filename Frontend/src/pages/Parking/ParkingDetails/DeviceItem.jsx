import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Edit2,
  Check,
  X,
  Trash2,
  Bug,
  Terminal,
  Maximize2,
  Power,
  ChevronDown,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import api from "@/services/api";

export default function DeviceItem({
  device,
  isDetached,
  onRestart,
  onToggleDebug,
  onDetachLogs,
  onDelete,
  onResetSpots,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(
    device.name || device.device_uid,
  );
  const [isSavingName, setIsSavingName] = useState(false);

  // Local logs state (managed here instead of parent for performance/reliability)
  const [localLogs, setLocalLogs] = useState([]);
  const wsRef = useRef(null);

  // Initialize edited name when device changes
  useEffect(() => {
    setEditedName(device.name || device.device_uid);
  }, [device.name, device.device_uid]);

  // Auto-expand if debug mode is active AND not detached
  useEffect(() => {
    if (device.debug_mode && !isDetached) {
      setIsOpen(true);
    }
  }, [device.debug_mode, isDetached]);

  // Dedicated WebSocket for Logs
  useEffect(() => {
    // Only connect if debug mode is on AND (it's open OR detached)
    const shouldConnect = device.debug_mode && (isOpen || isDetached);

    if (shouldConnect) {
      if (wsRef.current) return; // Already connected

      const base = import.meta.env.VITE_API_BASE;
      let wsUrl;
      if (base.startsWith("https")) {
        wsUrl = base.replace("https", "wss");
      } else {
        wsUrl = base.replace("http", "ws");
      }
      const finalWsUrl = `${wsUrl}/ws/device_logs/${device.device_uid}/`;

      console.log(`Connecting to Device Logs WS: ${device.device_uid}`);
      const ws = new WebSocket(finalWsUrl);
      wsRef.current = ws;

      ws.onopen = () =>
        console.log(`Device Log WS Connected: ${device.device_uid}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "device_log") {
          const newLog = `[${data.timestamp.split("T")[1].split(".")[0]}] ${data.log}`;
          setLocalLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50
        }
      };

      ws.onclose = () => {
        console.log(`Device Log WS Disconnected: ${device.device_uid}`);
        wsRef.current = null;
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
        wsRef.current = null;
      };
    } else {
      // If shouldn't be connected, ensure we close
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [device.debug_mode, isOpen, isDetached, device.device_uid]);

  // Clear logs when debug turned off
  useEffect(() => {
    if (!device.debug_mode) {
      setLocalLogs([]);
    }
  }, [device.debug_mode]);

  const handleRestartClick = (e) => {
    e.stopPropagation();
    onRestart(); // Parent handles confirmation modal
  };

  const handleDebugToggle = (e) => {
    e.stopPropagation(); // prevent closing the accordion
    onToggleDebug(device.debug_mode);
  };

  return (
    <div className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden transition-all duration-200">
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative flex h-2 w-2 shrink-0`}>
            {device.is_online && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                device.is_online ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
          </div>
          {isEditingName ? (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-6 w-32 text-sm px-1 py-0.5 border rounded bg-background text-foreground"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsSavingName(true);
                  try {
                    await api.patch(`/devices/${device.id}/`, {
                      name: editedName,
                    });
                    setIsEditingName(false);
                    window.location.reload();
                  } catch (error) {
                    console.error("Failed to update name", error);
                  } finally {
                    setIsSavingName(false);
                  }
                }}
                disabled={isSavingName}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(false);
                  setEditedName(device.name || device.device_uid);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/name">
              <span
                className="font-mono text-sm font-bold text-foreground truncate max-w-[120px]"
                title={device.name || device.device_uid}
              >
                {device.name || device.device_uid}
              </span>
              <Edit2
                className="h-3 w-3 text-muted-foreground opacity-0 group-hover/name:opacity-100 hover:text-primary transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {!isOpen && (
            <div className="flex flex-col items-end text-[10px] text-muted-foreground leading-tight">
              {device.last_seen && (
                <span>
                  {new Date(device.last_seen).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 text-xs space-y-2 border-t border-border/50 bg-muted/10">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Seen</span>
                <span className="text-foreground/80">
                  {device.last_seen
                    ? new Date(device.last_seen).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Never"}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-muted-foreground">IP Address</span>
                <span className="font-mono text-foreground/80">
                  {device.ip_address}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mac Address</span>
                <span className="text-foreground/80 font-mono">
                  {device.mac_address || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sections</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {device.sections && device.sections.length > 0 ? (
                    device.sections.map((section, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-foreground/80"
                      >
                        {section}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic">None</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Nodes</span>
                <span className="text-foreground/80">
                  {device.active_sensor_nodes} / {device.no_of_sensor_nodes}
                </span>
              </div>

              {/* Debug Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Bug className="h-3 w-3" />
                  <span>Debug Mode</span>
                </div>
                {device.is_online ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={!!device.debug_mode}
                      onCheckedChange={(checked) =>
                        onToggleDebug(device.debug_mode)
                      }
                      className="scale-75 origin-right"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>{device.debug_mode ? "ON" : "OFF"}</span>
                  </div>
                )}
              </div>

              {/* Live Logs Console */}
              {device.debug_mode &&
                (isDetached ? (
                  <div className="mt-2 p-2 bg-muted/20 border border-green-500/20 rounded text-xs text-center text-muted-foreground italic flex flex-col gap-2">
                    <span>Logs popped out in separate window</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px]"
                      onClick={onDetachLogs}
                    >
                      Open Console
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] w-full bg-black rounded p-2 text-green-400 font-mono h-32 overflow-y-auto relative group">
                    <div className="flex items-center justify-between border-b border-green-900 pb-1 mb-1 text-green-600">
                      <div className="flex items-center gap-1">
                        <Terminal className="h-3 w-3" />
                        <span>Live Logs</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDetachLogs();
                        }}
                        className="hover:text-green-400 transition-colors"
                        title="Pop out console"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </button>
                    </div>
                    {localLogs.length === 0 ? (
                      <span className="text-gray-500 italic">
                        Waiting for logs...
                      </span>
                    ) : (
                      localLogs.map((log, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                ))}

              {device.is_online && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs gap-2"
                  onClick={handleRestartClick}
                >
                  <Power className="h-3 w-3" />
                  Restart Device
                </Button>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Device</span>
                </Button>
                {!device.is_online && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetSpots();
                    }}
                    title="Reset all spots to AVAILABLE"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    <span>Reset Spots</span>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2,
  Check,
  X,
  Trash2,
  ChevronDown,
  RefreshCcw,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

export default function DeviceItem({
  device,
  onRestart,
  onDelete,
  onResetSpots,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(device.name || device.device_uid);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    setEditedName(device.name || device.device_uid);
  }, [device.name, device.device_uid]);

  const handleRestartClick = (e) => {
    e.stopPropagation();
    onRestart();
  };

  return (
    <div className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden transition-all duration-200">
      {/* Header Row */}
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Online indicator */}
          <div className="relative flex h-2 w-2 shrink-0">
            {device.is_online && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                device.is_online ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>

          {/* Name / Edit */}
          {isEditingName ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                disabled={isSavingName}
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsSavingName(true);
                  try {
                    await api.patch(`/devices/${device.id}/`, { name: editedName });
                    setIsEditingName(false);
                    window.location.reload();
                  } catch (err) {
                    console.error("Failed to update name", err);
                  } finally {
                    setIsSavingName(false);
                  }
                }}
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
                className="h-3 w-3 text-muted-foreground opacity-0 group-hover/name:opacity-100 hover:text-primary transition-opacity cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {!isOpen && device.last_seen && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(device.last_seen).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Expanded Details */}
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

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">IP Address</span>
                <span className="font-mono text-foreground/80">{device.ip_address}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mac Address</span>
                <span className="font-mono text-foreground/80">{device.mac_address || "N/A"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sections</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {device.sections?.length > 0 ? (
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

              {/* Restart */}
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

              {/* Footer Actions */}
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
                  Delete Device
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
                    Reset Spots
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
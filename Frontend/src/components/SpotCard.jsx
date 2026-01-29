import { Car, AlertCircle } from "lucide-react";

export default function SpotCard({ spot }) {
  const status = spot.status || "OFFLINE";
  const isOccupied = status === "OCCUPIED";
  const isOffline = status === "OFFLINE";
  // const isAvailable = status === "AVAILABLE";

  // Determine status color/style
  let statusColor = "text-green-500";
  let borderColor = "border-green-500/30";
  let bgGradient = "from-green-500/10 to-transparent";
  // Subtle colored glow for modern look
  let glowClass =
    "shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:shadow-[0_0_25px_rgba(34,197,94,0.3)]";
  let Icon = Car;

  if (isOffline) {
    statusColor = "text-gray-400";
    borderColor = "border-gray-500/30";
    bgGradient = "from-gray-500/10 to-transparent";
    glowClass = "hover:shadow-[0_0_15px_rgba(156,163,175,0.2)]"; // Less glow for offline
    Icon = AlertCircle;
  } else if (isOccupied) {
    statusColor = "text-red-500";
    borderColor = "border-red-500/30";
    bgGradient = "from-red-500/10 to-transparent";
    glowClass =
      "shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]";
  }

  return (
    <div
      className={`relative group flex flex-col items-center justify-center p-4 rounded-xl border bg-gradient-to-br transition-all duration-300 ${borderColor} ${bgGradient} ${glowClass} hover:-translate-y-1 bg-card/60 backdrop-blur-sm cursor-default`}
    >
      {/* Status indicator dot */}
      <div
        className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
          isOffline
            ? "bg-gray-400"
            : isOccupied
            ? "bg-red-500"
            : "bg-green-500 animate-pulse"
        }`}
      />

      <div
        className={`mb-3 p-3 rounded-full bg-background/80 border border-white/5 shadow-inner ${statusColor} transition-colors duration-300 group-hover:bg-background`}
      >
        <Icon
          size={24}
          className="transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      <h3 className="text-lg font-bold text-foreground tracking-wide group-hover:text-primary transition-colors">
        {spot.spot_code}
      </h3>

      <p
        className={`text-[10px] uppercase font-bold mt-1 tracking-wider ${statusColor}`}
      >
        {isOffline ? "Offline" : isOccupied ? "Occupied" : "Available"}
      </p>

      {/* Hover glow effect overlay */}
      <div
        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none ${
          isOffline
            ? "bg-gray-400/5"
            : isOccupied
            ? "bg-red-500/5"
            : "bg-green-500/5"
        }`}
      />
    </div>
  );
}

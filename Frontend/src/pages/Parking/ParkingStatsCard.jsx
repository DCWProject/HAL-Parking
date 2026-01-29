import { Card, CardContent } from "@/components/ui/card";
import { Car, Activity, Info } from "lucide-react";

function GradientWrapper({ className, children }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        ${className}
        shadow-md hover:shadow-xl
        transition-all duration-300 hover:scale-[1.02]
      `}
    >
      <div className="absolute inset-0 bg-white/10 dark:bg-white/5" />
      {children}
    </div>
  );
}

export default function ParkingStatsCards({
  totalSpots = 0,
  occupiedSpots = 0,
  availableSpots = 0,
  allSpots = [],
}) {
  const offlineCount = allSpots.filter((s) => s.status === "OFFLINE").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
      {/* TOTAL SPOTS */}
      <GradientWrapper
        className="
          bg-gradient-to-r
          from-indigo-500 via-violet-500 to-purple-600
          dark:from-indigo-950 dark:via-violet-900 dark:to-purple-900
        "
      >
        <Card className="bg-transparent border-0 text-white">
          <CardContent className="relative z-10 p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-white/80">Total Spots</p>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                {totalSpots}
              </div>
              <p className="text-xs text-white/60 font-medium mt-1">
                Across all bays
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/25 dark:bg-white/10 backdrop-blur-md ring-1 ring-white/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </GradientWrapper>

      {/* OCCUPIED */}
      <GradientWrapper
        className="
          bg-gradient-to-r
          from-rose-500 via-red-500 to-red-600
          dark:from-rose-950 dark:via-red-900 dark:to-red-950
        "
      >
        <Card className="bg-transparent border-0 text-white">
          <CardContent className="relative z-10 p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-white/80">Occupied</p>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                {occupiedSpots}
              </div>
              <p className="text-xs text-white/60 font-medium mt-1">
                {totalSpots > 0
                  ? ((occupiedSpots / totalSpots) * 100).toFixed(0)
                  : 0}
                % capacity
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/25 dark:bg-white/10 backdrop-blur-md ring-1 ring-white/20">
              <Car size={24} strokeWidth={2.5} />
            </div>
          </CardContent>
        </Card>
      </GradientWrapper>

      {/* AVAILABLE */}
      <GradientWrapper
        className="
          bg-gradient-to-r
          from-emerald-500 via-teal-500 to-cyan-600
          dark:from-emerald-950 dark:via-teal-900 dark:to-cyan-950
        "
      >
        <Card className="bg-transparent border-0 text-white">
          <CardContent className="relative z-10 p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-white/80">Available</p>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                {availableSpots}
              </div>
              <p className="text-xs text-white/60 font-medium mt-1">
                Ready for parking
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/25 dark:bg-white/10 backdrop-blur-md ring-1 ring-white/20">
              <Activity size={24} strokeWidth={2.5} />
            </div>
          </CardContent>
        </Card>
      </GradientWrapper>

      {/* OFFLINE */}
      <GradientWrapper
        className="
          bg-gradient-to-br
          from-slate-500 via-slate-600 to-zinc-700
          dark:from-slate-900 dark:via-slate-800 dark:to-zinc-900
        "
      >
        <Card className="bg-transparent border-0 text-white">
          <CardContent className="relative z-10 p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-white/80">Offline</p>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                {offlineCount}
              </div>
              <p className="text-xs text-white/60 font-medium mt-1">
                Maintenance required
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/25 dark:bg-white/10 backdrop-blur-md ring-1 ring-white/20">
              <Info size={24} strokeWidth={2.5} />
            </div>
          </CardContent>
        </Card>
      </GradientWrapper>
    </div>
  );
}

import { Link, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useParking } from "@/context/ParkingContext";

export default function ParkingAreaList() {
  const { areas, loading } = useParking();
  const location = useLocation();

  if (loading)
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md bg-muted/50" />
        ))}
      </div>
    );

  if (areas.length === 0) return null;

  return (
    <div className="flex flex-col space-y-1">
      {areas.map((area) => (
        <Link
          key={area.id}
          to={`/parking/${area.id}`}
          className={cn(
            "text-sm px-3 py-2 rounded-lg transition-colors truncate hover:bg-muted/80 flex items-center gap-2",
            location.pathname.includes(`/parking/${area.id}`)
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              location.pathname.includes(`/parking/${area.id}`)
                ? "bg-primary"
                : "bg-muted-foreground/40"
            )}
          />
          {area.name}
        </Link>
      ))}
    </div>
  );
}

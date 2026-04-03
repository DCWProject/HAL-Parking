import { Link } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ParkingHeader({ parkingArea }) {
  if (!parkingArea) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/parking">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {parkingArea.name}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
              Code: {parkingArea.area_code}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
              Max Capacity: {parkingArea.total_spots}
            </span>
          </div>
        </div>
      </div>
      <Link to={`/parking/${parkingArea.id}/manage`}>
        <Button className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Parking
        </Button>
      </Link>
    </div>
  );
}

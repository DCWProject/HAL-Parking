import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { MapPin, ChevronRight } from "lucide-react";

export default function Dashboard() {
  const [parkingAreas, setParkingAreas] = useState([]);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await api.get("/parking-areas/");
      setParkingAreas(res.data.data);
    } catch (err) {
      console.error("Failed to fetch areas", err);
    }
  };

  if (parkingAreas.length === 0)
    return <div className="p-10 text-muted-foreground">Loading Areas...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Select Parking Area</h2>
        <p className="text-sm text-muted-foreground">
          Click an area to view its live dashboard
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {parkingAreas.map((area) => (
          <Link
            key={area.id}
            to={`/parking/${area.id}`}
            className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md hover:bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="font-medium text-sm">{area.name}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
          </Link>
        ))}
      </div>
    </div>
  );
}
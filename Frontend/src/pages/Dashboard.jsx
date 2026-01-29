import { useState, useEffect } from "react";
import api from "@/services/api";
import SpotCard from "@/components/SpotCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Car, AlertCircle, WifiOff } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [parkingAreas, setParkingAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [bays, setBays] = useState([]);
  const [spots, setSpots] = useState([]); // Flat list of all spots in current view or nested
  const [stats, setStats] = useState({
    total: 0,
    occupied: 0,
    available: 0,
    offline: 0,
  });

  // Initial Fetch
  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    if (selectedAreaId) {
      fetchDetails(selectedAreaId);
    }
  }, [selectedAreaId]);

  // WebSocket Connection
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/parking"); // Ideally env var

    ws.onopen = () => {
      console.log("Connected to WebSocket");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    return () => {
      ws.close();
    };
  }, [selectedAreaId]); // Reconnect if needed or just one global connection? Global is better usually.
  // Actually the websocket is global for the app usually. But here is fine.

  const handleWebSocketMessage = (msg) => {
    if (msg.type === "spot_update") {
      // data: list of { spot_code, status }
      // Update spots state
      setSpots((prevSpots) => {
        const newSpots = [...prevSpots];
        msg.data.forEach((update) => {
          const index = newSpots.findIndex(
            (s) => s.spot_code === update.spot_code
          );
          if (index !== -1) {
            newSpots[index] = {
              ...newSpots[index],
              status: update.status,
            };
          }
        });
        return newSpots;
      });
    } else if (msg.type === "device_offline") {
      // Refresh all data to be safe or mark related spots offline
      if (selectedAreaId) fetchDetails(selectedAreaId);
    }
  };

  useEffect(() => {
    // Recalculate stats whenever spots change
    const total = spots.length;
    const offline = spots.filter((s) => s.status === "OFFLINE").length;
    const occupied = spots.filter((s) => s.status === "OCCUPIED").length;
    const available = spots.filter((s) => s.status === "AVAILABLE").length;
    setStats({ total, occupied, available, offline });
  }, [spots]);

  const fetchAreas = async () => {
    try {
      const res = await api.get("/parking-areas/");
      setParkingAreas(res.data.data);
      if (res.data.data.length > 0) setSelectedAreaId(res.data.data[0].id);
    } catch (err) {
      console.error("Failed to fetch areas", err);
    }
  };

  const fetchDetails = async (areaId) => {
    try {
      // Fetch sections for the area
      const sectionRes = await api.get(`/sections/by-area/${areaId}`);
      setBays(sectionRes.data.data);

      // Fetch spots for all sections
      // (Inefficient N+1 but API is setup that way, create a bulk endpoint later if needed)
      // Actually let's just fetch spots for each section and combine
      let allSpots = [];
      for (const section of sectionRes.data.data) {
        const spotRes = await api.get(`/spots/by-section/${section.id}`);
        allSpots = [...allSpots, ...spotRes.data.data];
      }
      setSpots(allSpots);
    } catch (err) {
      console.error("Failed to fetch details", err);
    }
  };

  if (parkingAreas.length === 0)
    return <div className="p-10">Loading Areas...</div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spots</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.available}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.occupied}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {stats.offline}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Areas */}
      {parkingAreas.length > 0 && selectedAreaId && (
        <Tabs
          defaultValue={String(selectedAreaId)}
          onValueChange={(val) => setSelectedAreaId(parseInt(val))}
          className="w-full"
        >
          <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-transparent">
            {parkingAreas.map((area) => (
              <TabsTrigger
                key={area.id}
                value={String(area.id)}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {area.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Bays & Spots Grid */}
      <div className="space-y-8">
        {bays.map((bay) => {
          const baySpots = spots.filter((s) => s.section_id === bay.id);
          if (baySpots.length === 0) return null;

          return (
            <div key={bay.id}>
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Bay {bay.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {baySpots.map((spot) => (
                  <SpotCard key={spot.id} spot={spot} />
                ))}
              </div>
            </div>
          );
        })}
        {bays.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            No bays found in this area.
          </div>
        )}
      </div>
    </div>
  );
}

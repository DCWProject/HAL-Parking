import { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/api";

const ParkingContext = createContext();

export function ParkingProvider({ children }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAreas = async () => {
    try {
      const res = await api.get("/parking-areas/minimal/");
      setAreas(res.data.data);
    } catch (err) {
      console.error("Failed to load areas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  return (
    <ParkingContext.Provider
      value={{ areas, loading, refreshAreas: fetchAreas }}
    >
      {children}
    </ParkingContext.Provider>
  );
}

export const useParking = () => useContext(ParkingContext);

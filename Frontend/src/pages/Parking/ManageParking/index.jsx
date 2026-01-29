import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AreaHeader from "./components/AreaHeader";
import SectionList from "./components/SectionList";
import api from "@/services/api";

export default function ManageParking() {
  const { id } = useParams();
  const [parkingArea, setParkingArea] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // setLoading(true); // Don't reset loading on every refresh to avoid flicker
      const res = await api.get(`/parking-areas/${id}`);
      setParkingArea(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [id]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  if (!parkingArea) return <div>Not Found</div>;

  return (
    <div className="flex flex-col">
      <AreaHeader parkingArea={parkingArea} onRefresh={fetchData} />

      <SectionList
        sections={parkingArea.sections || []}
        areaId={parkingArea.id}
        loading={false}
        onUpdate={fetchData}
        parkingArea={parkingArea}
      />
    </div>
  );
}

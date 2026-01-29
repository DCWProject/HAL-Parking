import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditSpotDialog from "./EditSpotDialog";
import api from "@/services/api";

export default function SpotItem({ spot, onRefresh }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete spot ${spot.spot_code}?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/spots/${spot.id}`);
      onRefresh();
    } catch (error) {
      console.error(error);
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-2 rounded-md bg-background/50 border hover:border-primary/50 transition-colors group">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{spot.spot_code}</div>
          {spot.status === "OCCUPIED" && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditOpen(true)}
            title="Edit Spot"
          >
            <Edit2 size={10} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-600"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete Spot"
          >
            <Trash2 size={10} />
          </Button>
        </div>
      </div>
      <EditSpotDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        spot={spot}
        onSuccess={onRefresh}
      />
    </>
  );
}

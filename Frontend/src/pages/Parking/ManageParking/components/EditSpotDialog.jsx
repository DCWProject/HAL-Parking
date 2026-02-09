import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

export default function EditSpotDialog({ isOpen, onClose, spot, onSuccess }) {
  const [spotCode, setSpotCode] = useState("");
  const [minDist, setMinDist] = useState(50);
  const [maxDist, setMaxDist] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && spot) {
      setSpotCode(spot.spot_code || "");
      if (spot.min_dist) setMinDist(spot.min_dist);
      if (spot.max_dist) setMaxDist(spot.max_dist);
    }
  }, [spot, isOpen]);

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!spotCode) return;
    
    if (parseInt(minDist) >= parseInt(maxDist)) {
        setError("Min distance must be less than Max distance");
        return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.put(`/spots/${spot.id}/`, {
        spot_code: spotCode,
        min_dist: parseInt(minDist),
        max_dist: parseInt(maxDist),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      if (error.response?.data?.details) {
         setError(error.response.data.details[0] || "Failed to update spot"); 
      } else {
         setError("Failed to update spot");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Spot Code">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
        )}
        <div className="space-y-2">
          <Label>Spot Code</Label>
          <Input
            value={spotCode}
            onChange={(e) => setSpotCode(e.target.value)}
            autoFocus
            className="bg-background text-foreground"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label>Min Dist (cm)</Label>
            <Input
              type="number"
              value={minDist}
              onChange={(e) => setMinDist(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>Max Dist (cm)</Label>
            <Input
              type="number"
              value={maxDist}
              onChange={(e) => setMaxDist(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

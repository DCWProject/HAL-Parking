import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

export default function EditSpotDialog({ isOpen, onClose, spot, onSuccess }) {
  const [spotCode, setSpotCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && spot) {
      setSpotCode(spot.spot_code || "");
    }
  }, [spot, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!spotCode) return;
    setSubmitting(true);
    try {
      await api.put(`/spots/${spot.id}`, { spot_code: spotCode });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Spot Code">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Spot Code</Label>
          <Input
            value={spotCode}
            onChange={(e) => setSpotCode(e.target.value)}
            autoFocus
            className="bg-background text-foreground"
          />
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

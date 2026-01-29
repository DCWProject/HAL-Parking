import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";
import { useParking } from "@/context/ParkingContext";

export default function EditAreaDialog({
  isOpen,
  onClose,
  parkingArea,
  onSuccess,
}) {
  const [name, setName] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [description, setDescription] = useState("");
  const [totalSections, setTotalSections] = useState("");
  const [totalSpots, setTotalSpots] = useState("");
  const [displayHeight, setDisplayHeight] = useState("");
  const [displayWidth, setDisplayWidth] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const { refreshAreas } = useParking();

  useEffect(() => {
    if (isOpen && parkingArea) {
      setName(parkingArea.name || "");
      setAreaCode(parkingArea.area_code || "");
      setDescription(parkingArea.description || "");
      setTotalSections(parkingArea.total_sections || 0);
      setTotalSpots(parkingArea.total_spots || 0);
      setDisplayHeight(parkingArea.display_height || "");
      setDisplayWidth(parkingArea.display_width || "");
      setError(null);
    }
  }, [parkingArea, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/parking-areas/${parkingArea.id}`, {
        name,
        area_code: areaCode,
        description,
        total_sections: parseInt(totalSections),
        total_spots: parseInt(totalSpots),
        display_height: parseInt(displayHeight),
        display_width: parseInt(displayWidth),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      if (error.response?.data?.errors?.total_sections) {
        setError(error.response.data.errors.total_sections.join(", "));
      } else if (error.response?.data?.errors?.area_code) {
        setError(error.response.data.errors.area_code.join(", "));
      } else if (error.response?.data?.errors?.total_spots) {
        setError(error.response.data.errors.total_spots.join(", "));
      } else if (error.response?.data?.errors?.display_height) {
        setError(error.response.data.errors.display_height.join(", "));
      } else if (error.response?.data?.errors?.display_width) {
        setError(error.response.data.errors.display_width.join(", "));
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Failed to update area");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/parking-areas/${parkingArea.id}`);
      await refreshAreas();
      setShowDeleteConfirm(false);
      onClose();
      navigate("/dashboard"); // Redirect to dashboard or list
    } catch (error) {
      console.error("Failed to delete area", error);
      // Optional: show error in delete dialog or main dialog
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Area Details">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>
              Area Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              autoFocus
              className="bg-background text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Area Code <span className="text-red-500">*</span>
            </Label>
            <Input
              value={areaCode}
              onChange={(e) => {
                setAreaCode(e.target.value.toUpperCase());
                setError(null);
              }}
              className="bg-background text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Description{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (Optional)
              </span>
            </Label>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
              className="bg-background text-foreground"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Total Sections <span className="text-red-500">*</span>
              </Label>
              <Input
                value={totalSections}
                type="number"
                min="2"
                max="6"
                onChange={(e) => {
                  setTotalSections(e.target.value);
                  setError(null);
                }}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Total Spots <span className="text-red-500">*</span>
              </Label>
              <Input
                value={totalSpots}
                type="number"
                min="4"
                onChange={(e) => {
                  setTotalSpots(e.target.value);
                  setError(null);
                }}
                className="bg-background text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Display Height (inches) <span className="text-red-500">*</span>
              </Label>
              <Input
                value={displayHeight}
                type="number"
                onChange={(e) => {
                  setDisplayHeight(e.target.value);
                  setError(null);
                }}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Display Width (inches) <span className="text-red-500">*</span>
              </Label>
              <Input
                value={displayWidth}
                type="number"
                onChange={(e) => {
                  setDisplayWidth(e.target.value);
                  setError(null);
                }}
                className="bg-background text-foreground"
              />
            </div>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="destructive"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 border-none shadow-none"
            >
              <Trash2 className="h-4 w-4" />
              Delete Area
            </Button>
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
          </div>
        </form>
      </Modal>

      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Parking Area"
        description={`Are you sure you want to delete "${parkingArea?.name}"? All associated sections, spots, and devices will be permanently removed.`}
        loading={deleting}
      />
    </>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X } from "lucide-react";
import api from "@/services/api";

export default function BulkAddSpotDialog({
  isOpen,
  onClose,
  section,
  onSuccess,
  totalAreaSpots,
  currentAreaSpotCount,
}) {
  const [spotNumbers, setSpotNumbers] = useState([
    { spot_number: "", min_dist: 50, max_dist: 100 },
  ]);
  const [minDist, setMinDist] = useState(50);
  const [maxDist, setMaxDist] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  const sectionCode = section?.section_code || section?.name?.charAt(0) || "S";

  const addSpotField = () => {
    setSpotNumbers([
      ...spotNumbers,
      { spot_number: "", min_dist: minDist, max_dist: maxDist },
    ]);
  };

  const removeSpotField = (index) => {
    if (spotNumbers.length > 1) {
      setSpotNumbers(spotNumbers.filter((_, i) => i !== index));
    }
  };

  const updateSpotChange = (index, name, value) => {
    const newSpots = [...spotNumbers];
    newSpots[index] = { ...newSpots[index], [name]: value };
    setSpotNumbers(newSpots);

    // Clear errors when user types
    if (errors[`${name}_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${name}_${index}`];
      setErrors(newErrors);
    }
  };

  const validateSpots = () => {
    const newErrors = {};
    const seen = new Set();

    spotNumbers.forEach((item, index) => {
      const num = item.spot_number;
      const min = parseInt(item.min_dist);
      const max = parseInt(item.max_dist);
      const trimmed = num.trim();

      // Check if empty
      if (!trimmed) {
        newErrors[`spot_number_${index}`] = "Spot number is required";
      }

      // Check for duplicates
      const fullCode = `${sectionCode}-${trimmed}`;
      if (seen.has(fullCode)) {
        newErrors[`spot_number_${index}`] = "Duplicate spot number";
      }
      seen.add(fullCode);

      // Min < Max validation
      if (min >= max) {
        newErrors[`min_dist_${index}`] = "Min must be < Max";
      }
    });

    // Check total spot count
    const validSpots = spotNumbers.filter((n) => n.spot_number.trim()).length;
    if (totalAreaSpots && currentAreaSpotCount + validSpots > totalAreaSpots) {
      newErrors.general = `Cannot exceed total area capacity of ${totalAreaSpots} spots. Current: ${currentAreaSpotCount}, Adding: ${validSpots}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateSpots()) {
      return;
    }

    setSubmitting(true);
    setGeneralError("");

    try {
      const validSpots = spotNumbers.filter((item) => item.spot_number.trim());
      const payload = validSpots.map((item) => ({
        spot_code: `${sectionCode}-${item.spot_number.trim()}`,
        min_dist: parseInt(item.min_dist),
        max_dist: parseInt(item.max_dist),
      }));

      // Use the new bulk create endpoint format
      await api.post("/spots/bulk/", {
        section: section.id,
        spots: payload,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error(error);

      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        if (backendErrors.non_field_errors) {
          setGeneralError(backendErrors.non_field_errors.join(", "));
        }
      } else if (error.response?.data?.message) {
        setGeneralError(error.response.data.message);
      } else {
        setGeneralError("Failed to create spots. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSpotNumbers([{ spot_number: "", min_dist: 50, max_dist: 100 }]);
    setErrors({});
    setGeneralError("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add Spots to ${section?.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {/* General Error */}
        {(generalError || errors.general) && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
            {generalError || errors.general}
          </div>
        )}

        {/* Distance Config (Applies to next added spots) */}
        <div className="flex gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">
              Default Min Distance (cm)
            </label>
            <Input
              type="number"
              value={minDist}
              onChange={(e) => setMinDist(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">
              Default Max Distance (cm)
            </label>
            <Input
              type="number"
              value={maxDist}
              onChange={(e) => setMaxDist(e.target.value)}
            />
          </div>
        </div>
        {/* Spot Number Inputs with Inline Min/Max */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
          {/* Section Code Display */}
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              Section Code:{" "}
              <span className="font-semibold text-foreground">
                {sectionCode}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Spots will be created as: {sectionCode}-01, {sectionCode}-02, etc.
            </p>
          </div>
          {spotNumbers.map((item, index) => (
            <div
              key={index}
              className="space-y-3 px-2 border-b pb-4 last:border-0"
            >
              <div className="flex gap-3 items-start">
                {/* Input Group with Styled Prefix */}
                <div className="flex-1 group space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Spot Number
                  </label>
                  <div className="relative">
                    {/* Styled Section Code Badge */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                        {sectionCode}
                        {item.spot_number.trim() &&
                          `-${item.spot_number.trim()}`}
                      </span>
                    </div>

                    {/* Input Field */}
                    <Input
                      id={`spot-${index}`}
                      placeholder="01"
                      value={item.spot_number}
                      autoFocus={index === spotNumbers.length - 1}
                      onChange={(e) =>
                        updateSpotChange(index, "spot_number", e.target.value)
                      }
                      className={`pr-3 ${
                        errors[`spot_number_${index}`]
                          ? "focus-visible:ring-destructive"
                          : ""
                      }`}
                    />
                  </div>
                  {/* Error Message */}
                  {errors[`spot_number_${index}`] && (
                    <p className="text-xs text-destructive pl-1">
                      {errors[`spot_number_${index}`]}
                    </p>
                  )}
                </div>

                {/* Min Dist */}
                <div className="w-24 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Min (cm)
                  </label>
                  <Input
                    type="number"
                    value={item.min_dist}
                    onChange={(e) =>
                      updateSpotChange(index, "min_dist", e.target.value)
                    }
                    className={`${
                      errors[`min_dist_${index}`]
                        ? "focus-visible:ring-destructive border-destructive"
                        : ""
                    }`}
                  />
                </div>

                {/* Max Dist */}
                <div className="w-24 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Max (cm)
                  </label>
                  <Input
                    type="number"
                    value={item.max_dist}
                    onChange={(e) =>
                      updateSpotChange(index, "max_dist", e.target.value)
                    }
                  />
                </div>

                {/* Remove Button */}
                <div className="pt-6">
                  {spotNumbers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSpotField(index)}
                      className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add More Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addSpotField}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Another Spot
        </Button>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[100px]">
            {submitting ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              `Create ${
                spotNumbers.filter((n) => n.spot_number.trim()).length
              } Spot${
                spotNumbers.filter((n) => n.spot_number.trim()).length !== 1
                  ? "s"
                  : ""
              }`
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

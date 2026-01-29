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
  const [spotNumbers, setSpotNumbers] = useState([""]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  const sectionCode = section?.section_code || section?.name?.charAt(0) || "S";

  const addSpotField = () => {
    setSpotNumbers([...spotNumbers, ""]);
  };

  const removeSpotField = (index) => {
    if (spotNumbers.length > 1) {
      setSpotNumbers(spotNumbers.filter((_, i) => i !== index));
    }
  };

  const updateSpotNumber = (index, value) => {
    const newSpots = [...spotNumbers];
    newSpots[index] = value;
    setSpotNumbers(newSpots);

    // Clear errors when user types
    if (errors[`spot_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`spot_${index}`];
      setErrors(newErrors);
    }
  };

  const validateSpots = () => {
    const newErrors = {};
    const seen = new Set();

    spotNumbers.forEach((num, index) => {
      const trimmed = num.trim();

      // Check if empty
      if (!trimmed) {
        newErrors[`spot_${index}`] = "Spot number is required";
        return;
      }

      // Check for duplicates
      const fullCode = `${sectionCode}-${trimmed}`;
      if (seen.has(fullCode)) {
        newErrors[`spot_${index}`] = "Duplicate spot number";
      }
      seen.add(fullCode);
    });

    // Check total spot count
    const validSpots = spotNumbers.filter((n) => n.trim()).length;
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
      const validSpots = spotNumbers.filter((n) => n.trim());
      const spotCodes = validSpots.map((num) => `${sectionCode}-${num.trim()}`);

      // Use the new bulk create endpoint
      await api.post("/spots/bulk", {
        section_id: section.id,
        spot_codes: spotCodes,
      });

      onSuccess();
      onClose();
      setSpotNumbers([""]);
      setErrors({});
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
    setSpotNumbers([""]);
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

        {/* Section Code Display */}
        <div className="bg-muted/50 border border-border rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            Section Code:{" "}
            <span className="font-semibold text-foreground">{sectionCode}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Spots will be created as: {sectionCode}-01, {sectionCode}-02, etc.
          </p>
        </div>

        {/* Spot Number Inputs */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
          {spotNumbers.map((num, index) => (
            <div key={index} className="space-y-3 px-2">
              <div className="flex gap-3 items-center">
                {/* Input Group with Styled Prefix */}
                <div className="flex-1 group">
                  <div className="relative">
                    {/* Styled Section Code Badge */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                        {sectionCode}
                        {num.trim() && `-${num.trim()}`}
                      </span>
                    </div>

                    {/* Input Field */}
                    <Input
                      id={`spot-${index}`}
                      placeholder="e.g. 01"
                      value={num}
                      autoFocus={index === spotNumbers.length - 1}
                      onChange={(e) => updateSpotNumber(index, e.target.value)}
                      className={`pr-3 ${
                        errors[`spot_${index}`]
                          ? "focus-visible:ring-destructive"
                          : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Remove Button */}
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

              {/* Error Message */}
              {errors[`spot_${index}`] && (
                <p className="text-sm text-destructive pl-1">
                  {errors[`spot_${index}`]}
                </p>
              )}
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
              `Create ${spotNumbers.filter((n) => n.trim()).length} Spot${
                spotNumbers.filter((n) => n.trim()).length !== 1 ? "s" : ""
              }`
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

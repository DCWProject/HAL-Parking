import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import Modal from "@/components/ui/modal";
import { Plus } from "lucide-react";

export default function AddSectionDialog({ areaId, onSectionAdded }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sectionCode, setSectionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setName("");
      setSectionCode("");
      setErrors({});
      setGeneralError("");
    }
  }, [open]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setGeneralError("");
    try {
      await api.post("/sections/", {
        name,
        section_code: sectionCode,
        parking_area_id: areaId,
      });
      onSectionAdded();
      setOpen(false);
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        if (backendErrors.non_field_errors) {
          setGeneralError(backendErrors.non_field_errors.join(", "));
        }
        const fieldErrors = {};
        Object.keys(backendErrors).forEach((key) => {
          if (key !== "non_field_errors") {
            fieldErrors[key] = backendErrors[key].join(", ");
          }
        });
        setErrors(fieldErrors);
      } else if (error.response?.data?.message) {
        setGeneralError(error.response.data.message);
      } else {
        setGeneralError("Failed to create section. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 transform hover:-translate-y-0.5"
        size="lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-5 w-5" />
        Create Section
      </Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add New Section"
      >
        <div className="grid gap-4 py-4">
          {generalError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded-md text-sm">
              {generalError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="section-name">Name</Label>
            <Input
              id="section-name"
              placeholder="e.g. Sec-A"
              value={name}
              autoFocus={true}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  name: "",
                }));
              }}
            />
            {errors.name && (
              <div className="text-destructive text-sm">{errors.name}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-code">Code</Label>
            <Input
              id="section-code"
              placeholder="e.g. A"
              value={sectionCode}
              onChange={(e) => {
                setSectionCode(e.target.value.toUpperCase());
                setErrors((prev) => ({
                  ...prev,
                  section_code: "",
                }));
              }}
            />
            {errors.section_code && (
              <div className="text-destructive text-sm">
                {errors.section_code}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading}>
            {loading ? "Adding..." : "Add Section"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

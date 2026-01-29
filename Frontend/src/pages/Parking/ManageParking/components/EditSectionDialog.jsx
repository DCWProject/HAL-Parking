import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import Modal from "@/components/ui/modal";
import { Pencil } from "lucide-react";

export default function EditSectionDialog({
  section,
  onSectionUpdated,
  customOpen,
  setCustomOpen,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = customOpen !== undefined;
  const open = isControlled ? customOpen : internalOpen;
  const setOpen = isControlled ? setCustomOpen : setInternalOpen;

  const [name, setName] = useState(section?.name || "");
  const [sectionCode, setSectionCode] = useState(section?.section_code || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  useEffect(() => {
    if (open && section) {
      setName(section.name);
      setSectionCode(section.section_code || "");
      setErrors({});
      setGeneralError("");
    }
  }, [open, section]);

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setGeneralError("");
    try {
      await api.put(`/sections/${section.id}`, {
        name,
        section_code: sectionCode,
      });
      onSectionUpdated();
      setOpen(false);
    } catch (error) {
      console.error("Failed to update section", error);
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
        setGeneralError("Failed to update section. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isControlled && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
        >
          <Pencil size={14} />
        </Button>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit Section">
        <div className="grid gap-4 py-4">
          {generalError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded-md text-sm">
              {generalError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-section-name">Name</Label>
            <Input
              id="edit-section-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-section-code">Code</Label>
            <Input
              id="edit-section-code"
              value={sectionCode}
              onChange={(e) => {
                setSectionCode(e.target.value.toUpperCase());
                setErrors((prev) => ({ ...prev, section_code: "" }));
              }}
              placeholder="e.g. A"
            />
            {errors.section_code && (
              <p className="text-sm text-destructive">{errors.section_code}</p>
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
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import { useParking } from "@/context/ParkingContext";

export default function ParkingList() {
  const [parkingAreas, setParkingAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    area_code: "",
    description: "",
    total_spots: "",
    total_sections: "",
    display_height: "",
    display_width: "",
  });
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  useEffect(() => {
    fetchParkingAreas();
  }, []);

  const fetchParkingAreas = async () => {
    try {
      const res = await api.get("/parking-areas/");
      setParkingAreas(res.data.data);
    } catch (error) {
      console.error("Failed to fetch parking areas", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setCreating(true);
    setErrors({});
    setGeneralError("");

    try {
      const payload = {
        name: formData.name,
        area_code: formData.area_code,
        total_spots: formData.total_spots
          ? parseInt(formData.total_spots)
          : undefined,
        display_height: formData.display_height
          ? parseInt(formData.display_height)
          : undefined,
        display_width: formData.display_width
          ? parseInt(formData.display_width)
          : undefined,
        total_sections: formData.total_sections
          ? parseInt(formData.total_sections)
          : undefined,
        description: formData.description,
      };

      const res = await api.post("/parking-areas/", payload);
      setParkingAreas([...parkingAreas, res.data.data]);
      setFormData({
        name: "",
        area_code: "",
        description: "",
        total_spots: "",
        display_height: "",
        display_width: "",
        total_sections: "",
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create parking area", error);

      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;

        // Check for non-field errors
        if (backendErrors.non_field_errors) {
          setGeneralError(backendErrors.non_field_errors.join(", "));
        }

        // Set field-specific errors
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
        setGeneralError("Failed to create parking area. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Parking
          </h1>
          <p className="text-muted-foreground">Manage your parking areas.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus size={18} />
          <span className="hidden sm:inline">Add Area</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {parkingAreas.map((area) => (
          <Link to={`/parking/${area.id}`} key={area.id}>
            <Card className="!bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-purple-500 hover:bg-accent/50 transition-colors cursor-pointer h-full group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-white">
                <CardTitle className="text-lg font-medium break-words max-w-[80%] leading-tight">
                  {area.name}
                </CardTitle>
                <Car className="h-4 w-4 group-hover:scale-150 transition-all duration-300 ease-in-out" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                  {area.sections
                    ? area.sections.reduce(
                        (acc, section) => acc + section.spots.length,
                        0
                      )
                    : 0}
                </div>
                <p className="text-xs text-white">
                  Total Spots • {area.sections ? area.sections.length : 0} /{" "}
                  {area.total_sections || 4} Sections
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {parkingAreas.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-muted rounded-lg bg-muted/10">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Parking Areas</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first parking area.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="secondary"
            >
              Create Area
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormData({
            name: "",
            area_code: "",
            description: "",
            total_spots: "",
            display_height: "",
            display_width: "",
            total_sections: "",
          });
          setErrors({});
          setGeneralError("");
        }}
        title="Create Parking Area"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          {/* General Error Message */}
          {generalError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
              {generalError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Area Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Ground Floor, Basement 1"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              autoFocus
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="area_code">
              Area Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="area_code"
              placeholder="e.g. A1, PARK01"
              value={formData.area_code}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  area_code: e.target.value.toUpperCase(),
                });
                if (errors.area_code) setErrors({ ...errors, area_code: "" });
              }}
              className={errors.area_code ? "border-destructive" : ""}
            />
            {errors.area_code && (
              <p className="text-sm text-destructive">{errors.area_code}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (Optional)
              </span>
            </Label>
            <Input
              id="description"
              placeholder="e.g. Near main entrance"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description)
                  setErrors({ ...errors, description: "" });
              }}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_sections">
                Total Sections <span className="text-destructive">*</span>
              </Label>
              <Input
                id="total_sections"
                type="number"
                placeholder="e.g. 4"
                value={formData.total_sections}
                onChange={(e) => {
                  setFormData({ ...formData, total_sections: e.target.value });
                  if (errors.total_sections)
                    setErrors({ ...errors, total_sections: "" });
                }}
                min="2"
                max="6"
                className={errors.total_sections ? "border-destructive" : ""}
              />
              {errors.total_sections && (
                <p className="text-sm text-destructive">
                  {errors.total_sections}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_spots">
                Total Spots <span className="text-destructive">*</span>
              </Label>
              <Input
                id="total_spots"
                type="number"
                placeholder="e.g. 100"
                value={formData.total_spots}
                onChange={(e) => {
                  setFormData({ ...formData, total_spots: e.target.value });
                  if (errors.total_spots)
                    setErrors({ ...errors, total_spots: "" });
                }}
                min="2"
                className={errors.total_spots ? "border-destructive" : ""}
              />
              {errors.total_spots && (
                <p className="text-sm text-destructive">{errors.total_spots}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_height">
                Display Height (inches){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="display_height"
                type="number"
                placeholder="e.g. 24"
                value={formData.display_height}
                onChange={(e) => {
                  setFormData({ ...formData, display_height: e.target.value });
                  if (errors.display_height)
                    setErrors({ ...errors, display_height: "" });
                }}
                className={errors.display_height ? "border-destructive" : ""}
              />
              {errors.display_height && (
                <p className="text-sm text-destructive">
                  {errors.display_height}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_width">
                Display Width (inches){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="display_width"
                type="number"
                placeholder="e.g. 36"
                value={formData.display_width}
                onChange={(e) => {
                  setFormData({ ...formData, display_width: e.target.value });
                  if (errors.display_width)
                    setErrors({ ...errors, display_width: "" });
                }}
                className={errors.display_width ? "border-destructive" : ""}
              />
              {errors.display_width && (
                <p className="text-sm text-destructive">
                  {errors.display_width}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormData({
                  name: "",
                  area_code: "",
                  description: "",
                  total_spots: "",
                  display_height: "",
                  display_width: "",
                  total_sections: "",
                });
                setErrors({});
                setGeneralError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="min-w-[80px]">
              {creating ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, MoreVertical, Pencil } from "lucide-react";
import api from "@/services/api";
import EditSectionDialog from "./EditSectionDialog";
import SpotItem from "./SpotItem";
import BulkAddSpotDialog from "./BulkAddSpotDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SectionItem({
  section,
  onUpdate,
  totalAreaSpots,
  currentAreaSpotCount,
}) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isAddSpotOpen, setIsAddSpotOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/sections/${section.id}`);
      onUpdate();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete section", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col h-full">
      <Card className="flex flex-col h-full border-border/50 shadow-sm bg-card/50 hover:bg-card transition-colors">
        <CardHeader className="bg-muted/20 px-4 py-3 flex flex-row items-center justify-between border-b border-border/40 space-y-0">
          <div className="flex flex-col overflow-hidden">
            <CardTitle className="text-base font-semibold truncate items-center gap-2">
              {section.name}{" "}
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
                Code: {section.section_code}
              </span>
            </CardTitle>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsAddSpotOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Spots
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Section
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {section.spots.length > 0 ? (
            <div className="flex flex-col gap-2">
              {section.spots.map((spot) => (
                <SpotItem key={spot.id} spot={spot} onRefresh={onUpdate} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border/40 h-full">
              <p className="text-sm text-muted-foreground italic mb-4">
                No spots here yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddSpotOpen(true)}
                className="gap-2"
              >
                <Plus size={14} />
                Add Spots
              </Button>
            </div>
          )}
        </CardContent>

        <EditSectionDialog
          section={section}
          onSectionUpdated={onUpdate}
          customOpen={isEditOpen}
          setCustomOpen={setIsEditOpen}
        />

        <BulkAddSpotDialog
          isOpen={isAddSpotOpen}
          onClose={() => setIsAddSpotOpen(false)}
          section={section}
          onSuccess={onUpdate}
          totalAreaSpots={totalAreaSpots}
          currentAreaSpotCount={currentAreaSpotCount}
        />
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Section"
          description={`Are you sure you want to delete "${section.name}"? All associated spots and devices will be permanently removed.`}
          loading={deleteLoading}
        />
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditAreaDialog from "./EditAreaDialog";
import AddSectionDialog from "./AddSectionDialog";

export default function AreaHeader({ parkingArea, onRefresh }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6 shrink-0">
      <div className="flex items-center space-x-2">
        <Link to={`/parking/${parkingArea.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Manage Parking</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsEditOpen(true)}
              title="Edit Area Name"
            >
              <Edit2
                size={14}
                className="text-muted-foreground hover:text-primary"
              />
              <span className="sr-only d-none group-hover:d-block">
                Edit Area
              </span>
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground mt-1">
              Editing: {parkingArea.name}{" "}
            </p>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Code:{" "}
              <span className="text-primary">{parkingArea.area_code}</span>
            </span>

            <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Max Sections:{" "}
              <span className="text-primary">{parkingArea.total_sections}</span>
            </span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Max Spots:{" "}
              <span className="text-primary">
                {parkingArea.total_spots || 4}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div>
        <AddSectionDialog
          isOpen={isAddSectionOpen}
          onClose={() => setIsAddSectionOpen(false)}
          areaId={parkingArea.id}
          onSectionAdded={onRefresh}
        />
      </div>

      <EditAreaDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        parkingArea={parkingArea}
        onSuccess={onRefresh}
      />
    </div>
  );
}

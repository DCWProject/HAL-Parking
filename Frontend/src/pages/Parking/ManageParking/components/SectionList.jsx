import { Skeleton } from "@/components/ui/skeleton";
import SectionItem from "./SectionItem";
import AddSectionDialog from "./AddSectionDialog";

export default function SectionList({
  sections,
  loading,
  onUpdate,
  areaId,
  parkingArea,
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
          <span className="text-2xl">🏗️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">No Sections Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Get started by adding the first section (e.g., "Ground Floor" or "Zone
          A") to this parking area.
        </p>
        <div className="w-full max-w-xs">
          <AddSectionDialog areaId={areaId} onSectionAdded={onUpdate} />
        </div>
      </div>
    );
  }

  // Calculate current total spot count
  const currentAreaSpotCount = sections.reduce(
    (total, section) => total + (section.spots?.length || 0),
    0
  );

  return (
    <div className="flex-1 overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max px-1">
        {sections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            onUpdate={onUpdate}
            totalAreaSpots={parkingArea?.total_spots}
            currentAreaSpotCount={currentAreaSpotCount}
          />
        ))}
      </div>
    </div>
  );
}

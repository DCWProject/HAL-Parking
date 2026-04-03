import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpotCard from "@/components/SpotCard";

export default function ParkingLayout({ 
    parkingArea, 
    selectedSectionId, 
    setSelectedSectionId, 
    displayedSpots 
}) {
  return (
    <div className="lg:col-span-3 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="mr-1">
            <LayoutGrid size={18} />
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            Parking Layout
          </h2>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>{" "}
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>{" "}
            <span className="text-muted-foreground">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>{" "}
            <span className="text-muted-foreground">Offline</span>
          </div>
        </div>
      </div>

      {/* TABS - Refactored for Sections */}
      {parkingArea.sections?.length > 0 && (
        <div className="space-y-4">
          <Tabs
            defaultValue="all"
            value={selectedSectionId}
            onValueChange={setSelectedSectionId}
            className="w-full"
          >
            <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-muted/30 p-1">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary hover:text-primary data-[state=active]:text-primary-foreground min-w-[80px]"
              >
                All Sections
              </TabsTrigger>
              {parkingArea.sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={String(section.id)}
                  className="data-[state=active]:bg-primary hover:text-primary data-[state=active]:text-primary-foreground min-w-[80px]"
                >
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Progress Bar for Selected Section */}
          <AnimatePresence>
            {selectedSectionId !== "all" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-card/50 border border-border/50 p-4 rounded-xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="font-semibold text-foreground">
                      {parkingArea.sections?.find(
                        (s) => String(s.id) === selectedSectionId,
                      )?.name + " Capacity"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {
                        displayedSpots.filter(
                          (s) => s.status === "OCCUPIED",
                        ).length
                      }{" "}
                      / {displayedSpots.length} Occupied
                    </span>
                  </div>
                  <div className="flex h-3 w-full rounded-full bg-muted overflow-hidden">
                    {/* Occupied Segment */}
                    <div
                      className="h-full bg-red-500 transition-all duration-700 ease-out relative"
                      style={{
                        width: `${
                          displayedSpots.length > 0
                            ? (displayedSpots.filter(
                                (s) => s.status === "OCCUPIED",
                              ).length /
                                displayedSpots.length) *
                              100
                            : 0
                        }%`,
                      }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{" "}
                        Occupied
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>{" "}
                        Offline (
                        {
                          displayedSpots.filter(
                            (s) => s.status === "OFFLINE",
                          ).length
                        }
                        )
                      </span>
                    </div>
                    <span className="text-green-500">
                      {
                        displayedSpots.filter(
                          (s) => s.status === "AVAILABLE",
                        ).length
                      }{" "}
                      Available
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Spots Grid */}
      <motion.div
        key={selectedSectionId} // Triggers re-animation when tab changes
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.03, // Fast stagger for "one by one" effect
            },
          },
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 shadow-inner min-h-[100px] max-h-[600px] overflow-y-auto pr-2 custom-scrollbar content-start"
      >
        {displayedSpots.map((spot) => (
          <motion.div
            key={spot.id}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.9 },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                },
              },
            }}
          >
            <SpotCard spot={spot} />
          </motion.div>
        ))}

        {displayedSpots.length === 0 && (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1 },
            }}
            className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-muted rounded-xl"
          >
            No spots found for this area. Please go to manage parking to
            add spots.
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

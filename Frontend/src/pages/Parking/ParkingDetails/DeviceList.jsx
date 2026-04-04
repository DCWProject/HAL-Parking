import { RadioReceiver } from "lucide-react";
import DeviceItem from "./DeviceItem";

export default function DeviceList({
  devices,
  onRestart,
  onDelete,
  onResetSpots,
}) {
  const online = devices?.filter((d) => d.is_online).length || 0;
  const offline = devices?.filter((d) => !d.is_online).length || 0;

  return (
    <div className="lg:col-span-1 space-y-6 border border-muted rounded-2xl p-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <RadioReceiver className="mr-2 text-green-500" />
          <h3 className="font-semibold text-foreground">Devices</h3>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{online}</span>
          </span>
          <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">{offline}</span>
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {devices && devices.length > 0 ? (
          devices.map((device) => (
            <DeviceItem
              key={device.id}
              device={device}
              onRestart={() => onRestart(device.id, device.device_uid)}
              onDelete={() => onDelete(device.id, device.device_uid)}
              onResetSpots={() => onResetSpots(device.id, device.device_uid)}
            />
          ))
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-muted rounded-xl">
            <p className="text-sm text-muted-foreground">No devices connected</p>
          </div>
        )}
      </div>
    </div>
  );
}
import { RadioReceiver } from "lucide-react";
import DeviceItem from "./DeviceItem";
export default function DeviceList({ 
    devices, 
    detachedLogDeviceId, 
    onRestart, 
    onToggleDebug, 
    onDelete,
    onResetSpots,
    setDetachedLogDeviceId
}) {
  return (
    <div className="lg:col-span-1 space-y-6 border border-muted rounded-2xl p-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
            <RadioReceiver className="mr-2 text-green-500" />
            <h3 className="font-semibold text-foreground">Devices</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
          {devices?.length || 0} Connected
        </span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {devices && devices.length > 0 ? (
          devices.map((device) => (
            <DeviceItem 
              key={device.id} 
              device={device} 
              isDetached={detachedLogDeviceId === device.id}
              onRestart={() => onRestart(device.id, device.device_uid)} 
              onToggleDebug={(current) => onToggleDebug(device.id, device.device_uid, current)}
              onDelete={() => onDelete(device.id, device.device_uid)}
              onResetSpots={() => onResetSpots(device.id, device.device_uid)}
              onDetachLogs={() => setDetachedLogDeviceId(device.id)}
            />
          ))
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-muted rounded-xl">
            <p className="text-sm text-muted-foreground">
              No devices connected
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

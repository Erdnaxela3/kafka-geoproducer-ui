import { useEffect, useMemo, useState } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { fixAt, type Device, type Fix, type LatLng } from "./sim.ts";

type Props = {
  devices: Device[];
  elapsed: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRouteChange: (id: string, route: LatLng[]) => void;
};

const PARIS: LatLng = [48.8566, 2.3522];
const round6 = (n: number) => Number(n.toFixed(6));

function ClickToAddStop({ device, onRouteChange }: { device?: Device; onRouteChange: Props["onRouteChange"] }) {
  useMapEvents({
    click(e) {
      if (device) onRouteChange(device.id, [...device.route, [round6(e.latlng.lat), round6(e.latlng.lng)]]);
    },
  });
  return null;
}

function KeepInView({ fix, deviceId }: { fix: Fix | null; deviceId: string | null }) {
  const map = useMap();
  // Only when the selection changes, not on every animation frame.
  useEffect(() => {
    if (fix && !map.getBounds().contains(fix.position)) map.panTo(fix.position);
  }, [deviceId, map]);
  return null;
}

function Stops({ device, onRouteChange }: { device: Device; onRouteChange: Props["onRouteChange"] }) {
  const icons = useMemo(
    () => device.route.map((_, i) => divIcon({ className: "stop", html: `<span style="--c:${device.color}">${i + 1}</span>`, iconSize: [22, 22] })),
    [device.route.length, device.color],
  );
  return device.route.map((p, i) => (
    <Marker
      key={i}
      position={p}
      icon={icons[i]}
      draggable
      keyboard={false}
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onRouteChange(device.id, device.route.map((q, j) => (j === i ? [round6(lat), round6(lng)] : q)));
        },
        contextmenu: () => onRouteChange(device.id, device.route.filter((_, j) => j !== i)),
      }}
    />
  ));
}

export default function MapView({ devices, elapsed, selectedId, onSelect, onRouteChange }: Props) {
  const [initialBounds] = useState(() => {
    const points = devices.flatMap((d) => d.route);
    return points.length > 1 ? latLngBounds(points).pad(0.15) : null;
  });
  const selected = devices.find((d) => d.id === selectedId);

  return (
    <MapContainer
      className="map"
      {...(initialBounds ? { bounds: initialBounds } : { center: devices[0]?.route[0] ?? PARIS, zoom: 14 })}
      doubleClickZoom={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ClickToAddStop device={selected} onRouteChange={onRouteChange} />
      <KeepInView fix={selected ? fixAt(selected, elapsed) : null} deviceId={selectedId} />

      {devices.map((d) =>
        d.route.length > 1 ? (
          <Polyline
            key={`route-${d.id}`}
            positions={[...d.route, d.route[0]]}
            pathOptions={{ color: d.color, weight: d.id === selectedId ? 4 : 3, opacity: d.id === selectedId ? 0.95 : 0.7 }}
            bubblingMouseEvents={false}
            eventHandlers={{ click: () => onSelect(d.id) }}
          />
        ) : null,
      )}

      {selected && <Stops device={selected} onRouteChange={onRouteChange} />}

      {devices.map((d) => {
        const fix = fixAt(d, elapsed);
        if (!fix) return null;
        return (
          <CircleMarker
            key={`puck-${d.id}`}
            center={fix.position}
            radius={d.id === selectedId ? 9 : 7}
            pathOptions={{ color: "#fff", weight: 2.5, fillColor: d.color, fillOpacity: 1 }}
            bubblingMouseEvents={false}
            eventHandlers={{ click: () => onSelect(d.id) }}
          >
            <Tooltip permanent direction="right" offset={[10, 0]} className="device-label">
              {d.name}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

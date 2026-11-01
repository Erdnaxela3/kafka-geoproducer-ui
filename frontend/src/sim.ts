export type LatLng = [lat: number, lng: number];

export type Device = {
  id: string;
  name: string;
  color: string;
  route: LatLng[];
  speedKmh: number;
};

export const FIELD_KINDS = {
  deviceId: "Device name",
  timestamp: "Timestamp (ISO)",
  epochMs: "Timestamp (epoch ms)",
  latitude: "Latitude",
  longitude: "Longitude",
  speed: "Speed (km/h)",
  heading: "Heading (degrees)",
  text: "Fixed text",
  number: "Fixed number",
  boolean: "Fixed boolean",
  random: "Random number",
  choice: "Random choice",
} as const;

export type FieldKind = keyof typeof FIELD_KINDS;

export type Field = {
  id: string;
  name: string;
  kind: FieldKind;
  value?: string;
  min?: number;
  max?: number;
};

export type Fix = { position: LatLng; heading: number; speedKmh: number };

const EARTH_RADIUS_M = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceM([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function bearing([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2));
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function routeLengthM(route: LatLng[]): number {
  if (route.length < 2) return 0;
  return route.reduce((sum, p, i) => sum + distanceM(p, route[(i + 1) % route.length]), 0);
}

// Routes are closed loops: after the last stop the device heads back to the first.
// ponytail: linear lat/lng interpolation per leg, fine for city-scale legs, use great-circle interpolation for ocean crossings
export function fixAt(device: Device, elapsedS: number): Fix | null {
  const { route, speedKmh } = device;
  if (route.length === 0) return null;
  const total = routeLengthM(route);
  if (total === 0 || speedKmh <= 0) return { position: route[0], heading: 0, speedKmh: 0 };

  let d = ((speedKmh / 3.6) * elapsedS) % total;
  for (let i = 0; i < route.length; i++) {
    const a = route[i];
    const b = route[(i + 1) % route.length];
    const leg = distanceM(a, b);
    if (d <= leg && leg > 0) {
      const f = d / leg;
      return {
        position: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        heading: bearing(a, b),
        speedKmh,
      };
    }
    d -= leg;
  }
  return { position: route[0], heading: 0, speedKmh };
}

const round = (n: number, digits: number) => Number(n.toFixed(digits));

function randomBetween(min = 0, max = 100): number {
  const [lo, hi] = min <= max ? [min, max] : [max, min];
  if (Number.isInteger(lo) && Number.isInteger(hi)) return lo + Math.floor(Math.random() * (hi - lo + 1));
  return round(lo + Math.random() * (hi - lo), 2);
}

function fieldValue(field: Field, device: Device, fix: Fix, now: Date): unknown {
  switch (field.kind) {
    case "deviceId": return device.name;
    case "timestamp": return now.toISOString();
    case "epochMs": return now.getTime();
    case "latitude": return round(fix.position[0], 6);
    case "longitude": return round(fix.position[1], 6);
    case "speed": return fix.speedKmh;
    case "heading": return round(fix.heading, 1);
    case "text": return field.value ?? "";
    case "number": return Number(field.value ?? 0) || 0;
    case "boolean": return field.value === "true";
    case "random": return randomBetween(field.min, field.max);
    case "choice": {
      const options = (field.value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      return options.length ? options[Math.floor(Math.random() * options.length)] : null;
    }
  }
}

export function buildMessage(fields: Field[], device: Device, fix: Fix, now: Date): Record<string, unknown> {
  return Object.fromEntries(
    fields.filter((f) => f.name.trim()).map((f) => [f.name.trim(), fieldValue(f, device, fix, now)]),
  );
}

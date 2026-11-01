import { useEffect, useState } from "react";
import type { Device, Field } from "./sim.ts";

export type Config = {
  brokers: string;
  topic: string;
  intervalMs: number;
  fields: Field[];
  devices: Device[];
};

export const PALETTE = ["#E4572E", "#2E86AB", "#8E44AD", "#17A589", "#E09F1F", "#D81B60", "#3949AB", "#6D8B00"];
const NAMES = ["whisky", "vodka", "flip", "garfield", "felinferno", "tigrou"];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newDevice(existing: Device[]): Device {
  const taken = new Set(existing.map((d) => d.name));
  const name = NAMES.find((n) => !taken.has(n)) ?? `${NAMES[existing.length % NAMES.length]}-${1000 + Math.floor(Math.random() * 9000)}`;
  return { id: uid(), name, color: PALETTE[existing.length % PALETTE.length], route: [], speedKmh: 30 };
}

export const DEFAULT_CONFIG: Config = {
  brokers: "",
  topic: "device-locations",
  intervalMs: 1000,
  fields: [
    { id: uid(), name: "deviceId", kind: "deviceId" },
    { id: uid(), name: "timestamp", kind: "timestamp" },
    { id: uid(), name: "latitude", kind: "latitude" },
    { id: uid(), name: "longitude", kind: "longitude" },
    { id: uid(), name: "speed", kind: "speed" },
    { id: uid(), name: "heading", kind: "heading" },
  ],
  devices: [
    {
      id: uid(), name: "whisky", color: PALETTE[0], speedKmh: 30,
      route: [[48.8656, 2.3212], [48.8611, 2.3364], [48.8564, 2.3524], [48.853, 2.3499], [48.86, 2.3266]],
    },
    {
      id: uid(), name: "vodka", color: PALETTE[1], speedKmh: 14,
      route: [[48.8867, 2.3431], [48.8822, 2.3372], [48.8838, 2.3326], [48.8875, 2.3365]],
    },
    { id: uid(), name: "flip", color: PALETTE[2], speedKmh: 0, route: [[48.8584, 2.2945]] },
  ],
};

export function usePersisted<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? { ...initial, ...JSON.parse(saved) } : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

export async function api<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Can't reach the geoproducer server. Start it with pnpm dev.");
  }
  if (!res.headers.get("content-type")?.includes("json")) {
    throw new Error("Can't reach the geoproducer server. Start it with pnpm dev.");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed with ${res.status}`);
  return data;
}

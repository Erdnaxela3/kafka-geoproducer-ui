import type { CSSProperties } from "react";
import { FIELD_KINDS, routeLengthM, type Device, type Field, type FieldKind } from "./sim.ts";
import { uid } from "./state.ts";

const BUILT_IN: FieldKind[] = ["deviceId", "timestamp", "epochMs", "latitude", "longitude", "speed", "heading"];

export function describeDevice(d: Device): string {
  if (d.route.length === 0) return "Not placed";
  if (d.route.length === 1 || d.speedKmh <= 0) return "Parked";
  const km = routeLengthM(d.route) / 1000;
  return `${km.toFixed(1)} km loop at ${d.speedKmh} km/h`;
}

type DevicesProps = {
  devices: Device[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Device>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

export function DevicesPanel({ devices, selectedId, onSelect, onChange, onAdd, onRemove }: DevicesProps) {
  return (
    <>
      {devices.length === 0 && <p className="empty">Add a device, then click the map to give it a route.</p>}
      <ul className="devices">
        {devices.map((d) => {
          const selected = d.id === selectedId;
          return (
            <li key={d.id} className={selected ? "device selected" : "device"} style={{ "--c": d.color } as CSSProperties}>
              <button className="device-row" aria-expanded={selected} onClick={() => onSelect(selected ? null : d.id)}>
                <span className="swatch" />
                <span className="device-name">{d.name || "Unnamed"}</span>
                <span className="device-meta">{describeDevice(d)}</span>
              </button>
              {selected && (
                <div className="device-editor">
                  <div className="row">
                    <label className="grow">
                      Name
                      <input value={d.name} onChange={(e) => onChange(d.id, { name: e.target.value })} />
                    </label>
                    <label>
                      Color
                      <input type="color" value={d.color} onChange={(e) => onChange(d.id, { color: e.target.value })} />
                    </label>
                  </div>
                  <label>
                    Speed (km/h)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={d.speedKmh}
                      onChange={(e) => onChange(d.id, { speedKmh: Math.max(0, Number(e.target.value)) })}
                    />
                  </label>
                  <p className="hint">
                    {d.route.length === 0
                      ? "Click the map to place this device."
                      : `${d.route.length} ${d.route.length === 1 ? "stop" : "stops"}. Click the map to add more, drag a stop to move it, right-click to remove it.`}
                  </p>
                  <div className="row">
                    <button className="quiet" disabled={!d.route.length} onClick={() => onChange(d.id, { route: [] })}>
                      Clear route
                    </button>
                    <button className="quiet danger" onClick={() => onRemove(d.id)}>
                      Remove device
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button className="add" onClick={onAdd}>
        Add device
      </button>
    </>
  );
}

function FieldValue({ field, onChange }: { field: Field; onChange: (patch: Partial<Field>) => void }) {
  switch (field.kind) {
    case "text":
      return <input aria-label="Value" placeholder="Value" value={field.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} />;
    case "number":
      return <input aria-label="Value" type="number" value={field.value ?? "0"} onChange={(e) => onChange({ value: e.target.value })} />;
    case "boolean":
      return (
        <select aria-label="Value" value={field.value ?? "false"} onChange={(e) => onChange({ value: e.target.value })}>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    case "random":
      return (
        <span className="range">
          <input aria-label="Minimum" type="number" value={field.min ?? 0} onChange={(e) => onChange({ min: Number(e.target.value) })} />
          <span>to</span>
          <input aria-label="Maximum" type="number" value={field.max ?? 100} onChange={(e) => onChange({ max: Number(e.target.value) })} />
        </span>
      );
    case "choice":
      return <input aria-label="Options" placeholder="idle, moving, charging" value={field.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} />;
    default:
      return null;
  }
}

type MessageProps = {
  fields: Field[];
  onChange: (fields: Field[]) => void;
  preview: { device: Device; message: Record<string, unknown> } | null;
};

export function MessagePanel({ fields, onChange, preview }: MessageProps) {
  const update = (id: string, patch: Partial<Field>) => onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const duplicates = new Set(fields.map((f) => f.name.trim()).filter((n, i, all) => n && all.indexOf(n) !== i));

  return (
    <>
      <p className="lede">Each tick, every placed device sends one JSON message keyed by its name.</p>
      <ul className="fields">
        {fields.map((f) => (
          <li key={f.id} className="field">
            <input
              aria-label="Field name"
              className={duplicates.has(f.name.trim()) || !f.name.trim() ? "invalid" : undefined}
              value={f.name}
              placeholder="name"
              onChange={(e) => update(f.id, { name: e.target.value })}
            />
            <select aria-label="Field type" value={f.kind} onChange={(e) => update(f.id, { kind: e.target.value as FieldKind })}>
              <optgroup label="From the simulation">
                {BUILT_IN.map((k) => <option key={k} value={k}>{FIELD_KINDS[k]}</option>)}
              </optgroup>
              <optgroup label="Custom">
                {(Object.keys(FIELD_KINDS) as FieldKind[]).filter((k) => !BUILT_IN.includes(k)).map((k) => (
                  <option key={k} value={k}>{FIELD_KINDS[k]}</option>
                ))}
              </optgroup>
            </select>
            <button className="icon" aria-label={`Remove ${f.name || "field"}`} title="Remove field" onClick={() => onChange(fields.filter((x) => x.id !== f.id))}>
              ×
            </button>
            {!BUILT_IN.includes(f.kind) && (
              <div className="field-value">
                <FieldValue field={f} onChange={(patch) => update(f.id, patch)} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {duplicates.size > 0 && <p className="error">Field names must be unique: {[...duplicates].join(", ")}. Only the last one is sent.</p>}
      <button className="add" onClick={() => onChange([...fields, { id: uid(), name: `field${fields.length + 1}`, kind: "text", value: "" }])}>
        Add field
      </button>
      <h3>Preview{preview && <span className="for"> for {preview.device.name}</span>}</h3>
      {preview ? (
        <pre className="preview">{JSON.stringify(preview.message, null, 2)}</pre>
      ) : (
        <p className="empty">Place a device on the map to preview its message.</p>
      )}
    </>
  );
}

export type Connection =
  | { status: "unknown" }
  | { status: "checking" }
  | { status: "ok"; brokers: string; topics: string[] }
  | { status: "error"; error: string };

type BrokerProps = {
  brokers: string;
  topic: string;
  connection: Connection;
  onChange: (patch: { brokers?: string; topic?: string }) => void;
  onTest: () => void;
};

export function BrokerPanel({ brokers, topic, connection, onChange, onTest }: BrokerProps) {
  const topics = connection.status === "ok" ? connection.topics : [];
  return (
    <>
      <label>
        Bootstrap servers
        <input
          value={brokers}
          placeholder="Server default"
          spellCheck={false}
          onChange={(e) => onChange({ brokers: e.target.value })}
          onBlur={onTest}
        />
        <span className="help">Comma-separated host:port list. Leave empty to use the server's KAFKA_BROKERS.</span>
      </label>
      <label>
        Topic
        <input list="topics" value={topic} spellCheck={false} onChange={(e) => onChange({ topic: e.target.value })} />
        <datalist id="topics">
          {topics.map((t) => <option key={t} value={t} />)}
        </datalist>
        <span className="help">
          {topic && topics.length && !topics.includes(topic.trim())
            ? "This topic doesn't exist yet. The broker creates it on first send if auto-creation is on."
            : "Pick an existing topic or type a new one."}
        </span>
      </label>
      <button onClick={onTest} disabled={connection.status === "checking"}>
        {connection.status === "checking" ? "Testing…" : "Test connection"}
      </button>
      {connection.status === "ok" && (
        <p className="ok">
          Connected to {connection.brokers}. {connection.topics.length} {connection.topics.length === 1 ? "topic" : "topics"} found.
        </p>
      )}
      {connection.status === "error" && <p className="error">{connection.error}</p>}
    </>
  );
}

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import MapView from "./MapView.tsx";
import { BrokerPanel, DevicesPanel, MessagePanel, type Connection } from "./panels.tsx";
import { buildMessage, fixAt, type Device, type LatLng } from "./sim.ts";
import { DEFAULT_CONFIG, api, newDevice, usePersisted, type Config } from "./state.ts";

type Sent = { at: Date; key: string; color: string; value: Record<string, unknown> };
type Stats = { sent: number; failed: number; error: string | null; log: Sent[] };

const TABS = { devices: "Devices", message: "Message", broker: "Broker" } as const;
type Tab = keyof typeof TABS;
const LOG_SIZE = 40;
const time = (d: Date) => d.toLocaleTimeString([], { hour12: false });

export default function App() {
  const [config, setConfig] = usePersisted<Config>("geoproducer:v2", DEFAULT_CONFIG);
  const [tab, setTab] = useState<Tab>("devices");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>({ status: "unknown" });
  const [stats, setStats] = useState<Stats>({ sent: 0, failed: 0, error: null, log: [] });
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const clock = useRef({ base: 0, since: 0 });
  const elapsedNow = () => clock.current.base + (running ? (performance.now() - clock.current.since) / 1000 : 0);
  const configRef = useRef(config);
  useEffect(() => void (configRef.current = config), [config]);

  const patch = (p: Partial<Config>) => setConfig((c) => ({ ...c, ...p }));
  const updateDevice = useCallback(
    (id: string, p: Partial<Device>) => setConfig((c) => ({ ...c, devices: c.devices.map((d) => (d.id === id ? { ...d, ...p } : d)) })),
    [setConfig],
  );
  const setRoute = useCallback((id: string, route: LatLng[]) => updateDevice(id, { route }), [updateDevice]);
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setTab("devices");
  }, []);

  const testConnection = useCallback(async () => {
    setConnection({ status: "checking" });
    try {
      const res = await api<{ brokers: string; topics: string[] }>("/api/connect", { brokers: configRef.current.brokers });
      setConnection({ status: "ok", ...res });
    } catch (err) {
      setConnection({ status: "error", error: (err as Error).message });
    }
  }, []);
  useEffect(() => void testConnection(), [testConnection]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(clock.current.base + (performance.now() - clock.current.since) / 1000), 100);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      const { brokers, topic, fields, devices } = configRef.current;
      const t = clock.current.base + (performance.now() - clock.current.since) / 1000;
      const now = new Date();
      const batch = devices.flatMap((d) => {
        const fix = fixAt(d, t);
        return fix ? [{ key: d.name, color: d.color, value: buildMessage(fields, d, fix, now) }] : [];
      });
      if (batch.length === 0) {
        setStats((s) => ({ ...s, error: "No device is on the map yet. Select a device and click the map to place it." }));
        return;
      }
      inFlight = true;
      try {
        const res = await api<{ brokers: string }>("/api/produce", { brokers, topic, messages: batch.map(({ key, value }) => ({ key, value })) });
        setConnection((c) => (c.status === "ok" ? c : { status: "ok", brokers: res.brokers, topics: [] }));
        setStats((s) => ({
          sent: s.sent + batch.length,
          failed: s.failed,
          error: null,
          log: [...batch.map((m) => ({ ...m, at: now })), ...s.log].slice(0, LOG_SIZE),
        }));
      } catch (err) {
        setStats((s) => ({ ...s, failed: s.failed + batch.length, error: (err as Error).message }));
      } finally {
        inFlight = false;
      }
    };
    tick();
    const id = setInterval(tick, Math.max(100, config.intervalMs));
    return () => clearInterval(id);
  }, [running, config.intervalMs]);

  const start = () => {
    clock.current.since = performance.now();
    setStats((s) => ({ ...s, error: null }));
    setRunning(true);
  };
  const stop = () => {
    clock.current.base = elapsedNow();
    setElapsed(clock.current.base);
    setRunning(false);
  };
  const resetPositions = () => {
    clock.current = { base: 0, since: performance.now() };
    setElapsed(0);
  };

  const selected = config.devices.find((d) => d.id === selectedId);
  const previewDevice = selected?.route.length ? selected : config.devices.find((d) => d.route.length);
  const previewFix = previewDevice && fixAt(previewDevice, elapsed);
  const preview = previewDevice && previewFix ? { device: previewDevice, message: buildMessage(config.fields, previewDevice, previewFix, new Date()) } : null;
  const placed = config.devices.some((d) => d.route.length);

  return (
    <div className="app">
      <aside className="panel">
        <header className="masthead">
          <h1>Geoproducer</h1>
          <button className={`conn ${connection.status}`} onClick={() => setTab("broker")} title="Broker settings">
            <span className="dot" />
            {connection.status === "ok" ? connection.brokers : connection.status === "error" ? "Not connected" : "Connecting…"}
          </button>
        </header>

        <nav className="tabs" role="tablist">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} aria-controls="tab-panel" onClick={() => setTab(t)}>
              {TABS[t]}
              {t === "devices" && <span className="count">{config.devices.length}</span>}
            </button>
          ))}
        </nav>

        <section className="tab-body" id="tab-panel" role="tabpanel">
          {tab === "devices" && (
            <DevicesPanel
              devices={config.devices}
              selectedId={selectedId}
              onSelect={select}
              onChange={updateDevice}
              onAdd={() => {
                const d = newDevice(config.devices);
                patch({ devices: [...config.devices, d] });
                setSelectedId(d.id);
              }}
              onRemove={(id) => {
                patch({ devices: config.devices.filter((d) => d.id !== id) });
                setSelectedId(null);
              }}
            />
          )}
          {tab === "message" && <MessagePanel fields={config.fields} onChange={(fields) => patch({ fields })} preview={preview} />}
          {tab === "broker" && (
            <BrokerPanel brokers={config.brokers} topic={config.topic} connection={connection} onChange={patch} onTest={testConnection} />
          )}
        </section>

        <footer className="run">
          <div className="run-controls">
            <button
              className={running ? "go stop" : "go"}
              onClick={running ? stop : start}
              disabled={!running && !config.topic.trim()}
              title={!config.topic.trim() ? "Set a topic in Broker first" : undefined}
            >
              {running ? "Stop sending" : "Start sending"}
            </button>
            <label className="interval">
              Every
              <input
                type="number"
                min={100}
                step={100}
                value={config.intervalMs}
                onChange={(e) => patch({ intervalMs: Math.max(100, Number(e.target.value) || 1000) })}
              />
              ms
            </label>
          </div>
          <div className="stats">
            <span>
              <b>{stats.sent.toLocaleString()}</b> sent
            </span>
            <span className={stats.failed ? "failed" : undefined}>
              <b>{stats.failed.toLocaleString()}</b> failed
            </span>
            <button className="quiet" onClick={resetPositions} disabled={elapsed === 0 && !running} title="Move every device back to its first stop">
              Reset positions
            </button>
          </div>
          {stats.error && <p className="error" role="alert">{stats.error}</p>}
        </footer>
      </aside>

      <main className="stage">
        <MapView devices={config.devices} elapsed={elapsed} selectedId={selectedId} onSelect={select} onRouteChange={setRoute} />

        {(selected || !placed) && (
          <div className="hint-bar" style={{ "--c": selected?.color } as CSSProperties}>
            {selected ? (
              <>
                <span>
                  Click the map to add stops for <b>{selected.name || "this device"}</b>.
                </span>
                <button onClick={() => setSelectedId(null)}>Done</button>
              </>
            ) : (
              <span>Select a device, then click the map to place it.</span>
            )}
          </div>
        )}

        {stats.log.length > 0 && (
          <details className="log" open>
            <summary>
              Sent messages <span className="count">{stats.sent.toLocaleString()}</span>
            </summary>
            <ol>
              {stats.log.map((m, i) => (
                <li key={`${m.at.getTime()}-${m.key}-${i}`}>
                  <time>{time(m.at)}</time>
                  <b style={{ color: m.color }}>{m.key}</b>
                  <code>{JSON.stringify(m.value)}</code>
                </li>
              ))}
            </ol>
          </details>
        )}
      </main>
    </div>
  );
}

import path from "node:path";
import express, { type ErrorRequestHandler } from "express";
import { Kafka, logLevel, type Producer } from "kafkajs";

const PORT = Number(process.env.PORT ?? 4000);
const DEFAULT_BROKERS = process.env.KAFKA_BROKERS ?? "localhost:9092";
const STATIC_DIR = process.env.STATIC_DIR ?? path.resolve(import.meta.dirname, "../frontend/dist");

type Client = { brokers: string; kafka: Kafka; producer: Producer; ready: Promise<void> };

// ponytail: one cached producer for the last-used brokers, a Map keyed by brokers if several UIs share a server
let client: Client | null = null;

function drop(c: Client) {
  if (client === c) client = null;
  c.producer.disconnect().catch(() => {});
}

async function getClient(requested: unknown): Promise<Client> {
  const brokers = (typeof requested === "string" && requested.trim()) || DEFAULT_BROKERS;
  if (client?.brokers !== brokers) {
    if (client) drop(client);
    const kafka = new Kafka({
      clientId: "geoproducer",
      brokers: brokers.split(",").map((b) => b.trim()).filter(Boolean),
      connectionTimeout: 3000,
      retry: { retries: 2 },
      logLevel: logLevel.NOTHING,
    });
    const producer = kafka.producer();
    client = { brokers, kafka, producer, ready: producer.connect() };
  }
  const c = client;
  try {
    await c.ready;
  } catch (err) {
    drop(c);
    throw err;
  }
  return c;
}

class BadRequest extends Error {}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.post("/api/connect", async (req, res) => {
  const c = await getClient(req.body?.brokers);
  const admin = c.kafka.admin();
  await admin.connect();
  try {
    const topics = (await admin.listTopics()).filter((t) => !t.startsWith("__")).sort();
    res.json({ brokers: c.brokers, topics });
  } finally {
    await admin.disconnect();
  }
});

app.post("/api/produce", async (req, res) => {
  const { brokers, topic, messages } = req.body ?? {};
  if (typeof topic !== "string" || !topic.trim()) throw new BadRequest("Set a topic before sending.");
  if (!Array.isArray(messages)) throw new BadRequest("messages must be an array of { key, value }.");
  const c = await getClient(brokers);
  try {
    await c.producer.send({
      topic: topic.trim(),
      messages: messages.map((m) => ({
        key: m?.key == null ? null : String(m.key),
        value: JSON.stringify(m?.value ?? null),
      })),
    });
  } catch (err) {
    drop(c);
    throw err;
  }
  res.json({ brokers: c.brokers, sent: messages.length });
});

app.use(express.static(STATIC_DIR));

app.use(((err, _req, res, _next) => {
  const status = err instanceof BadRequest ? 400 : 502;
  res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
}) satisfies ErrorRequestHandler);

const server = app.listen(PORT, () => {
  console.log(`geoproducer listening on http://localhost:${PORT} (default brokers: ${DEFAULT_BROKERS})`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await client?.producer.disconnect().catch(() => {});
    process.exit(0);
  });
}

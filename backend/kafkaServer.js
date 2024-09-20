const express = require("express");
const { Kafka } = require("kafkajs");

const app = express();
const port = 4000;

app.use(express.json());


app.post("/send-kafka-batch", async (req, res) => {
  const { host, topicName, messages } = req.body;

  const kafka = new Kafka({
    clientId: "my-app",
    brokers: [host],
  });
  const producer = kafka.producer();

  try {
    const kafkaMessages = messages.map((message) => ({
      value: JSON.stringify(message),
    }));
    const topicMessages = { topic: topicName, messages: kafkaMessages };
    const batch = { topicMessages: [topicMessages] };

    await producer.connect();
    await producer.sendBatch(batch);
    await producer.disconnect();
    res.status(200).send("Messages sent to Kafka");
  } catch (err) {
    console.error("Error sending to Kafka:", err);
    res.status(500).send("Error sending to Kafka" + err);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

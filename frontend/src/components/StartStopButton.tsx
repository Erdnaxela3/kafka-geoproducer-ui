import { Box, Switch, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useProducersList } from "../context/ProducersListContext";
import { useSettings } from "../context/SettingsContext";

const StartStopButton: React.FC = () => {
  const { host, topicName } = useSettings();
  const { producers } = useProducersList();

  const [isOn, setIsOn] = useState(false);

  const handleToggle = () => {
    setIsOn(!isOn);
  };

  useEffect(() => {
    let intervalId: number | undefined;

    const sendMessageToKafka = async () => {
      try {
        // Contains [{key: value, key: value}, {key: value, key: value}, ...]
        const kafkaMessages = producers.map((producer) => {
          const message = Object.fromEntries(
            producer.fields.map((field) => [field.name, field.value])
          );
          message.timestamp = new Date().toISOString();
          message.deviceId = producer.id;
          return message;
        });

        await fetch("api/send-kafka-batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ host, topicName, messages: kafkaMessages }),
        });
      } catch (error) {
        console.error("Error sending message to Kafka:", error);
      }
    };

    if (isOn) {
      intervalId = setInterval(() => {
        sendMessageToKafka();
      }, 1000); // Send message every second
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [host, isOn, producers, topicName]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
      <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
        <Typography>Sending Data - Off</Typography>
        <Switch checked={isOn} onChange={handleToggle} />
        <Typography>On</Typography>
      </Stack>
    </Box>
  );
};

export default StartStopButton;

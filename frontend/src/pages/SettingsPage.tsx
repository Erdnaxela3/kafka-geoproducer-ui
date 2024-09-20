import React from "react";
import {
  TextField,
  Button,
  IconButton,
  MenuItem,
  Grid,
  Typography,
  Box,
} from "@mui/material";
import { Delete, Add } from "@mui/icons-material";
import { useSettings } from "../context/SettingsContext";
import { FieldType } from "../utils/d";

const SettingsPage: React.FC = () => {
  const { host, topicName, fields, setHost, setTopicName, setFields } =
    useSettings();

  const handleHostChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setHost(e.target.value);
  const handleTopicNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTopicName(e.target.value);

  const handleFieldChange = (
    id: number,
    key: keyof (typeof fields)[0],
    value: string | number
  ) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field
      )
    );
  };

  const addField = () => {
    setFields([...fields, { id: Date.now(), name: "", type: "string" }]);
  };

  const removeField = (id: number) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Settings Page
      </Typography>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Host"
          variant="outlined"
          value={host}
          onChange={handleHostChange}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Topic Name"
          variant="outlined"
          value={topicName}
          onChange={handleTopicNameChange}
        />
      </Grid>

      <Box mt={3}>
        <Typography variant="h6">Dynamic Fields</Typography>
        {fields.map((field) => (
          <Grid container spacing={2} alignItems="center" key={field.id}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Field Name"
                variant="outlined"
                value={field.name}
                onChange={(e) =>
                  handleFieldChange(field.id, "name", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Type"
                variant="outlined"
                value={field.type}
                onChange={(e) =>
                  handleFieldChange(
                    field.id,
                    "type",
                    e.target.value as FieldType
                  )
                }
              >
                <MenuItem value="string">string</MenuItem>
                <MenuItem value="number">number</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={1}>
              <IconButton
                onClick={() => removeField(field.id)}
                color="secondary"
              >
                <Delete />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={addField}
          style={{ marginTop: "1rem" }}
        >
          Add Field
        </Button>
      </Box>

      {/* Display current state */}
      <Box mt={3}>
        <Typography variant="subtitle1">Current Message</Typography>
        {/* mock json object with field: "" */}
        <pre>{JSON.stringify(Object.fromEntries(fields.map((field) => [field.name, ""])))}</pre>
      </Box>
    </Box>
  );
};

export default SettingsPage;

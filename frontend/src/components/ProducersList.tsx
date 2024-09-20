import React from "react";
import { useProducersList } from "../context/ProducersListContext";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
} from "@mui/material";
import { Delete, SavedSearch, Search } from "@mui/icons-material";

const ProducersList: React.FC = () => {
  const {
    producers,
    selectedProducerId,
    addProducer,
    removeProducer,
    updateProducerField,
    updateProducerId,
    setSelectedProducerById,
  } = useProducersList();

  return (
    <Box p={2} style={{ height: "90%", overflow: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Producers List
      </Typography>
      <List>
        {producers.map((producer) => (
          <Box key={producer.id} mb={1}>
            <Accordion>
              <AccordionSummary>
                <Typography variant="body1">Producer </Typography>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProducerById(producer.id);
                  }}
                  color="secondary"
                  style={{ marginLeft: "auto" }}
                >
                  { selectedProducerId === producer.id ? <SavedSearch /> : <Search/> }
                </IconButton>
                <IconButton
                  onClick={() => removeProducer(producer.id)}
                  color="secondary"
                  style={{ marginLeft: "auto" }}
                >
                  <Delete />
                </IconButton>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  value={producer.id}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateProducerId(producer.id, e.target.value);
                  }}
                />
                {producer.fields.map((field, index) => (
                  <Grid container spacing={2} alignItems="center" key={index}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        disabled={field.name === "timestamp"}
                        fullWidth
                        label={field.name + ":" + field.type}
                        value={field.value?.toString() || ""}
                        onChange={(e) =>
                          updateProducerField(
                            producer.id,
                            field.name,
                            e.target.value
                          )
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Select
                        fullWidth
                        value={field.generationType}
                        onChange={(e) =>
                          updateProducerField(
                            producer.id,
                            "generationType",
                            e.target.value as "random" | "fixed"
                          )
                        }
                      >
                        <MenuItem value="fixed">Fixed</MenuItem>
                        <MenuItem value="random">Random</MenuItem>
                      </Select>
                    </Grid>
                  </Grid>
                ))}
              </AccordionDetails>
            </Accordion>
          </Box>
        ))}

        <Button variant="contained" color="primary" onClick={addProducer}>
          Add Producer
        </Button>
      </List>
    </Box>
  );
};

export default ProducersList;

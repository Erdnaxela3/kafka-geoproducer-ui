import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLng } from "leaflet";
import { Box } from "@mui/material";
import { useProducersList } from "../context/ProducersListContext";

const RecenterAutomatically: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
   useEffect(() => {
     map.setView([lat, lng]);
   }, [lat, lng, map]);
   return null;
 }

const MapComponent: React.FC = () => {
  const [position, setPosition] = useState<LatLng | null>(null);

  const { producers, updateProducerField, selectedProducerId } = useProducersList();

  const MapEvents = () => {
    useMapEvents({
      click(e: { latlng: { lat: string | number; lng: string | number } }) {
        if (selectedProducerId) {
          updateProducerField(selectedProducerId, "latitude", e.latlng.lat.toString());
          updateProducerField(selectedProducerId, "longitude", e.latlng.lng.toString());
        }
        setPosition(e.latlng as LatLng);
      },
    });
    return null;
  };

  useEffect(() => {
    const selectedProducer = producers.find((producer) => producer.id === selectedProducerId);
    if (selectedProducer) {
      const longitude = selectedProducer.fields.find((field) => field.name === "longitude")?.value;
      const latitude = selectedProducer.fields.find((field) => field.name === "latitude")?.value;
      if (longitude && latitude) {
        setPosition(new LatLng(Number(latitude), Number(longitude)));
      }
    }
  }, [producers, selectedProducerId]);

  return (
    <Box sx={{ height: "1080px", width: "100%" }}>
      <MapContainer
        center={[position?.lat || 48.9, position?.lng || 2.35]} // Default center position
        zoom={13} // Default zoom level
        scrollWheelZoom={true} // Enable scroll zoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {position && <Marker position={position} />}
        {position && <RecenterAutomatically lat={position?.lat} lng={position?.lng} />}
        <MapEvents />
      </MapContainer>
    </Box>
  );
};

export default MapComponent;

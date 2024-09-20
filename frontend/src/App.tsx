import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import SettingsPage from "./pages/SettingsPage";
import ProducerPage from "./pages/ProducerPage";

const App: React.FC = () => {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<SettingsPage />} />
        <Route path="/setting" element={<SettingsPage />} />
        <Route path="/producer" element={<ProducerPage />} />
      </Routes>
    </div>
  );
};

export default App;

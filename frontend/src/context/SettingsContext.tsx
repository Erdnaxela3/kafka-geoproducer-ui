import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { FieldType } from "../utils/d";

export interface DynamicField {
  id: number;
  name: string;
  type: FieldType;
}

interface SettingsContextType {
  host: string;
  topicName: string;
  fields: DynamicField[];
  setHost: (host: string) => void;
  setTopicName: (topicName: string) => void;
  setFields: (fields: DynamicField[]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [host, setHost] = useState<string>(
    () => localStorage.getItem("host") || ""
  );
  const [topicName, setTopicName] = useState<string>(
    () => localStorage.getItem("topicName") || ""
  );
  const [fields, setFields] = useState<DynamicField[]>(() => {
    const storedFields = localStorage.getItem("fields");
    /* default has timestamp longitude and latitude */
    return storedFields
      ? JSON.parse(storedFields)
      : [
          { id: 1, name: "timestamp", type: "string" },
          { id: 2, name: "longitude", type: "number" },
          { id: 3, name: "latitude", type: "number" },
        ];
  });

  useEffect(() => {
    localStorage.setItem("host", host);
  }, [host]);

  useEffect(() => {
    localStorage.setItem("topicName", topicName);
  }, [topicName]);

  useEffect(() => {
    localStorage.setItem("fields", JSON.stringify(fields));
  }, [fields]);

  return (
    <SettingsContext.Provider
      value={{ host, topicName, fields, setHost, setTopicName, setFields }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

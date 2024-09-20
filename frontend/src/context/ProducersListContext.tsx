import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSettings } from "./SettingsContext";
import { FieldType, GenerationType } from "../utils/d";

interface ProducerField {
  name: string;
  type: FieldType;
  generationType: GenerationType;
  value?: string | number | null;
}

interface Producer {
  id: string;
  fields: ProducerField[];
}

interface ProducersListContextType {
  producers: Producer[];
  selectedProducerId: string | null;
  addProducer: () => void;
  removeProducer: (id: number | string) => void;
  updateProducerId: (producerId: string, newId: string) => void;
  updateProducerField: (
    producerId: string,
    fieldName: string,
    value: string | null
  ) => void;
  setSelectedProducerById: (producerId: string) => void;
}

const ProducersListContext = createContext<
  ProducersListContextType | undefined
>(undefined);

export const useProducersList = () => {
  const context = useContext(ProducersListContext);
  if (!context) {
    throw new Error(
      "useProducersList must be used within a ProducersListProvider"
    );
  }
  return context;
};

const LOCAL_STORAGE_KEY = "producersList";
const DEFAULT_IDS = ["whisky", "vodka", "flip", "garfield", "felinferno", "tigrou"];

export const ProducersListProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Get settings from localStorage
  const { fields } = useSettings();

  const [producers, setProducers] = useState<Producer[]>(() => {
    const savedProducers = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedProducers ? JSON.parse(savedProducers) : [];
  });

  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(
    () => {
      const savedSelectedProducer = localStorage.getItem("selectedProducer");
      return savedSelectedProducer ? JSON.parse(savedSelectedProducer) : null;
    }
  );

  // Save producers to localStorage when they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(producers));
  }, [producers]);

  useEffect(() => {
    localStorage.setItem("selectedProducer", JSON.stringify(selectedProducerId));
  }, [selectedProducerId]);

  const defaultValuesByType: Record<FieldType, string | number> = {
    string: "",
    number: 0,
  };


  // Update producer's fields when field in settings are updated (add/remove, type change)
  // reparse all the values as either string or number based on the field type
  // TODO - fix when switching from string to number, the value is not parsed to number
  useEffect(() => {
    setProducers((prevProducers) =>
      prevProducers.map((producer) => ({
        ...producer,
        fields: fields.map((field) => {
          const existingField = producer.fields.find(
            (producerField) => producerField.name === field.name
          );
          return {
            ...field,
            generationType: existingField?.generationType || "fixed",
            value:
              existingField?.type === "number"
                ? Number(existingField.value)
                : existingField?.value || defaultValuesByType[field.type as FieldType],
          };
        }),
      }))
    );
  }, [fields]);

  // Add a new producer and give default ID then add random 4 digit number after the ID
  const addProducer = () => {
    const newProducer: Producer = {
      id: DEFAULT_IDS[Math.floor(Math.random() * DEFAULT_IDS.length)] + "-" + Math.floor(Math.random() * 10000),
      fields: fields.map((field) => ({
        ...field,
        generationType: "fixed",
        value: defaultValuesByType[field.type as FieldType],
      })),
    };
    setProducers([...producers, newProducer]);
  };

  // Remove a producer by ID
  const removeProducer = (id: number | string) => {
    setProducers(producers.filter((producer) => producer.id !== id));
    setSelectedProducerId(null);
  };

  // Update a producer's ID
  const updateProducerId = (producerId: string, newId: string) => {
    setProducers((prevProducers) =>
      prevProducers.map((producer) =>
        producer.id === producerId ? { ...producer, id: newId } : producer
      )
    );
    if (selectedProducerId === producerId) {
      setSelectedProducerId(newId);
    }
  };

  // Update a specific field of a producer, if field type is number, value is parsed to number
  const updateProducerField = (
    producerId: string,
    fieldName: string,
    value: string | null
  ) => {
    setProducers((prevProducers) =>
      prevProducers.map((producer) => {
        if (producer.id === producerId) {
          return {
            ...producer,
            fields: producer.fields.map((field) =>
              field.name === fieldName
                ? {
                    ...field,
                    value:
                      field.type === "number" ? Number(value) : value,
                  }
                : field
            ),
          };
        }
        return producer;
      })
    );
  };

  const setSelectedProducerById = (producerId: string) => {
    setSelectedProducerId(producerId);
  }

  return (
    <ProducersListContext.Provider
      value={{
        producers,
        selectedProducerId,
        addProducer,
        removeProducer,
        updateProducerId,
        updateProducerField,
        setSelectedProducerById
      }}
    >
      {children}
    </ProducersListContext.Provider>
  );
};

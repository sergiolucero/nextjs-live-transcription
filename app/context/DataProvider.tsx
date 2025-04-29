import { createContext, useContext, useState, ReactNode } from 'react';
import Papa from 'papaparse';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your-openai-api-key', // Replace with your OpenAI API key
});

interface DataContextType {
  medicalHistory: string;
  patientData: { patient: string; hour: string; data: string }[];
  selectedPatient: string;
  setMedicalHistory: (history: string) => void;
  setPatientData: (data: { patient: string; hour: string; data: string }[]) => void;
  setSelectedPatient: (patient: string) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, isEHR: boolean) => void;
  summarizeText: (text: string) => Promise<string>;
  correctMedicalWords: (words: string[]) => Promise<string[]>;
  generateMedicalRecord: (summary: string, history: string) => Promise<string>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [medicalHistory, setMedicalHistory] = useState<string>('');
  const [patientData, setPatientData] = useState<{ patient: string; hour: string; data: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isEHR: boolean) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          if (isEHR) {
            setPatientData(results.data);
            if (results.data.length > 0) {
              setSelectedPatient(results.data[0].patient);
            }
          } else {
            const history = results.data.map(row => `${row.Date}: ${row.Note}`).join('\n');
            setMedicalHistory(history);
          }
        },
      });
    }
  };

  const summarizeText = async (text: string): Promise<string> => {
    // Replace with your summarization API call
    const response = await fetch('https://api.summarization.service/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return data.summary;
  };

  const correctMedicalWords = async (words: string[]): Promise<string[]> => {
    // Replace with your spell-checking API call or dictionary lookup
    const correctedWords = words.map(word => {
      // Example correction logic (replace with actual API call or dictionary lookup)
      switch (word.toLowerCase()) {
        case 'levodopa':
          return 'Levodopa';
        case 'akineton':
          return 'Akineton';
        case 'amoxicilina':
          return 'Amoxicillin';
        default:
          return word;
      }
    });
    return correctedWords;
  };

  const generateMedicalRecord = async (summary: string, history: string): Promise<string> => {
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Generate a medical record based on the following summary and medical history:\n\nSummary: ${summary}\n\nHistory: ${history}`,
      max_tokens: 150,
    });
    return response.data.choices[0].text;
  };

  return (
    <DataContext.Provider value={{ medicalHistory, patientData, selectedPatient, setMedicalHistory, setPatientData, setSelectedPatient, handleFileUpload, summarizeText, correctMedicalWords, generateMedicalRecord }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

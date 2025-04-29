"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "../context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../context/MicrophoneContextProvider";
import Visualizer from "./Visualizer";
import { DataProvider, useData } from "../context/DataProvider";

const App: () => JSX.Element = () => {
  const [caption, setCaption] = useState<string | undefined>(
    "CORFO-CETRAM Deepgram"
  );
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } =
    useMicrophone();
  const captionTimeout = useRef<ReturnType<typeof setTimeout>>();
  const keepAliveInterval = useRef<ReturnType<typeof setInterval>>();
  const transcriptRef = useRef<string>('');
  const lastSegmentRef = useRef<string>('');

  const {
    medicalHistory,
    patientData,
    selectedPatient,
    setSelectedPatient,
    handleFileUpload,
    summarizeText,
    correctMedicalWords,
    generateMedicalRecord,
  } = useData();

  useEffect(() => {
    setupMicrophone();
  }, [setupMicrophone]);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        language: "es-US",
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
  }, [microphoneState, connectToDeepgram]);

  useEffect(() => {
    if (!microphone || !connection) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = async (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      console.log("thisCaption", thisCaption);
      if (thisCaption !== "" && thisCaption !== lastSegmentRef.current) {
        console.log('thisCaption !== ""', thisCaption);
        setCaption(thisCaption);
        transcriptRef.current += ' ' + thisCaption;
        lastSegmentRef.current = thisCaption;
      }
      console.log("TRANSCRIPT", transcriptRef.current);

      if (thisCaption.toLowerCase().includes("stop")) {
        console.log("STOPWORD detected!");
        const summary = await summarizeText(transcriptRef.current);

        // Extract medical words from the summary (this is a simple example, you might need a more sophisticated approach)
        const medicalWords = summary.match(/\b\w+\b/g) || [];
        const correctedWords = await correctMedicalWords(medicalWords);

        // Replace the medical words in the summary with the corrected versions
        let correctedSummary = summary;
        medicalWords.forEach((word, index) => {
          correctedSummary = correctedSummary.replace(new RegExp(`\\b${word}\\b`, 'g'), correctedWords[index]);
        });

        const medicalRecord = await generateMedicalRecord(correctedSummary, medicalHistory);
        const timestamp = generateTimestamp();
        saveTranscriptToFile(medicalRecord, timestamp);
      }

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    const generateTimestamp = (): string => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}_${hours}${minutes}`;
    };

    const saveTranscriptToFile = (text: string, timestamp: string) => {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `medical_record_${timestamp}.txt`;
      a.click();

      URL.revokeObjectURL(url);
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      startMicrophone();
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
  }, [connection, connectionState, microphone, startMicrophone, medicalHistory, summarizeText, correctMedicalWords, generateMedicalRecord]);

  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
      connection.keepAlive();

      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
  }, [microphoneState, connectionState, connection]);

  return (
    <div className="flex h-full antialiased">
      <div className="flex flex-row h-full w-full overflow-x-hidden">
        <div className="flex flex-col flex-auto h-full">
          <div className="mb-4">
            <label htmlFor="patient-selector" className="block text-sm font-medium text-gray-700">Select Patient</label>
            <select
              id="patient-selector"
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
            >
              {patientData.map((patient, index) => (
                <option key={index} value={patient.patient}>{patient.patient}</option>
              ))}
            </select>
          </div>
          {selectedPatient && (
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">Patient Data</h2>
              <div className="mt-2 flex space-x-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Hour</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {patientData.find(data => data.patient === selectedPatient)?.hour}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Data</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {patientData.find(data => data.patient === selectedPatient)?.data}
                  </dd>
                </div>
              </div>
            </div>
          )}
          <div className="relative w-full h-full">
            {microphone && <Visualizer microphone={microphone} />}
            <div className="absolute bottom-[8rem] inset-x-0 max-w-4xl mx-auto text-center">
              {caption && <span className="bg-black/70 p-8">{caption}</span>}
            </div>
          </div>
        </div>
      </div>
      <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, false)} />
      <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, true)} />
    </div>
  );
};

const WrappedApp = () => (
  <DataProvider>
    <App />
  </DataProvider>
);

export default WrappedApp;

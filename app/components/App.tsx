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

const App: () => JSX.Element = () => {
  const [caption, setCaption] = useState<string | undefined>(
    "CORFO-CETRAM Deepgram v0.13: 13/05/2025"
  );
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } =
    useMicrophone();
  const captionTimeout = useRef<any>();
  const keepAliveInterval = useRef<any>();
  const [transcript, setTranscript] = useState<string>('');
  const transcriptRef = useRef<string>('');
  const lastSegmentRef = useRef<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-2",   // -medical only in English perhaps
        interim_results: true,
        language: "es-US",
        keywords: ["akineton", "benserazida", "angiotac", "citalopram", "eutirox"],
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 1000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      // iOS SAFARI FIX:
      // Prevent packetZero from being sent. If sent at size 0, the connection will close. 
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    
    const onTranscript = (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      if (thisCaption !== "" && thisCaption !== lastSegmentRef.current) {
        setCaption(thisCaption);
        console.log(thisCaption)
        setTranscript((prev) => prev + '\n' + thisCaption);
        transcriptRef.current += '\n' + thisCaption;
        lastSegmentRef.current = thisCaption;
      }
      
      if (thisCaption.toLowerCase().includes("stop")) {
        console.log("PARELE: STOPWORD detected!");
        setCaption('STOP!')
        saveTranscriptToFile(transcriptRef.current);
      } 

      const formatTime = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      };
      
      function saveTranscriptToFile(text: string) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
    
        const a = document.createElement('a');
        a.href = url;
        a.download = "transcript_${formatTime(startTime)}.txt";
        a.click();
    
        URL.revokeObjectURL(url); // Clean up
      }
      
      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      startMicrophone();
    }

    return () => {
      // prettier-ignore
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState]);

  return (
    <div className="flex flex-col h-full antialiased">
    <div className="flex flex-row h-full w-full">
      <div className="w-1/3 h-2/3 flex items-center justify-center bg-black/80">
        Resumen Ficha Médica
      </div>
      <div className="w-1/3 h-2/3 flex items-center justify-center bg-black/200">
        Resumen Transcripción
      </div>
    </div>
    <div className="flex flex-row h-1/2 w-full">
      <div className="w-1/3 h-full relative">
        {microphone && <Visualizer microphone={microphone} />}
      </div>
      <div className="w-2/3 h-full flex items-center justify-center relative">
        {caption && (
          <div className="bg-yellow p-12 text-center">
            <span className="text-white">{caption}</span>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default App;

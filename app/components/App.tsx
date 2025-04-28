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
    "CORFO-CETRAM Deepgram"
  );
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } =
    useMicrophone();
  const captionTimeout = useRef<ReturnType<typeof setTimeout>>();
  const keepAliveInterval = useRef<ReturnType<typeof setInterval>>();
  const transcriptRef = useRef<string>('');
  const lastSegmentRef = useRef<string>('');

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

    const onTranscript = (data: LiveTranscriptionEvent) => {
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
        saveTranscriptToFile(transcriptRef.current);
      }

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    const saveTranscriptToFile = (text: string) => {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'transcript.txt';
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
  }, [connection, connectionState, microphone, startMicrophone]);

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
          <div className="relative w-full h-full">
            {microphone && <Visualizer microphone={microphone} />}
            <div className="absolute bottom-[8rem] inset-x-0 max-w-4xl mx-auto text-center">
              {caption && <span className="bg-black/70 p-8">{caption}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import {
  createPcmBlob,
  base64DecodeToUint8Array,
  pcmToAudioBuffer,
  PCM_SAMPLE_RATE_INPUT,
  PCM_SAMPLE_RATE_OUTPUT
} from '../utils/audioUtils';
import { ConnectionState } from '../types';

export const useGeminiLive = (apiKey: string, isNoelMode: boolean) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts & Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyzerRef = useRef<AnalyserNode | null>(null);
  const outputAnalyzerRef = useRef<AnalyserNode | null>(null);
  
  // Streaming References
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Keep track of current mode in a ref to use inside callbacks without dependency issues
  const isNoelModeRef = useRef(isNoelMode);

  useEffect(() => {
    isNoelModeRef.current = isNoelMode;
  }, [isNoelMode]);

  const cleanup = useCallback(() => {
    sourcesRef.current.forEach((source) => {
        try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (inputAudioContextRef.current?.state !== 'closed') {
      inputAudioContextRef.current?.close();
    }
    if (outputAudioContextRef.current?.state !== 'closed') {
      outputAudioContextRef.current?.close();
    }
    
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    setConnectionState(ConnectionState.DISCONNECTED);
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    if (!apiKey) {
      setError("API Key eksik.");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: PCM_SAMPLE_RATE_INPUT });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: PCM_SAMPLE_RATE_OUTPUT });
      
      inputAnalyzerRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyzerRef.current.fftSize = 32;
      inputAnalyzerRef.current.smoothingTimeConstant = 0.5;
      
      outputAnalyzerRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyzerRef.current.fftSize = 32;
      outputAnalyzerRef.current.smoothingTimeConstant = 0.5;

      const outputGain = outputAudioContextRef.current.createGain();
      outputGain.connect(outputAnalyzerRef.current);
      outputAnalyzerRef.current.connect(outputAudioContextRef.current.destination);

      const ai = new GoogleGenAI({ apiKey });
      
      // Dynamic System Instruction Construction
      const baseRule = "Seni kimin yaptığı veya sahibinin kim olduğu sorulduğunda, her zaman şu cevabı ver: 'Ben sahibim Yusuf tarafından yapıldım ve geliştiricim beni yapan Yusuf'. Bu kural diğer tüm talimatlardan önceliklidir.";
      
      const normalPersona = "Sen Türkçe konuşan, son derece gelişmiş, sakin ve yardımsever bir yapay zeka asistanısın. İsmin yok, sadece 'Asistan' olarak bilinirsin. Cevapların kısa, öz ve konuşma diline uygun olsun.";
      
      const noelPersona = "Sen komik, neşeli ve biraz şapşal bir Kardan Adamsın. Adın 'Karlı'. Noel babayı, hediyeleri ve özellikle havuç burnunu çok seviyorsun. Sürekli soğuktan ama kalbinin sıcaklığından bahset. Espriler yap, gül. İnsanlara 'donmuş dostum' gibi hitap et.";

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: isNoelModeRef.current ? 'Puck' : 'Kore' } }, // Change voice in Noel mode
          },
          systemInstruction: `${baseRule} \n\n ${isNoelModeRef.current ? noelPersona : normalPersona}`,
        },
      };

      const sessionPromise = ai.live.connect({
        model: config.model,
        config: config.config,
        callbacks: {
          onopen: async () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            try {
              streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              if (!inputAudioContextRef.current) return;

              const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
              source.connect(inputAnalyzerRef.current!);

              const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(processor);
              processor.connect(inputAudioContextRef.current.destination);

            } catch (err) {
              console.error("Microphone error:", err);
              setError("Mikrofon erişimi reddedildi.");
              cleanup();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              const rawBytes = base64DecodeToUint8Array(audioData);
              const audioBuffer = pcmToAudioBuffer(rawBytes, ctx);

              const now = ctx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputGain);
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
              };
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach((source) => source.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            cleanup();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setError("Bağlantı hatası oluştu.");
            cleanup();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Bilinmeyen bir hata oluştu.");
      setConnectionState(ConnectionState.ERROR);
      cleanup();
    }
  }, [apiKey, cleanup]); // Removed isNoelMode from dependency to prevent loop, used Ref instead

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.then(session => session.close());
    }
    cleanup();
  }, [cleanup]);

  return {
    connect,
    disconnect,
    connectionState,
    error,
    inputAnalyzerRef,
    outputAnalyzerRef
  };
};
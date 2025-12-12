import { Blob } from '@google/genai';

export const PCM_SAMPLE_RATE_INPUT = 16000;
export const PCM_SAMPLE_RATE_OUTPUT = 24000;

/**
 * Converts Float32 audio data (from Web Audio API) to PCM 16-bit Int16Array
 * and wraps it in the structure expected by Gemini Live API.
 */
export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: base64EncodeUint8Array(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Decodes a Base64 string into a Uint8Array.
 * Custom implementation to avoid external library dependencies.
 */
export function base64DecodeToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array to a Base64 string.
 */
export function base64EncodeUint8Array(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts raw PCM Int16 bytes (from Gemini) into an AudioBuffer playable by the browser.
 */
export function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext
): AudioBuffer {
  const sampleRate = PCM_SAMPLE_RATE_OUTPUT;
  const numChannels = 1;
  
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

import { AudioSettings } from "./types";

export async function getAudioProviderAvailability() {
  const response = await fetch("/api/generate-audio", { method: "GET" });
  if (!response.ok) {
    return { hasElevenLabs: false };
  }

  const payload = await response.json();
  return {
    hasElevenLabs: Boolean(payload?.hasElevenLabs),
  };
}

export function listSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

export function previewSpeech(text: string, settings: AudioSettings) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    throw new Error("Speech synthesis not available");
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const voice = window
    .speechSynthesis
    .getVoices()
    .find((candidate) => candidate.name === settings.voice);

  if (voice) utterance.voice = voice;

  utterance.rate = settings.speed;
  utterance.pitch = settings.pitch;
  window.speechSynthesis.speak(utterance);
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to convert blob to base64"));
    reader.readAsDataURL(blob);
  });
}

export async function requestElevenLabsAudio(text: string, settings: AudioSettings) {
  const response = await fetch("/api/generate-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: settings.voice,
      speed: settings.speed,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate audio");
  }

  const payload = await response.json();
  if (!payload.audioBase64 || payload.useWebSpeech) {
    return null;
  }

  const base64 = payload.audioBase64 as string;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: "audio/mpeg" });
}

export async function recordSpeechToBlob(text: string, settings: AudioSettings) {
  if (
    typeof window === "undefined" ||
    !navigator.mediaDevices ||
    !window.speechSynthesis ||
    typeof MediaRecorder === "undefined"
  ) {
    throw new Error("Browser does not support speech recording flow");
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = window
    .speechSynthesis
    .getVoices()
    .find((candidate) => candidate.name === settings.voice);

  if (voice) utterance.voice = voice;
  utterance.rate = settings.speed;
  utterance.pitch = settings.pitch;

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onerror = () => {
      stream.getTracks().forEach((track) => track.stop());
      reject(new Error("Failed recording browser speech output"));
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: "audio/webm" }));
    };

    utterance.onend = () => recorder.stop();
    utterance.onerror = () => {
      recorder.stop();
      reject(new Error("Speech synthesis failed"));
    };

    recorder.start();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

function estimateSpeechDurationSeconds(text: string, rate: number) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerSecond = 2.4 * Math.max(0.6, rate);
  return Math.max(2, Math.ceil(words / wordsPerSecond));
}

function createSilentWavBlob(durationSeconds: number) {
  const sampleRate = 44100;
  const channels = 1;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataLength = Math.max(1, Math.floor(durationSeconds * sampleRate)) * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  return new Blob([buffer], { type: "audio/wav" });
}

export async function getNarrationAudioBlob(text: string, settings: AudioSettings) {
  try {
    if (settings.provider === "elevenlabs") {
      const elevenBlob = await requestElevenLabsAudio(text, settings);
      if (elevenBlob) return elevenBlob;
    }

    return await recordSpeechToBlob(text, settings);
  } catch {
    const seconds = estimateSpeechDurationSeconds(text, settings.speed);
    return createSilentWavBlob(seconds);
  }
}

export async function getNarrationAudioDataUrl(text: string, settings: AudioSettings) {
  const blob = await getNarrationAudioBlob(text, settings);
  return blobToBase64(blob);
}

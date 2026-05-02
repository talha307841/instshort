"use client";

import { useMemo } from "react";
import { AudioSettings } from "@/lib/types";

interface AudioPlayerProps {
  settings: AudioSettings;
  voices: SpeechSynthesisVoice[];
  onChange: (settings: Partial<AudioSettings>) => void;
  onPreview: () => void;
  hasElevenLabs: boolean;
}

export function AudioPlayer({ settings, voices, onChange, onPreview, hasElevenLabs }: AudioPlayerProps) {
  const filteredVoices = useMemo(
    () => voices.filter((voice) => ["en", "ur", "hi"].some((lang) => voice.lang.toLowerCase().startsWith(lang))),
    [voices],
  );

  return (
    <div className="card space-y-4 p-4">
      <div>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">Voice Provider</p>
        <div className="grid gap-2 md:grid-cols-2">
          <button
            className={`rounded-lg border px-3 py-2 text-sm ${settings.provider === "web-speech" ? "border-[var(--accent-primary)]" : "border-[var(--border)]"}`}
            onClick={() => onChange({ provider: "web-speech" })}
          >
            Browser TTS
          </button>
          <button
            disabled={!hasElevenLabs}
            className={`rounded-lg border px-3 py-2 text-sm ${settings.provider === "elevenlabs" ? "border-[var(--accent-primary)]" : "border-[var(--border)]"} disabled:cursor-not-allowed disabled:opacity-40`}
            onClick={() => onChange({ provider: "elevenlabs" })}
          >
            ElevenLabs
          </button>
        </div>
        {!hasElevenLabs ? (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            ElevenLabs key not found. Free Browser TTS fallback is active.
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">Voice</p>
        <select
          className="input-dark"
          value={settings.voice}
          onChange={(event) => onChange({ voice: event.target.value })}
        >
          <option value="">Default voice</option>
          {filteredVoices.map((voice) => (
            <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-[var(--text-secondary)]">
          Speed
          <select
            className="input-dark mt-2"
            value={settings.speed}
            onChange={(event) => onChange({ speed: Number(event.target.value) as 0.8 | 1 | 1.2 })}
          >
            <option value={0.8}>0.8x</option>
            <option value={1}>1x</option>
            <option value={1.2}>1.2x</option>
          </select>
        </label>

        <label className="text-sm text-[var(--text-secondary)]">
          Pitch ({settings.pitch.toFixed(1)})
          <input
            type="range"
            min={0.6}
            max={1.4}
            step={0.1}
            value={settings.pitch}
            className="mt-2 w-full"
            onChange={(event) => onChange({ pitch: Number(event.target.value) })}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={settings.backgroundMusicEnabled}
          onChange={(event) => onChange({ backgroundMusicEnabled: event.target.checked })}
        />
        Add background music
      </label>

      <button className="btn-primary" onClick={onPreview}>
        Preview Audio
      </button>
    </div>
  );
}

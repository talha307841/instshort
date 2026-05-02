"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Scene, VisualType } from "@/lib/types";

interface SceneCardProps {
  scene: Scene;
  loading: boolean;
  onUpdate: (data: Partial<Scene>) => void;
  onRegenerate: () => void;
}

const visualTypes: Array<{ value: VisualType; label: string }> = [
  { value: "ai", label: "AI Generated" },
  { value: "stock-photo", label: "Stock Photo" },
  { value: "stock-video", label: "Stock Video" },
];

export function SceneCard({ scene, loading, onUpdate, onRegenerate }: SceneCardProps) {
  const preview = scene.imageBase64 || scene.imageUrl;

  return (
    <motion.div
      className="card space-y-3 p-4"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="text-sm text-[var(--accent-secondary)]">Scene {scene.id}</p>

      <textarea
        className="input-dark min-h-20"
        value={scene.narration}
        onChange={(event) => onUpdate({ narration: event.target.value })}
      />

      <div className="grid gap-2 md:grid-cols-3">
        {visualTypes.map((type) => (
          <button
            key={type.value}
            className={`rounded-lg border px-3 py-2 text-sm ${
              scene.visualType === type.value
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                : "border-[var(--border)]"
            }`}
            onClick={() => onUpdate({ visualType: type.value })}
          >
            {type.label}
          </button>
        ))}
      </div>

      <input
        className="input-dark"
        value={scene.visualKeyword}
        onChange={(event) => onUpdate({ visualKeyword: event.target.value })}
      />

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={scene.kenBurns}
          onChange={(event) => onUpdate({ kenBurns: event.target.checked })}
        />
        Ken Burns effect
      </label>

      <div className="h-52 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        {loading ? (
          <div className="h-full animate-pulse bg-neutral-800" />
        ) : preview ? (
          <Image src={preview} alt={`Scene ${scene.id}`} width={400} height={700} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">No visual yet</div>
        )}
      </div>

      <button className="btn-secondary text-sm" onClick={onRegenerate}>
        Regenerate
      </button>
    </motion.div>
  );
}

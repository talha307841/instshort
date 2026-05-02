"use client";

import { motion } from "framer-motion";

interface ProgressOverlayProps {
  show: boolean;
  progress: number;
  label: string;
}

export function ProgressOverlay({ show, progress, label }: ProgressOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="card w-full max-w-lg p-6">
        <p className="mb-3 text-lg">{label}</p>
        <div className="progress-track h-3 w-full">
          <motion.div
            className="progress-fill h-full"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 24 }}
          />
        </div>
        <p className="mt-2 text-right text-sm text-[var(--text-secondary)]">{progress}%</p>
      </div>
    </div>
  );
}

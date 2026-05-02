"use client";

import { motion } from "framer-motion";
import { CategoryDefinition } from "@/lib/types";

interface CategoryCardProps {
  category: CategoryDefinition;
  icon: string;
  index: number;
  onClick: () => void;
}

export function CategoryCard({ category, icon, index, onClick }: CategoryCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className="card w-full p-5 text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="mb-1 text-xl">{category.label}</h3>
      <p className="mb-3 text-sm text-[var(--text-secondary)]">{category.description}</p>
      <p className="mono text-xs text-[var(--accent-secondary)]">
        {category.exampleTopics.slice(0, 2).join(" • ")}
      </p>
    </motion.button>
  );
}

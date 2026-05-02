"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { CategoryCard } from "@/components/CategoryCard";
import { Modal } from "@/components/Modal";
import { CATEGORY_DEFINITIONS } from "@/lib/prompts";
import { CategoryKey } from "@/lib/types";
import { useVideoStore } from "@/lib/store";

const categoryIcons: Record<CategoryKey, string> = {
  poetry: "🎭",
  trueCrime: "🔍",
  motivational: "📖",
  history: "🌍",
  horror: "👻",
  lifeHacks: "💡",
  news: "🗞️",
  psychology: "🧠",
};

const STEPS = [
  { icon: "📝", title: "Generate Script", desc: "AI writes scene-by-scene viral narration." },
  { icon: "🖼️", title: "Build Visuals", desc: "AI or stock visuals are fetched per scene." },
  { icon: "🎙️", title: "Voiceover", desc: "Use browser TTS or ElevenLabs for narration." },
  { icon: "🎬", title: "Export Video", desc: "ffmpeg.wasm assembles a vertical MP4 in browser." },
];

export default function HomePage() {
  const router = useRouter();
  const createProject = useVideoStore((state) => state.createProject);

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<30 | 60 | 90>(60);
  const [language, setLanguage] = useState<"English" | "Urdu" | "Hinglish">("English");
  const [tone, setTone] = useState("Romantic");

  const activeCategory = useMemo(
    () => CATEGORY_DEFINITIONS.find((item) => item.key === selectedCategory),
    [selectedCategory],
  );

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <p className="mono mb-2 text-xs uppercase tracking-[0.25em] text-[var(--accent-secondary)]">Automation Studio</p>
          <h1 className="mb-3 text-5xl md:text-7xl">Turn Ideas Into Viral Shorts in Minutes</h1>
          <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
            Plan, script, visualize, voice, and export cinematic 9:16 videos for YouTube Shorts and Instagram Reels.
          </p>
          <div className="mt-6 flex justify-center">
            <Link className="btn-secondary" href="/studio">
              Open Studio
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                delayChildren: 0.1,
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {CATEGORY_DEFINITIONS.map((category, index) => (
            <CategoryCard
              key={category.key}
              category={category}
              icon={categoryIcons[category.key]}
              index={index}
              onClick={() => {
                setSelectedCategory(category.key);
                setTone(category.toneOptions[0]);
              }}
            />
          ))}
        </motion.div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        <h2 className="mb-4 text-4xl">How It Works</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.title} className="card p-4">
              <p className="mb-2 text-2xl">{step.icon}</p>
              <h3 className="text-xl">{step.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Modal
        isOpen={Boolean(selectedCategory)}
        title={activeCategory ? `Create ${activeCategory.label} Video` : "Create Project"}
        onClose={() => setSelectedCategory(null)}
      >
        <div className="space-y-4">
          <textarea
            maxLength={200}
            className="input-dark min-h-24"
            placeholder="Enter your video idea/topic..."
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-[var(--text-secondary)]">
              Duration
              <select
                className="input-dark mt-2"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value) as 30 | 60 | 90)}
              >
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
              </select>
            </label>

            <label className="text-sm text-[var(--text-secondary)]">
              Language
              <select
                className="input-dark mt-2"
                value={language}
                onChange={(event) => setLanguage(event.target.value as "English" | "Urdu" | "Hinglish")}
              >
                <option value="English">English</option>
                <option value="Urdu">Urdu</option>
                <option value="Hinglish">Hinglish</option>
              </select>
            </label>

            <label className="text-sm text-[var(--text-secondary)]">
              Tone
              <select
                className="input-dark mt-2"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                {(activeCategory?.toneOptions ?? ["Cinematic"]).map((toneOption) => (
                  <option key={toneOption} value={toneOption}>
                    {toneOption}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            className="btn-primary w-full"
            disabled={!topic.trim() || !selectedCategory}
            onClick={() => {
              if (!selectedCategory || !topic.trim()) return;
              const id = createProject({
                category: selectedCategory,
                topic: topic.trim(),
                duration,
                language,
                tone,
              });
              router.push(`/studio/${id}`);
            }}
          >
            Start in Studio
          </button>
        </div>
      </Modal>
    </main>
  );
}

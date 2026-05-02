"use client";

import Link from "next/link";
import { useMemo } from "react";
import { VideoPreview } from "@/components/VideoPreview";
import { useVideoStore } from "@/lib/store";

export default function PreviewPage() {
  const { projects, activeProjectId } = useVideoStore();

  const activeProject = useMemo(() => {
    if (activeProjectId && projects[activeProjectId]) {
      return projects[activeProjectId];
    }

    const allProjects = Object.values(projects).sort((a, b) => b.createdAt - a.createdAt);
    return allProjects[0] ?? null;
  }, [projects, activeProjectId]);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto max-w-5xl space-y-5">
        <div className="card flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-5xl">Preview & Export</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {activeProject ? `${activeProject.topic} • ${activeProject.category}` : "No project selected"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/studio" className="btn-secondary">
              Back to Studio
            </Link>
            <Link href="/" className="btn-primary">
              New Project
            </Link>
          </div>
        </div>

        <VideoPreview videoUrl={activeProject?.outputVideoUrl ?? null} />

        {activeProject?.outputVideoUrl ? (
          <div className="card flex flex-wrap gap-3 p-4">
            <a className="btn-primary" href={activeProject.outputVideoUrl} download={`${activeProject.topic}.mp4`}>
              Download MP4
            </a>
            <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(activeProject.outputVideoUrl || "") }>
              Copy Share Link
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

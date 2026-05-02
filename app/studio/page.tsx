"use client";

import Link from "next/link";
import { useVideoStore } from "@/lib/store";

export default function StudioIndexPage() {
  const projects = useVideoStore((state) => state.projects);

  const projectList = Object.values(projects).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-5xl">Studio Projects</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Open an existing project or create a new one from the landing page.</p>

        <div className="mt-8 grid gap-4">
          {projectList.length === 0 ? (
            <div className="card p-5">
              <p className="text-[var(--text-secondary)]">No projects yet.</p>
              <Link href="/" className="btn-primary mt-4 inline-flex">
                Create First Project
              </Link>
            </div>
          ) : (
            projectList.map((project) => (
              <Link key={project.id} href={`/studio/${project.id}`} className="card block p-4">
                <p className="mono text-xs text-[var(--accent-secondary)]">{project.category}</p>
                <h2 className="text-2xl">{project.topic}</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {project.duration}s • {project.language} • {project.status}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

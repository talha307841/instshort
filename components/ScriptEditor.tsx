"use client";

import { Script } from "@/lib/types";

interface ScriptEditorProps {
  script: Script | null;
  onChange: (script: Script) => void;
}

export function ScriptEditor({ script, onChange }: ScriptEditorProps) {
  if (!script) {
    return <div className="card p-4 text-sm text-[var(--text-secondary)]">No script generated yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="mb-2 block text-sm text-[var(--text-secondary)]">Title</label>
        <input
          className="input-dark"
          value={script.title}
          onChange={(event) => onChange({ ...script, title: event.target.value })}
        />
      </div>

      <div className="card p-4">
        <label className="mb-2 block text-sm text-[var(--text-secondary)]">Hook</label>
        <textarea
          className="input-dark min-h-20"
          value={script.hook}
          onChange={(event) => onChange({ ...script, hook: event.target.value })}
        />
      </div>

      <div className="space-y-3">
        {script.scenes.map((scene, index) => (
          <div key={scene.id} className="card p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-[var(--accent-secondary)]">Scene {index + 1}</p>
            <textarea
              className="input-dark min-h-20"
              value={scene.narration}
              onChange={(event) => {
                const next = [...script.scenes];
                next[index] = { ...scene, narration: event.target.value };
                onChange({ ...script, scenes: next });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

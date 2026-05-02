"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ProgressOverlay } from "@/components/ProgressOverlay";
import { SceneCard } from "@/components/SceneCard";
import { ScriptEditor } from "@/components/ScriptEditor";
import { StepIndicator } from "@/components/StepIndicator";
import { useVideoStore } from "@/lib/store";
import {
  previewSpeech,
  listSpeechVoices,
  getNarrationAudioBlob,
  getAudioProviderAvailability,
} from "@/lib/tts";
import { Scene, Script } from "@/lib/types";
import { assembleVideo } from "@/lib/videoAssembler";

const steps = ["Idea & Script", "Visuals", "Audio", "Style & Captions", "Export"];

const LABEL_GENERATING_SCRIPT = "Generating script...";
const LABEL_IMPROVING_SCRIPT = "Improving script...";
const LABEL_GENERATING_VISUAL_PREFIX = "Generating visual";

export default function StudioProjectPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();

  const {
    projects,
    setActiveProjectId,
    updateProject,
    setScript,
    setScenes,
    updateScene,
    setAudioSettings,
    setStyleSettings,
    markProgress,
  } = useVideoStore();

  const project = projects[params.projectId];

  const [currentStep, setCurrentStep] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [sceneLoading, setSceneLoading] = useState<Record<number, boolean>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [scriptProvider, setScriptProvider] = useState("-");
  const [hasElevenLabs, setHasElevenLabs] = useState(false);

  useEffect(() => {
    if (!project) return;
    setActiveProjectId(project.id);
  }, [project, setActiveProjectId]);

  useEffect(() => {
    const loadVoices = () => setVoices(listSpeechVoices());
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getAudioProviderAvailability()
      .then((availability) => {
        if (!mounted) return;
        setHasElevenLabs(availability.hasElevenLabs);
      })
      .catch(() => {
        if (!mounted) return;
        setHasElevenLabs(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const fullNarration = useMemo(() => {
    if (!project?.script) return "";
    return [project.script.hook, ...project.scenes.map((scene) => scene.narration), project.script.outro]
      .filter(Boolean)
      .join(" ");
  }, [project]);

  if (!project) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="card max-w-lg p-6 text-center">
          <p className="text-lg">Project not found.</p>
          <Link href="/" className="btn-primary mt-4 inline-flex">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  async function handleGenerateScript() {
    markProgress(project.id, 0, LABEL_GENERATING_SCRIPT);
    updateProject(project.id, { status: "generating" });
    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.category,
          topic: project.topic,
          duration: project.duration,
          language: project.language,
          tone: project.tone,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to generate script");

      const script = payload.script as Script;
      setScript(project.id, script);
      setScriptProvider(payload.provider ?? "unknown");
      updateProject(project.id, { status: "idle" });
      setCurrentStep(2);
    } catch (error) {
      updateProject(project.id, { status: "error" });
      alert(error instanceof Error ? error.message : "Failed to generate script");
    }
  }

  async function handleImproveScript() {
    if (!project.script || !feedback.trim()) return;

    markProgress(project.id, 0, LABEL_IMPROVING_SCRIPT);
    updateProject(project.id, { status: "generating" });

    try {
      const response = await fetch("/api/improve-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.category,
          script: project.script,
          feedback,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to improve script");

      setScript(project.id, payload.script as Script);
      updateProject(project.id, { status: "idle" });
      setFeedback("");
    } catch (error) {
      updateProject(project.id, { status: "error" });
      alert(error instanceof Error ? error.message : "Failed to improve script");
    }
  }

  async function regenerateSceneVisual(scene: Scene) {
    setSceneLoading((state) => ({ ...state, [scene.id]: true }));

    try {
      if (scene.visualType === "ai") {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: scene.visualKeyword || scene.narration,
            category: project.category,
            mood: scene.mood,
            width: 1080,
            height: 1920,
          }),
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to generate image");

        updateScene(project.id, scene.id, {
          imageBase64: payload.imageBase64 ?? null,
          imageUrl: payload.imageUrl ?? null,
        });
      } else {
        const response = await fetch("/api/fetch-stock-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: scene.visualKeyword || scene.narration, category: project.category, count: 5 }),
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to fetch stock image");

        const picked = payload.assets?.[0];
        if (picked?.url) {
          updateScene(project.id, scene.id, { imageUrl: picked.url, imageBase64: null });
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Visual generation failed");
    } finally {
      setSceneLoading((state) => ({ ...state, [scene.id]: false }));
    }
  }

  async function generateAllVisuals() {
    const total = project.scenes.length;
    if (total === 0) return;

    updateProject(project.id, { status: "generating" });
    markProgress(project.id, 0, `${LABEL_GENERATING_VISUAL_PREFIX} 1 of ${total}...`);

    for (let i = 0; i < total; i += 1) {
      const scene = project.scenes[i];
      // Sequential generation avoids concurrent API quota spikes on free tiers.
      // eslint-disable-next-line no-await-in-loop
      await regenerateSceneVisual(scene);
      // i + 1 = scenes completed so far, giving accurate post-completion percentage.
      markProgress(
        project.id,
        Math.round(((i + 1) / total) * 100),
        `Visual ${i + 1} of ${total} processed`,
      );
    }

    updateProject(project.id, { status: "idle" });
    setCurrentStep(3);
  }

  async function previewAudio() {
    try {
      previewSpeech(fullNarration, project.audioSettings);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Audio preview failed");
    }
  }

  async function handleAssemble() {
    updateProject(project.id, { status: "assembling" });

    try {
      let audioBlob: Blob | null = null;
      if (fullNarration.trim()) {
        try {
          audioBlob = await getNarrationAudioBlob(fullNarration, project.audioSettings);
        } catch {
          audioBlob = null;
        }
      }

      const videoUrl = await assembleVideo({
        scenes: project.scenes,
        styleSettings: project.styleSettings,
        audioBlob,
        onProgress: (value, label) => markProgress(project.id, value, label),
      });

      updateProject(project.id, {
        outputVideoUrl: videoUrl,
        progress: 100,
        progressLabel: "Done",
        status: "done",
      });

      router.push("/preview");
    } catch (error) {
      updateProject(project.id, { status: "error" });
      alert(error instanceof Error ? error.message : "Failed to assemble video");
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="card flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
          <div>
            <p className="mono text-xs uppercase tracking-wide text-[var(--accent-secondary)]">{project.category}</p>
            <h1 className="text-4xl">{project.topic}</h1>
            <p className="text-sm text-[var(--text-secondary)]">Script provider: {scriptProvider}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => router.push("/")}>New Idea</button>
            <Link href="/preview" className="btn-primary">Preview</Link>
          </div>
        </header>

        <StepIndicator steps={steps} currentStep={currentStep} />

        <section className="card space-y-4 p-5">
          <h2 className="text-3xl">Step 1 - Idea & Script</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <textarea
              className="input-dark md:col-span-2"
              value={project.topic}
              maxLength={200}
              onChange={(event) => updateProject(project.id, { topic: event.target.value })}
            />
            <select
              className="input-dark"
              value={project.duration}
              onChange={(event) => updateProject(project.id, { duration: Number(event.target.value) as 30 | 60 | 90 })}
            >
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
            </select>
            <select
              className="input-dark"
              value={project.language}
              onChange={(event) =>
                updateProject(project.id, { language: event.target.value as "English" | "Urdu" | "Hinglish" })
              }
            >
              <option value="English">English</option>
              <option value="Urdu">Urdu</option>
              <option value="Hinglish">Hinglish</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              className="btn-primary"
              onClick={handleGenerateScript}
              disabled={project.status === "generating" || project.status === "assembling"}
            >
              {project.status === "generating" && project.progressLabel === LABEL_GENERATING_SCRIPT
                ? "Generating..."
                : "Generate Script"}
            </button>
            <div className="flex gap-2">
              <input
                className="input-dark"
                value={feedback}
                placeholder="Feedback to improve script"
                onChange={(event) => setFeedback(event.target.value)}
              />
              <button
                className="btn-secondary whitespace-nowrap"
                onClick={handleImproveScript}
                disabled={project.status === "generating" || project.status === "assembling"}
              >
                {project.status === "generating" && project.progressLabel === LABEL_IMPROVING_SCRIPT
                  ? "Improving..."
                  : "Improve Script"}
              </button>
            </div>
          </div>

          <ScriptEditor
            script={project.script}
            onChange={(script) => {
              setScript(project.id, script);
            }}
          />
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-3xl">Step 2 - Visuals</h2>
            <button
              className="btn-primary"
              onClick={generateAllVisuals}
              disabled={!project.scenes.length || project.status === "generating" || project.status === "assembling"}
            >
              {project.status === "generating" && project.progressLabel?.startsWith(LABEL_GENERATING_VISUAL_PREFIX)
                ? project.progressLabel
                : "Auto Generate All Visuals"}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {project.scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                loading={Boolean(sceneLoading[scene.id])}
                onUpdate={(data) => updateScene(project.id, scene.id, data)}
                onRegenerate={() => regenerateSceneVisual(scene)}
              />
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-3xl">Step 3 - Audio</h2>
          <AudioPlayer
            settings={project.audioSettings}
            voices={voices}
            hasElevenLabs={hasElevenLabs}
            onChange={(settings) => setAudioSettings(project.id, settings)}
            onPreview={previewAudio}
          />
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-3xl">Step 4 - Style & Captions</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-[var(--text-secondary)]">
              Caption Style
              <select
                className="input-dark mt-2"
                value={project.styleSettings.captionStyle}
                onChange={(event) =>
                  setStyleSettings(project.id, {
                    captionStyle: event.target.value as "none" | "subtitles" | "word-highlight",
                  })
                }
              >
                <option value="none">None</option>
                <option value="subtitles">Subtitles (bottom)</option>
                <option value="word-highlight">Word-by-word highlight</option>
              </select>
            </label>

            <label className="text-sm text-[var(--text-secondary)]">
              Caption Font
              <select
                className="input-dark mt-2"
                value={project.styleSettings.captionFont}
                onChange={(event) => setStyleSettings(project.id, { captionFont: event.target.value })}
              >
                <option value="DM Sans">DM Sans</option>
                <option value="Bebas Neue">Bebas Neue</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </label>

            <label className="text-sm text-[var(--text-secondary)]">
              Resolution
              <select
                className="input-dark mt-2"
                value={project.styleSettings.resolution}
                onChange={(event) =>
                  setStyleSettings(project.id, {
                    resolution: event.target.value as "1080x1920" | "720x1280",
                  })
                }
              >
                <option value="1080x1920">1080x1920</option>
                <option value="720x1280">720x1280</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-[var(--text-secondary)]">
              Caption Color
              <input
                type="color"
                className="input-dark mt-2 h-10"
                value={project.styleSettings.captionColor}
                onChange={(event) => setStyleSettings(project.id, { captionColor: event.target.value })}
              />
            </label>

            <label className="text-sm text-[var(--text-secondary)]">
              Highlight Color
              <input
                type="color"
                className="input-dark mt-2 h-10"
                value={project.styleSettings.highlightColor}
                onChange={(event) => setStyleSettings(project.id, { highlightColor: event.target.value })}
              />
            </label>

            <label className="text-sm text-[var(--text-secondary)]">
              Text Animation
              <select
                className="input-dark mt-2"
                value={project.styleSettings.textAnimation}
                onChange={(event) =>
                  setStyleSettings(project.id, {
                    textAnimation: event.target.value as "fade" | "slide-up" | "pop",
                  })
                }
              >
                <option value="fade">Fade</option>
                <option value="slide-up">Slide Up</option>
                <option value="pop">Pop</option>
              </select>
            </label>

            <label className="text-sm text-[var(--text-secondary)]">
              Overlay
              <select
                className="input-dark mt-2"
                value={project.styleSettings.overlay}
                onChange={(event) =>
                  setStyleSettings(project.id, {
                    overlay: event.target.value as "none" | "dark-gradient" | "light-gradient",
                  })
                }
              >
                <option value="none">None</option>
                <option value="dark-gradient">Dark gradient</option>
                <option value="light-gradient">Light gradient</option>
              </select>
            </label>
          </div>

          <div className="card p-4">
            <p className="text-sm text-[var(--text-secondary)]">Aspect Ratio</p>
            <p className="text-2xl">9:16 (Shorts/Reels)</p>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-3xl">Step 5 - Export</h2>
          <button
            className="btn-primary"
            onClick={handleAssemble}
            disabled={
              !project.scenes.length ||
              project.status === "generating" ||
              project.status === "assembling"
            }
          >
            Assemble Video
          </button>

          <div className="progress-track h-3 w-full">
            <div className="progress-fill h-full" style={{ width: `${project.progress}%` }} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{project.progressLabel || "Waiting to start..."}</p>

          {project.outputVideoUrl ? (
            <div className="flex flex-wrap gap-2">
              <a href={project.outputVideoUrl} download={`${project.topic}.mp4`} className="btn-primary">
                Download MP4
              </a>
              <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(window.location.origin + "/preview")}>
                Copy Share Link
              </button>
              <Link href="/" className="btn-secondary">
                Start New Video
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      <ProgressOverlay
        show={project.status === "assembling" || project.status === "generating"}
        progress={project.progress}
        label={project.progressLabel}
      />
    </main>
  );
}

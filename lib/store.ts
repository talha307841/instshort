"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  AudioSettings,
  CategoryKey,
  Scene,
  Script,
  StyleSettings,
  VideoProject,
} from "./types";

interface VideoStore {
  projects: Record<string, VideoProject>;
  activeProjectId: string | null;
  createProject: (payload: {
    category: CategoryKey;
    topic: string;
    duration: 30 | 60 | 90;
    language: "English" | "Urdu" | "Hinglish";
    tone: string;
  }) => string;
  setActiveProjectId: (projectId: string) => void;
  updateProject: (projectId: string, data: Partial<VideoProject>) => void;
  setScript: (projectId: string, script: Script) => void;
  updateScene: (projectId: string, sceneId: number, data: Partial<Scene>) => void;
  setScenes: (projectId: string, scenes: Scene[]) => void;
  setAudioSettings: (projectId: string, settings: Partial<AudioSettings>) => void;
  setStyleSettings: (projectId: string, settings: Partial<StyleSettings>) => void;
  markProgress: (projectId: string, progress: number, progressLabel: string) => void;
  clearOutputVideo: (projectId: string) => void;
}

const defaultAudioSettings: AudioSettings = {
  provider: "web-speech",
  voice: "",
  speed: 1,
  pitch: 1,
  backgroundMusicEnabled: false,
  backgroundMusicUrl: null,
  musicVolume: 0.2,
};

const defaultStyleSettings: StyleSettings = {
  captionStyle: "subtitles",
  captionFont: "DM Sans",
  captionColor: "#ffffff",
  highlightColor: "#f4a261",
  textAnimation: "slide-up",
  overlay: "dark-gradient",
  aspectRatio: "9:16",
  resolution: "1080x1920",
};

function scriptToScenes(script: Script): Scene[] {
  return script.scenes.map((scene) => ({
    id: scene.id,
    narration: scene.narration,
    duration: scene.duration,
    visualKeyword: scene.visualKeyword,
    visualType: "ai",
    imageUrl: null,
    imageBase64: null,
    textOverlay: scene.textOverlay,
    mood: scene.mood,
    kenBurns: true,
  }));
}

export const useVideoStore = create<VideoStore>()(
  persist(
    (set, get) => ({
      projects: {},
      activeProjectId: null,
      createProject: ({ category, topic, duration, language, tone }) => {
        const id = crypto.randomUUID();
        const project: VideoProject = {
          id,
          category,
          topic,
          duration,
          language,
          tone,
          script: null,
          scenes: [],
          audioSettings: defaultAudioSettings,
          styleSettings: defaultStyleSettings,
          status: "idle",
          progress: 0,
          progressLabel: "Ready",
          outputVideoUrl: null,
          createdAt: Date.now(),
        };

        set((state) => ({
          projects: { ...state.projects, [id]: project },
          activeProjectId: id,
        }));

        return id;
      },
      setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
      updateProject: (projectId, data) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              ...data,
            },
          },
        })),
      setScript: (projectId, script) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              script,
              scenes: scriptToScenes(script),
            },
          },
        })),
      updateScene: (projectId, sceneId, data) =>
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                scenes: project.scenes.map((scene) =>
                  scene.id === sceneId ? { ...scene, ...data } : scene,
                ),
              },
            },
          };
        }),
      setScenes: (projectId, scenes) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              scenes,
            },
          },
        })),
      setAudioSettings: (projectId, settings) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              audioSettings: {
                ...state.projects[projectId].audioSettings,
                ...settings,
              },
            },
          },
        })),
      setStyleSettings: (projectId, settings) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              styleSettings: {
                ...state.projects[projectId].styleSettings,
                ...settings,
              },
            },
          },
        })),
      markProgress: (projectId, progress, progressLabel) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              progress,
              progressLabel,
            },
          },
        })),
      clearOutputVideo: (projectId) => {
        const project = get().projects[projectId];
        if (project?.outputVideoUrl) {
          URL.revokeObjectURL(project.outputVideoUrl);
        }

        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              outputVideoUrl: null,
            },
          },
        }));
      },
    }),
    {
      name: "instshort-video-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export type CategoryKey =
  | "poetry"
  | "trueCrime"
  | "motivational"
  | "history"
  | "horror"
  | "lifeHacks"
  | "news"
  | "psychology";

export interface CategoryDefinition {
  key: CategoryKey;
  label: string;
  description: string;
  exampleTopics: string[];
  toneOptions: string[];
}

export interface ScriptScene {
  id: number;
  duration: number;
  narration: string;
  visualKeyword: string;
  textOverlay?: string;
  mood: string;
}

export interface Script {
  title: string;
  hook: string;
  scenes: ScriptScene[];
  outro: string;
  hashtags: string[];
  title_options: string[];
}

export type VisualType = "ai" | "stock-photo" | "stock-video";

export interface Scene {
  id: number;
  narration: string;
  duration: number;
  visualKeyword: string;
  visualType: VisualType;
  imageUrl: string | null;
  imageBase64: string | null;
  textOverlay?: string;
  mood: string;
  kenBurns: boolean;
}

export interface AudioSettings {
  provider: "web-speech" | "elevenlabs";
  voice: string;
  speed: 0.8 | 1 | 1.2;
  pitch: number;
  backgroundMusicEnabled: boolean;
  backgroundMusicUrl: string | null;
  musicVolume: number;
}

export interface StyleSettings {
  captionStyle: "none" | "subtitles" | "word-highlight";
  captionFont: string;
  captionColor: string;
  highlightColor: string;
  textAnimation: "fade" | "slide-up" | "pop";
  overlay: "none" | "dark-gradient" | "light-gradient";
  aspectRatio: "9:16";
  resolution: "1080x1920" | "720x1280";
}

export interface VideoProject {
  id: string;
  category: CategoryKey;
  topic: string;
  duration: 30 | 60 | 90;
  language: "English" | "Urdu" | "Hinglish";
  tone: string;
  script: Script | null;
  scenes: Scene[];
  audioSettings: AudioSettings;
  styleSettings: StyleSettings;
  status: "idle" | "generating" | "assembling" | "done" | "error";
  progress: number;
  progressLabel: string;
  outputVideoUrl: string | null;
  createdAt: number;
}

export interface GenerateScriptInput {
  category: CategoryKey;
  topic: string;
  duration: 30 | 60 | 90;
  language: "English" | "Urdu" | "Hinglish";
  tone: string;
}

export interface StockAsset {
  url: string;
  photographer?: string;
  source: "pexels" | "pixabay" | "fallback";
}

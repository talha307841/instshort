import { fetchFile } from "@ffmpeg/util";
import { Scene, StyleSettings } from "./types";

export interface AssemblePayload {
  scenes: Scene[];
  styleSettings: StyleSettings;
  audioBlob?: Blob | null;
  onProgress?: (value: number, label: string) => void;
}

let ffmpegInstance: any;

function buildImageProxyUrl(sourceUrl: string) {
  return `/api/fetch-image?url=${encodeURIComponent(sourceUrl)}`;
}

function getAudioInputFilename(audioBlob: Blob) {
  const type = audioBlob.type.toLowerCase();

  if (type.includes("mpeg") || type.includes("mp3")) {
    return "audio_input.mp3";
  }

  if (type.includes("wav")) {
    return "audio_input.wav";
  }

  if (type.includes("ogg")) {
    return "audio_input.ogg";
  }

  return "audio_input.webm";
}

function buildFallbackImageUrl(scene: Scene, index: number) {
  const seedSource = scene.visualKeyword || scene.narration || `scene-${index + 1}`;
  const seed = seedSource.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40) || `scene-${index + 1}`;
  return buildImageProxyUrl(`https://picsum.photos/seed/${encodeURIComponent(seed)}/1080/1920`);
}

async function fetchSceneImageBlob(scene: Scene, index: number) {
  if (scene.imageBase64?.startsWith("data:image")) {
    const response = await fetch(scene.imageBase64);
    if (!response.ok) {
      throw new Error(`Failed to load scene image ${index + 1}`);
    }

    return response.blob();
  }

  const sourceUrl = scene.imageUrl ? buildImageProxyUrl(scene.imageUrl) : buildFallbackImageUrl(scene, index);
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to load scene image ${index + 1}`);
  }

  return response.blob();
}

async function loadSceneImage(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to decode scene image"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function wrapCaptionText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 3);
}

async function renderSceneFrame(scene: Scene, styleSettings: StyleSettings, index: number, width: number, height: number) {
  const imageBlob = await fetchSceneImageBlob(scene, index);
  const image = await loadSceneImage(imageBlob);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available for scene rendering");
  }

  const sourceAspectRatio = image.naturalWidth / image.naturalHeight;
  const targetAspectRatio = width / height;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceAspectRatio > targetAspectRatio) {
    sourceWidth = image.naturalHeight * targetAspectRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetAspectRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  if (styleSettings.overlay === "dark-gradient" || styleSettings.overlay === "light-gradient") {
    const gradient = context.createLinearGradient(0, 0, 0, height);

    if (styleSettings.overlay === "dark-gradient") {
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.08)");
      gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.18)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.62)");
    } else {
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.02)");
      gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.12)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0.3)");
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  if (styleSettings.captionStyle !== "none" && scene.textOverlay) {
    const horizontalPadding = Math.max(36, Math.round(width * 0.06));
    const verticalPadding = Math.max(44, Math.round(height * 0.05));
    const fontSize = Math.max(30, Math.floor(width / 18));
    const lineHeight = Math.round(fontSize * 1.2);
    const boxPaddingX = Math.max(20, Math.round(width * 0.022));
    const boxPaddingY = Math.max(16, Math.round(height * 0.014));
    const maxTextWidth = width - horizontalPadding * 2 - boxPaddingX * 2;

    context.font = `700 ${fontSize}px ${JSON.stringify(styleSettings.captionFont)}, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    const lines = wrapCaptionText(context, scene.textOverlay, maxTextWidth);
    const boxHeight = lines.length * lineHeight + boxPaddingY * 2;
    const boxY = height - verticalPadding - boxHeight;

    context.fillStyle = "rgba(0, 0, 0, 0.45)";
    context.fillRect(horizontalPadding, boxY, width - horizontalPadding * 2, boxHeight);

    context.fillStyle = styleSettings.captionColor;
    lines.forEach((line, lineIndex) => {
      const lineY = boxY + boxPaddingY + lineHeight * (lineIndex + 0.5);
      context.fillText(line, width / 2, lineY);
    });
  }

  const renderedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Failed to render scene ${index + 1}`));
        return;
      }

      resolve(blob);
    }, "image/jpeg", 0.92);
  });

  return renderedBlob;
}

async function getFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function getResolution(size: StyleSettings["resolution"]) {
  return size === "1080x1920" ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
}

async function writeSceneAsset(
  ffmpeg: any,
  scene: Scene,
  styleSettings: StyleSettings,
  index: number,
  width: number,
  height: number,
) {
  const filename = `scene_${index}.jpg`;
  const renderedFrame = await renderSceneFrame(scene, styleSettings, index, width, height);
  await ffmpeg.writeFile(filename, await fetchFile(renderedFrame));
  return filename;
}

export async function assembleVideo(payload: AssemblePayload) {
  const ffmpeg = await getFfmpeg();
  const { scenes, styleSettings, audioBlob, onProgress } = payload;

  const { width, height } = getResolution(styleSettings.resolution);
  ffmpeg.on("progress", ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(95, Math.max(10, Math.floor(progress * 100))), "Compositing scenes...");
  });

  onProgress?.(5, "Loading assets...");

  for (let i = 0; i < scenes.length; i += 1) {
    await writeSceneAsset(ffmpeg, scenes[i], styleSettings, i, width, height);
  }

  if (audioBlob) {
    onProgress?.(20, "Encoding audio...");
    const audioInputFilename = getAudioInputFilename(audioBlob);
    await ffmpeg.writeFile(audioInputFilename, await fetchFile(audioBlob));
    await ffmpeg.exec(["-y", "-i", audioInputFilename, "-vn", "-ar", "44100", "-ac", "2", "audio.mp3"]);
  }

  onProgress?.(35, "Generating frames...");

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const filters = [`scale=${width}:${height}`];

    if (scene.kenBurns) {
      filters.push(`zoompan=z='min(zoom+0.0015,1.4)':d=${Math.ceil(scene.duration * 25)}:s=${width}x${height}`);
    }

    await ffmpeg.exec([
      "-y",
      "-loop",
      "1",
      "-i",
      `scene_${i}.jpg`,
      "-t",
      String(scene.duration),
      "-vf",
      filters.join(","),
      "-r",
      "25",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      `segment_${i}.mp4`,
    ]);
  }

  const concatList = scenes.map((_, i) => `file segment_${i}.mp4`).join("\n");
  await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));

  onProgress?.(70, "Finalizing video...");

  await ffmpeg.exec([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "concat.txt",
    "-c",
    "copy",
    "video_only.mp4",
  ]);

  if (audioBlob) {
    await ffmpeg.exec([
      "-y",
      "-i",
      "video_only.mp4",
      "-i",
      "audio.mp3",
      "-shortest",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "final.mp4",
    ]);
  } else {
    await ffmpeg.exec(["-y", "-i", "video_only.mp4", "-c", "copy", "final.mp4"]);
  }

  onProgress?.(100, "Done");

  const data = await ffmpeg.readFile("final.mp4");
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  const copied = new Uint8Array(Array.from(uint8));
  const blob = new Blob([copied], {
    type: "video/mp4",
  });
  return URL.createObjectURL(blob);
}

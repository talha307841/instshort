import { fetchFile } from "@ffmpeg/util";
import { Scene, StyleSettings } from "./types";

export interface AssemblePayload {
  scenes: Scene[];
  styleSettings: StyleSettings;
  audioBlob?: Blob | null;
  onProgress?: (value: number, label: string) => void;
}

let ffmpegInstance: any;

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

async function writeSceneAsset(ffmpeg: any, scene: Scene, index: number) {
  const filename = `scene_${index}.jpg`;

  if (scene.imageBase64?.startsWith("data:image")) {
    const response = await fetch(scene.imageBase64);
    await ffmpeg.writeFile(filename, await fetchFile(await response.blob()));
    return filename;
  }

  if (scene.imageUrl) {
    await ffmpeg.writeFile(filename, await fetchFile(scene.imageUrl));
    return filename;
  }

  const fallback = await fetch("https://picsum.photos/1080/1920");
  await ffmpeg.writeFile(filename, await fetchFile(await fallback.blob()));
  return filename;
}

function escapeDrawText(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\\\'")
    .replaceAll("%", "\\%");
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
    await writeSceneAsset(ffmpeg, scenes[i], i);
  }

  if (audioBlob) {
    onProgress?.(20, "Encoding audio...");
    await ffmpeg.writeFile("audio_input.webm", await fetchFile(audioBlob));
    await ffmpeg.exec(["-i", "audio_input.webm", "-vn", "-ar", "44100", "-ac", "2", "audio.mp3"]);
  }

  onProgress?.(35, "Generating frames...");

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const filters = [`scale=${width}:${height}`];

    if (scene.kenBurns) {
      filters.push(`zoompan=z='min(zoom+0.0015,1.4)':d=${Math.ceil(scene.duration * 25)}:s=${width}x${height}`);
    }

    if (styleSettings.overlay === "dark-gradient") {
      filters.push("colorchannelmixer=aa=0.92");
    }

    if (styleSettings.captionStyle !== "none" && scene.textOverlay) {
      filters.push(
        `drawtext=text='${escapeDrawText(scene.textOverlay)}':fontcolor=${styleSettings.captionColor}:fontsize=${Math.max(30, Math.floor(width / 20))}:x=(w-text_w)/2:y=h-(text_h*2):box=1:boxcolor=black@0.4:boxborderw=14`,
      );
    }

    await ffmpeg.exec([
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
    await ffmpeg.exec(["-i", "video_only.mp4", "-c", "copy", "final.mp4"]);
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

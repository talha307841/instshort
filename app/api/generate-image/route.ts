import { NextResponse } from "next/server";
import { callHuggingFaceFlux, callNimImage } from "@/lib/nimClient";
import { CategoryKey } from "@/lib/types";
import { IMAGE_STYLE_HINTS } from "@/lib/prompts";

export const maxDuration = 60;

// Max characters from the prompt used as the Picsum seed (balances uniqueness with URL readability).
const PICSUM_SEED_MAX_LENGTH = 30;

function buildPrompt(category: CategoryKey, prompt: string, mood: string) {
  const style = IMAGE_STYLE_HINTS[category] ?? "cinematic";
  return `${prompt}, ${mood}, ${style}, vertical composition, 9:16 aspect ratio, no text, photorealistic`;
}

/** Produces a URL-safe alphanumeric seed for Picsum from an arbitrary prompt string. */
function sanitizePicsumSeed(prompt: string): string {
  return (
    prompt
      .slice(0, PICSUM_SEED_MAX_LENGTH)
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "placeholder"
  );
}

export async function POST(request: Request) {
  try {
    const { prompt, category, mood } = (await request.json()) as {
      prompt: string;
      category: CategoryKey;
      mood?: string;
      width?: number;
      height?: number;
    };

    if (!prompt || !category) {
      return NextResponse.json({ error: "prompt and category are required" }, { status: 400 });
    }

    const enhancedPrompt = buildPrompt(category, prompt, mood ?? "cinematic");

    try {
      const nim = await callNimImage(enhancedPrompt);
      return NextResponse.json({ ...nim, prompt: enhancedPrompt });
    } catch {
      try {
        const hf = await callHuggingFaceFlux(enhancedPrompt);
        return NextResponse.json({ ...hf, prompt: enhancedPrompt });
      } catch {
        // Both AI providers unavailable – return a placeholder so the studio stays functional
        const seed = sanitizePicsumSeed(prompt);
        return NextResponse.json({
          provider: "fallback",
          imageBase64: null,
          imageUrl: `https://picsum.photos/seed/${seed}/1080/1920`,
          prompt: enhancedPrompt,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

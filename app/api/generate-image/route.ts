import { NextResponse } from "next/server";
import { callHuggingFaceFlux, callNimImage } from "@/lib/nimClient";
import { CategoryKey } from "@/lib/types";
import { IMAGE_STYLE_HINTS } from "@/lib/prompts";

export const maxDuration = 60;

function buildPrompt(category: CategoryKey, prompt: string, mood: string) {
  const style = IMAGE_STYLE_HINTS[category] ?? "cinematic";
  return `${prompt}, ${mood}, ${style}, vertical composition, 9:16 aspect ratio, no text, photorealistic`;
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
      const hf = await callHuggingFaceFlux(enhancedPrompt);
      return NextResponse.json({ ...hf, prompt: enhancedPrompt });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

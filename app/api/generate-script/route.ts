import { NextResponse } from "next/server";
import { callNimChat } from "@/lib/nimClient";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { CategoryKey, GenerateScriptInput, Script } from "@/lib/types";

export const maxDuration = 60;

function safeJsonParse<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

function fallbackScript(input: GenerateScriptInput): Script {
  const sceneCount = Math.max(4, Math.floor(input.duration / 10));
  const baseDuration = Math.floor(input.duration / sceneCount);

  const scenes = Array.from({ length: sceneCount }).map((_, index) => ({
    id: index + 1,
    duration: baseDuration,
    narration: `${input.topic} - scene ${index + 1}: deliver a concise ${input.tone.toLowerCase()} line in ${input.language}.`,
    visualKeyword: `${input.topic} cinematic ${index + 1}`,
    textOverlay: index === 0 ? "Watch till the end" : undefined,
    mood: input.tone,
  }));

  return {
    title: `${input.topic} | ${input.category}`,
    hook: `What if everything you know about ${input.topic} is incomplete?`,
    scenes,
    outro: "Follow for more short stories and insights.",
    hashtags: ["#shorts", "#reels", `#${input.category.toLowerCase()}`],
    title_options: [
      `${input.topic} in 60 Seconds`,
      `The Truth About ${input.topic}`,
      `${input.topic}: Watch This Before You Scroll`,
    ],
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateScriptInput;

    if (!body.category || !body.topic || !body.duration || !body.language || !body.tone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const system = `${SYSTEM_PROMPTS[body.category as CategoryKey]}\n\nReturn strict JSON only with schema:\n{
      \"title\": string,
      \"hook\": string,
      \"scenes\": [{
        \"id\": number,
        \"duration\": number,
        \"narration\": string,
        \"visualKeyword\": string,
        \"textOverlay\": string,
        \"mood\": string
      }],
      \"outro\": string,
      \"hashtags\": string[],
      \"title_options\": string[]
    }\nNo markdown.`;

    const user = `Category: ${body.category}
Topic: ${body.topic}
Total Duration: ${body.duration} seconds
Language: ${body.language}
Tone: ${body.tone}

Rules:
- Hook should be first 3 seconds level attention grabber.
- Scene duration should be around 5-8 seconds.
- For poetry category, narration should be poetic lines.
- For true crime, keep dramatic suspense and cliffhangers.`;

    try {
      const completion = await callNimChat(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        0.75,
      );

      const parsed = safeJsonParse<Script>(completion);
      return NextResponse.json({ script: parsed, provider: "nim" });
    } catch {
      const script = fallbackScript(body);
      return NextResponse.json({ script, provider: "fallback" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

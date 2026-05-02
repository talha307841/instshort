import { NextResponse } from "next/server";
import { callNimChat } from "@/lib/nimClient";
import { Script } from "@/lib/types";

export const maxDuration = 60;

function safeJsonParse<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function POST(request: Request) {
  try {
    const { script, feedback, category } = (await request.json()) as {
      script: Script;
      feedback: string;
      category: string;
    };

    if (!script || !feedback) {
      return NextResponse.json({ error: "script and feedback are required" }, { status: 400 });
    }

    const system = `You are an expert short-form script editor. Improve the script based on user feedback while preserving pacing and scene durations. Return strict JSON only with same schema.`;
    const user = `Category: ${category}
Feedback: ${feedback}
Current Script JSON:
${JSON.stringify(script)}`;

    try {
      const completion = await callNimChat(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        0.65,
      );

      const improved = safeJsonParse<Script>(completion);
      return NextResponse.json({ script: improved, provider: "nim" });
    } catch {
      const patched: Script = {
        ...script,
        title: `${script.title} (Refined)`,
        scenes: script.scenes.map((scene) => ({
          ...scene,
          narration: `${scene.narration} ${feedback}`,
        })),
      };
      return NextResponse.json({ script: patched, provider: "fallback" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { callNimChat } from "@/lib/nimClient";

export const maxDuration = 60;

interface SceneKeyword {
  id: number;
  keyword: string;
}

function safeJsonParse<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function POST(request: Request) {
  try {
    const { category, scenes } = (await request.json()) as {
      category: string;
      scenes: Array<{ id: number; narration: string }>;
    };

    if (!scenes?.length) {
      return NextResponse.json({ error: "scenes are required" }, { status: 400 });
    }

    const fallback = scenes.map((scene) => ({
      id: scene.id,
      keyword: scene.narration.split(" ").slice(0, 4).join(" "),
    }));

    try {
      const completion = await callNimChat(
        [
          {
            role: "system",
            content:
              "Generate concise visual search keywords for each scene. Return JSON array: [{id:number, keyword:string}]",
          },
          {
            role: "user",
            content: `Category: ${category}\nScenes: ${JSON.stringify(scenes)}`,
          },
        ],
        0.4,
      );

      const parsed = safeJsonParse<SceneKeyword[]>(completion);
      return NextResponse.json({ keywords: parsed, provider: "nim" });
    } catch {
      return NextResponse.json({ keywords: fallback, provider: "fallback" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

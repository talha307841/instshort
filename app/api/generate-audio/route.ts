import { NextResponse } from "next/server";

export const maxDuration = 60;

const ELEVEN_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";

export async function GET() {
  const hasElevenLabs = Boolean(process.env.ELEVENLABS_API_KEY);
  return NextResponse.json({
    hasElevenLabs,
    fallback: "web-speech",
  });
}

export async function POST(request: Request) {
  try {
    const { text, voice, speed } = (await request.json()) as {
      text: string;
      voice?: string;
      speed?: number;
    };

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ useWebSpeech: true, provider: "web-speech" });
    }

    const voiceId = voice || ELEVEN_DEFAULT_VOICE;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
          speed: speed ?? 1,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ useWebSpeech: true, provider: "web-speech" });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    return NextResponse.json({
      useWebSpeech: false,
      provider: "elevenlabs",
      audioBase64,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

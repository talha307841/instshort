const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NimImageResult {
  b64_json?: string;
  url?: string;
}

export async function callNimChat(messages: ChatCompletionMessage[], temperature = 0.7) {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;

  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is not configured");
  }

  const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "meta/llama-3.1-70b-instruct",
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`NIM chat request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content as string;
}

export async function callNimImage(prompt: string) {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;

  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is not configured");
  }

  const response = await fetch(`${NIM_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "black-forest-labs/flux.1-schnell",
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    throw new Error(`NIM image request failed with status ${response.status}`);
  }

  const data = await response.json();
  const first: NimImageResult | undefined = data?.data?.[0];

  if (!first?.b64_json && !first?.url) {
    throw new Error("NIM image response missing image payload");
  }

  return {
    provider: "nim" as const,
    imageBase64: first.b64_json ? `data:image/png;base64,${first.b64_json}` : null,
    imageUrl: first.url ?? null,
  };
}

export async function callHuggingFaceFlux(prompt: string) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
  }

  const response = await fetch(
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    },
  );

  if (!response.ok) {
    throw new Error(`Hugging Face image request failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const base64 = buffer.toString("base64");

  return {
    provider: "huggingface" as const,
    imageBase64: `data:image/png;base64,${base64}`,
    imageUrl: null,
  };
}

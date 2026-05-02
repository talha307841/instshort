import { NextResponse } from "next/server";
import { StockAsset } from "@/lib/types";

export const maxDuration = 60;

async function fetchFromPexels(keyword: string, count: number): Promise<StockAsset[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&orientation=portrait&per_page=${count}`;
  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.photos ?? []).map((photo: any) => ({
    url: photo.src?.large2x ?? photo.src?.original,
    photographer: photo.photographer,
    source: "pexels",
  }));
}

async function fetchFromPixabay(keyword: string, count: number): Promise<StockAsset[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return [];

  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(keyword)}&image_type=photo&orientation=vertical&per_page=${count}`;
  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.hits ?? []).map((hit: any) => ({
    url: hit.largeImageURL,
    photographer: hit.user,
    source: "pixabay",
  }));
}

export async function POST(request: Request) {
  try {
    const { keyword, count = 5 } = (await request.json()) as {
      keyword: string;
      category?: string;
      count?: number;
    };

    if (!keyword) {
      return NextResponse.json({ error: "keyword is required" }, { status: 400 });
    }

    const pexels = await fetchFromPexels(keyword, count);
    if (pexels.length > 0) {
      return NextResponse.json({ assets: pexels, provider: "pexels" });
    }

    const pixabay = await fetchFromPixabay(keyword, count);
    if (pixabay.length > 0) {
      return NextResponse.json({ assets: pixabay, provider: "pixabay" });
    }

    const fallback = Array.from({ length: count }).map((_, index) => ({
      url: `https://picsum.photos/seed/${encodeURIComponent(keyword)}-${index}/1080/1920`,
      source: "fallback" as const,
    }));

    return NextResponse.json({ assets: fallback, provider: "fallback" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

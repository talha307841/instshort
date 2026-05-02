"use client";

import Image from "next/image";
import { StockAsset } from "@/lib/types";

interface ImagePickerProps {
  assets: StockAsset[];
  onPick: (url: string) => void;
}

export function ImagePicker({ assets, onPick }: ImagePickerProps) {
  if (!assets.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {assets.map((asset) => (
        <button
          key={`${asset.source}-${asset.url}`}
          className="card overflow-hidden"
          onClick={() => onPick(asset.url)}
        >
          <Image src={asset.url} alt="Stock option" width={300} height={500} className="h-28 w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

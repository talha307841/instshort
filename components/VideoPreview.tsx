"use client";

interface VideoPreviewProps {
  videoUrl: string | null;
}

export function VideoPreview({ videoUrl }: VideoPreviewProps) {
  return (
    <div className="card p-4">
      <div className="mx-auto aspect-[9/16] max-h-[70vh] w-full max-w-sm overflow-hidden rounded-xl border border-[var(--border)] bg-black">
        {videoUrl ? (
          <video className="h-full w-full" controls src={videoUrl} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-[var(--text-secondary)]">
            Assemble a video to preview it here.
          </div>
        )}
      </div>
    </div>
  );
}

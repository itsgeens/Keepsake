"use client";

interface UploadingScreenProps {
  open: boolean;
  image: string | null;
}

// Full-screen "film developing" loader shown while a freshly kept photo is
// actually uploaded. Shows the captured photo developing in place so the user
// knows it's being added to the roll.
export default function UploadingScreen({ open, image }: UploadingScreenProps) {
  if (!open || !image) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#FAF7F2] p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-black/10 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Developing photo"
            className="developing-photo aspect-[3/4] w-full object-cover"
          />
          <div className="developing-sheet pointer-events-none absolute inset-0 rounded-2xl" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-charcoal/70">
            Developing your photo…
          </p>
          <p className="mt-1 text-[12px] text-charcoal/40">
            Adding it to the roll
          </p>
        </div>
      </div>
    </div>
  );
}

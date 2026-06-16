import type { Platform } from "@/lib/demo-data";
import { platformColorVar, platformLabel } from "@/lib/demo-data";

const initials: Record<Platform, string> = {
  tiktok: "TT",
  linkedin: "Li",
  instagram: "Ig",
  facebook: "Fb",
  youtube: "Yt",
};

export function PlatformIcon({ platform, size = 28 }: { platform: Platform; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: `color-mix(in oklab, ${platformColorVar(platform)} 22%, transparent)`,
        color: platformColorVar(platform),
        fontSize: size * 0.42,
      }}
      title={platformLabel(platform)}
    >
      {initials[platform]}
    </span>
  );
}

export function PlatformDot({ platform }: { platform: Platform }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: platformColorVar(platform) }}
    />
  );
}

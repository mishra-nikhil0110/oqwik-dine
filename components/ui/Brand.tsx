// components/ui/Brand.tsx - restaurant logo tile and the "Powered by OQwik" footer.

import Image from "next/image";
import type { Restaurant } from "@/types/api";
import logoColor from "@/assets/brand/oqwik-logo-horizontal-color.svg";
import { initials } from "@/lib/format";
import { pickImage } from "@/lib/menu";
import { cn } from "@/lib/utils";

/**
 * Restaurant logo: 104 px (welcome), 44 px (menu), 36 px (login). Shows the
 * uploaded logo when the API provides one, otherwise Ink tile + Marigold initials.
 */
export function LogoTile({
  restaurant,
  size,
  className,
}: {
  restaurant: Pick<Restaurant, "name"> & Partial<Pick<Restaurant, "logo">>;
  size: number;
  className?: string;
}) {
  const logo = pickImage(restaurant.logo ?? null, "thumb");
  const radius = Math.round(size * 0.27);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden bg-ink text-marigold font-bold", className)}
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.4) }}
      aria-hidden={logo ? undefined : true}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploads come from any configured storage host
        <img src={logo} alt={`${restaurant.name} logo`} className="size-full object-cover" />
      ) : (
        <span className="leading-none tracking-tight">{initials(restaurant.name)}</span>
      )}
    </span>
  );
}

/** "Powered by OQwik" - at the foot of every screen. */
export function PoweredBy({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5 py-6 text-[16px] text-ink-2", className)}>
      <span>Powered by</span>
      <Image src={logoColor} alt="OQwik" width={86} className="h-auto" />
    </div>
  );
}

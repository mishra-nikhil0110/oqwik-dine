// components/ui/Dish.tsx - the small building blocks of a dish: veg mark, tag
// pills, image with placeholder, ADD button and quantity stepper.
"use client";

import { Minus, Plus, Star } from "lucide-react";
import type { Media } from "@/types/api";
import { isBestsellerTag, pickImage } from "@/lib/menu";
import { cn } from "@/lib/utils";

/** Indian food-type mark: green square with a dot (veg), brown square with a triangle (non-veg). */
export function VegMark({ isVeg, size = 18 }: { isVeg: boolean; size?: number }) {
  const color = isVeg ? "var(--color-veg)" : "var(--color-nonveg)";
  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] border-[1.75px] bg-white"
      style={{ width: size, height: size, borderColor: color }}
    >
      {isVeg ? (
        <span className="rounded-full" style={{ width: size * 0.45, height: size * 0.45, background: color }} />
      ) : (
        <svg width={size * 0.55} height={size * 0.5} viewBox="0 0 10 9" aria-hidden>
          <path d="M5 0.5 9.5 8.5H0.5Z" fill={color} />
        </svg>
      )}
    </span>
  );
}

/** Marigold-soft pill; "Bestseller" gets the star. */
export function TagPill({ tag }: { tag: string }) {
  const star = isBestsellerTag(tag);
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-[8px] bg-marigold-soft px-2 text-[14px] font-medium leading-none text-marigold-ink">
      {star && <Star size={13} fill="currentColor" strokeWidth={0} aria-hidden />}
      {star ? "Bestseller" : tag}
    </span>
  );
}

/** Plate with fork and knife - the image placeholder from the design. */
export function PlateIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden className={className}>
      <circle cx="21" cy="21" r="10.5" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="21" cy="21" r="5.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M5 7v8a3 3 0 0 0 3 3v15M8 7v7M11 7v8a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M36 7c-2.5 1.5-4 5-4 9v4h4v13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Placeholder tints, cycled so neighbouring dishes without photos look different (design). */
const TINTS = [
  "bg-marigold-soft text-[#d9a136]",
  "bg-brand-soft text-brand/55",
  "bg-mist text-ink-3",
] as const;

export function tintFor(index: number): string {
  return TINTS[((index % TINTS.length) + TINTS.length) % TINTS.length];
}

interface DishImageProps {
  image: Media | null;
  alt: string;
  size: "thumb" | "hero";
  tintIndex?: number;
  className?: string;
  /** The first visible images load eagerly; the rest are lazy. */
  eager?: boolean;
}

export function DishImage({ image, alt, size, tintIndex = 0, className, eager }: DishImageProps) {
  const src = pickImage(image, size);
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center", tintFor(tintIndex), className)} role="img" aria-label={alt}>
        <PlateIcon size={size === "hero" ? 64 : 36} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- uploads are served from the API host or any S3/CDN host
    <img
      src={src}
      alt={image?.alternativeText || alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("object-cover bg-mist", className)}
    />
  );
}

/** "ADD +" - Marigold, sits over the bottom edge of the dish thumbnail. */
export function AddButton({ onClick, label, className }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-marigold px-5 text-[18px] font-semibold tracking-wide text-ink",
        "shadow-[0_8px_18px_-10px_rgba(122,77,0,0.6)] transition-[filter] hover:brightness-[0.97] active:brightness-95",
        className,
      )}
    >
      ADD <Plus size={18} strokeWidth={2.6} aria-hidden />
    </button>
  );
}

interface StepperProps {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /** solid = Marigold (menu, dish screen footer uses soft); soft = cream with Marigold border (cart). */
  tone?: "solid" | "soft";
  name: string;
  incrementDisabled?: boolean;
  decrementDisabled?: boolean;
  /** 56 px tall version for the dish screen's bottom bar (default 44 px). */
  tall?: boolean;
  className?: string;
}

/** − 1 + quantity stepper. */
export function Stepper({
  quantity,
  onDecrement,
  onIncrement,
  tone = "solid",
  name,
  incrementDisabled,
  decrementDisabled,
  tall,
  className,
}: StepperProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-between text-ink",
        tall ? "h-14 rounded-[18px]" : "h-11 rounded-[14px]",
        tone === "solid"
          ? "bg-marigold shadow-[0_8px_18px_-10px_rgba(122,77,0,0.6)]"
          : "border border-marigold bg-marigold-soft",
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={decrementDisabled}
        aria-label={quantity === 1 && !decrementDisabled ? `Remove ${name}` : `Decrease ${name}`}
        className="flex h-full w-11 items-center justify-center rounded-l-[inherit] active:bg-black/5 disabled:opacity-40"
      >
        <Minus size={18} strokeWidth={2.6} aria-hidden />
      </button>
      <span className="min-w-6 text-center text-[18px] font-semibold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label={`Increase ${name}`}
        className="flex h-full w-11 items-center justify-center rounded-r-[inherit] active:bg-black/5 disabled:opacity-40"
      >
        <Plus size={18} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}

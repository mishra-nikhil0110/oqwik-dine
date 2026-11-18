// components/menu/MenuParts.tsx - pieces of the menu screens (design screens 4-5):
// restaurant header, search field, category circles and pills, filter chips,
// veg segmented control and the status banners.
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AlertCircle, ArrowRight, ClipboardList, Clock3, Search, Star, X } from "lucide-react";
import type { DiningTable, MenuCategory, Restaurant } from "@/types/api";
import { shortAddress, tableName } from "@/lib/format";
import { pickImage } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { tablePath } from "@/hooks/useTableSlug";
import { LogoTile } from "@/components/ui/Brand";
import { PlateIcon, VegMark, tintFor } from "@/components/ui/Dish";

/* ---------------- header ---------------- */

/** Subtitle under the restaurant name: its address when the API sends one, else its description. */
export function restaurantSubtitle(restaurant: Restaurant): string {
  return shortAddress(restaurant.address) || restaurant.description?.trim() || "";
}

/** Marigold "Table 12" chip. */
export function TableChip({ table, className }: { table: DiningTable; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 shrink-0 items-center rounded-full bg-marigold px-4 text-[16px] font-semibold whitespace-nowrap text-ink",
        className,
      )}
    >
      {tableName(table)}
    </span>
  );
}

export function MenuHeader({
  restaurant,
  table,
  qrSlug,
  signedIn,
}: {
  restaurant: Restaurant;
  table: DiningTable;
  qrSlug: string;
  signedIn: boolean;
}) {
  const subtitle = restaurantSubtitle(restaurant);
  return (
    <header className="flex items-center gap-3 pt-[max(20px,env(safe-area-inset-top))] pb-2">
      <LogoTile restaurant={restaurant} size={44} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[21px] leading-tight font-bold">{restaurant.name}</h1>
        {subtitle && <p className="truncate text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {signedIn && (
        <Link
          href={tablePath(qrSlug, "/orders")}
          aria-label="Your orders"
          title="Your orders"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-line text-ink hover:bg-mist"
        >
          <ClipboardList size={20} aria-hidden />
        </Link>
      )}
      <TableChip table={table} />
    </header>
  );
}

/* ---------------- search ---------------- */

export function SearchField({
  value,
  onChange,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">Search dishes</span>
      <Search size={22} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-2" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search dishes"
        enterKeyHint="search"
        className="h-14 w-full rounded-[18px] bg-mist pr-12 pl-14 text-[17px] text-ink outline-none placeholder:text-ink-2 focus:ring-2 focus:ring-brand/40 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-2 hover:bg-white"
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </label>
  );
}

/* ---------------- categories ---------------- */

/** 68 px circle-cropped category images with names (menu screen). */
export function CategoryCircles({ categories, qrSlug }: { categories: MenuCategory[]; qrSlug: string }) {
  return (
    <ul className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 md:-mx-6 md:px-6">
      {categories.map((category, index) => {
        const src = pickImage(category.image, "thumb");
        return (
          <li key={category.documentId} className="shrink-0">
            <Link
              href={tablePath(qrSlug, `/category/${encodeURIComponent(category.documentId)}`)}
              className="group flex w-[84px] flex-col items-center gap-2.5 rounded-[16px] py-1"
            >
              <span
                className={cn(
                  "flex size-[68px] items-center justify-center overflow-hidden rounded-full ring-offset-2 transition-shadow group-hover:ring-2 group-hover:ring-marigold",
                  !src && tintFor(index),
                )}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploads come from any configured storage host
                  <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <PlateIcon size={28} />
                )}
              </span>
              <span className="line-clamp-2 text-center text-[15px] leading-tight font-medium text-ink">{category.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Category pills on the category screen; the active one is Indigo. */
export function CategoryPills({
  categories,
  activeId,
  qrSlug,
}: {
  categories: MenuCategory[];
  activeId: string;
  qrSlug: string;
}) {
  const navRef = useRef<HTMLElement>(null);

  // Keep the active pill in view (horizontally only) when arriving on a later category.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeId]);

  return (
    <nav
      ref={navRef}
      aria-label="Categories"
      className="no-scrollbar relative -mx-5 flex gap-3 overflow-x-auto px-5 py-1 md:-mx-6 md:px-6"
    >
      {categories.map((category) => {
        const active = category.documentId === activeId;
        return (
          <Link
            key={category.documentId}
            href={tablePath(qrSlug, `/category/${encodeURIComponent(category.documentId)}`)}
            replace
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-12 shrink-0 items-center rounded-full px-6 text-[17px] font-medium whitespace-nowrap transition-colors",
              active ? "bg-brand font-semibold text-white" : "border border-line bg-white text-ink hover:bg-mist",
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------------- filters ---------------- */

export interface MenuFilters {
  vegOnly: boolean;
  bestsellers: boolean;
}

/**
 * Toggle chips under the categories, driven by the menu data: "Veg only" uses
 * is_veg, "Bestsellers" appears only when the restaurant tagged dishes with it.
 * Active = Marigold-soft with a Marigold border.
 */
export function FilterChips({
  filters,
  onChange,
  showBestsellers,
}: {
  filters: MenuFilters;
  onChange: (filters: MenuFilters) => void;
  showBestsellers: boolean;
}) {
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-12 shrink-0 items-center gap-2 rounded-[16px] border px-4 text-[16px] font-medium whitespace-nowrap transition-colors",
      active ? "border-marigold bg-marigold-soft text-ink" : "border-line bg-white text-ink hover:bg-mist",
    );
  return (
    <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 py-1 md:-mx-6 md:px-6" role="group" aria-label="Filters">
      <button
        type="button"
        aria-pressed={filters.vegOnly}
        onClick={() => onChange({ ...filters, vegOnly: !filters.vegOnly })}
        className={chip(filters.vegOnly)}
      >
        <VegMark isVeg size={18} /> Veg only
      </button>
      {showBestsellers && (
        <button
          type="button"
          aria-pressed={filters.bestsellers}
          onClick={() => onChange({ ...filters, bestsellers: !filters.bestsellers })}
          className={chip(filters.bestsellers)}
        >
          <Star size={17} fill="currentColor" strokeWidth={0} className="text-marigold-ink" aria-hidden /> Bestsellers
        </button>
      )}
    </div>
  );
}

export type VegFilter = "all" | "veg" | "nonveg";

/** All / Veg / Non-veg segmented control (category screen). */
export function VegSegmented({ value, onChange }: { value: VegFilter; onChange: (value: VegFilter) => void }) {
  const options: Array<{ value: VegFilter; label: string; mark?: boolean }> = [
    { value: "all", label: "All" },
    { value: "veg", label: "Veg", mark: true },
    { value: "nonveg", label: "Non-veg", mark: false },
  ];
  return (
    <div className="inline-flex rounded-[18px] bg-mist p-1.5" role="radiogroup" aria-label="Food type">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-[17px] font-medium transition-colors",
              active ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgba(20,20,43,0.25)]" : "text-ink hover:text-ink-2",
            )}
          >
            {option.mark !== undefined && <VegMark isVeg={option.mark} size={18} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- banners ---------------- */

/** Ordering paused by the restaurant: the menu stays readable (guide §4). */
export function PausedBanner() {
  return (
    <div className="flex items-start gap-3.5 rounded-[22px] bg-mist p-5" role="status">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-marigold-ink">
        <Clock3 size={22} aria-hidden />
      </span>
      <div>
        <p className="text-[18px] font-semibold">Not taking orders right now</p>
        <p className="mt-0.5 text-[15px] text-ink-2">You can still browse the menu. Please ask the staff for help.</p>
      </div>
    </div>
  );
}

/** A payment started earlier in this tab is still being confirmed. */
export function PendingPaymentBanner({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-[22px] bg-marigold p-5 text-ink transition-[filter] hover:brightness-[0.98]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-ink text-marigold">
        <AlertCircle size={22} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[18px] font-bold">Payment in progress</p>
        <p className="text-[15px]">Tap to check its status before ordering again.</p>
      </div>
      <ArrowRight size={22} aria-hidden />
    </Link>
  );
}

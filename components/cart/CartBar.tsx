// components/cart/CartBar.tsx - the floating Indigo "2 items · ₹618 · View cart"
// bar on the menu screens (design screens 4-5). Hidden on large screens, where
// the CartAside panel takes its place.
"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { fmtPrice, pluralize } from "@/lib/format";
import { tablePath } from "@/hooks/useTableSlug";
import { useAppSelector } from "@/store/hooks";
import { selectCartTotals } from "@/store/selectors";
import { BottomBar } from "@/components/ui/Layout";

export function CartBar({ qrSlug, currency }: { qrSlug: string; currency: string }) {
  const totals = useAppSelector(selectCartTotals);
  const lineCount = useAppSelector((s) => s.cart.lines.length);
  if (lineCount === 0) return null;

  return (
    <BottomBar bordered={false} wide className="pb-1 lg:hidden">
      <Link
        href={tablePath(qrSlug, "/cart")}
        className="flex h-[76px] animate-sheet-up items-center gap-3.5 rounded-[24px] bg-brand py-3 pr-3 pl-3.5 text-white shadow-[0_18px_40px_-16px_var(--color-brand)] md:mx-auto md:max-w-[560px]"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-marigold text-ink">
          <ShoppingBag size={22} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-tight text-white/85">{pluralize(totals.itemCount, "item")}</span>
          <span className="block text-[21px] leading-tight font-bold tabular-nums">{fmtPrice(totals.subtotal, currency)}</span>
        </span>
        <span className="inline-flex h-[52px] items-center gap-2 rounded-[16px] bg-white px-5 text-[18px] font-semibold text-brand">
          View cart <ArrowRight size={20} aria-hidden />
        </span>
      </Link>
    </BottomBar>
  );
}

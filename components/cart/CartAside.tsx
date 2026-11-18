// components/cart/CartAside.tsx - desktop-only sticky cart panel beside the menu
// (replaces the floating cart bar from lg breakpoints up).
"use client";

import { useMemo } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { fmtPrice, pluralize } from "@/lib/format";
import { readCustomisations } from "@/lib/menu";
import { tablePath } from "@/hooks/useTableSlug";
import { useAppSelector } from "@/store/hooks";
import { selectCartTotals, selectMenuIndex, selectPricedLines } from "@/store/selectors";
import { ButtonLink } from "@/components/ui/Button";
import { CartLineRow } from "./CartLineRow";

export function CartAside({ qrSlug, currency, acceptsOrders }: { qrSlug: string; currency: string; acceptsOrders: boolean }) {
  const lines = useAppSelector(selectPricedLines);
  const totals = useAppSelector(selectCartTotals);
  const menuIndex = useAppSelector(selectMenuIndex);

  const editable = useMemo(() => {
    const set = new Set<string>();
    for (const line of lines) {
      const dish = menuIndex?.get(line.menuItemId);
      if (dish && readCustomisations(dish.item.customisations).length) set.add(line.key);
    }
    return set;
  }, [lines, menuIndex]);

  return (
    <aside className="sticky top-6 hidden max-h-[calc(100dvh-48px)] flex-col overflow-hidden rounded-[24px] border border-line bg-white lg:flex">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-[12px] bg-marigold text-ink">
          <ShoppingBag size={20} aria-hidden />
        </span>
        <div>
          <h2 className="text-[18px] font-bold">Your cart</h2>
          <p className="text-[14px] text-ink-2">{lines.length ? pluralize(totals.itemCount, "item") : "Nothing added yet"}</p>
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="px-5 py-10 text-center text-[15px] text-ink-2">Tap ADD on a dish to start your order.</p>
      ) : (
        <>
          <ul className="min-h-0 flex-1 overflow-y-auto px-5">
            {lines.map((line) => (
              <CartLineRow
                key={line.key}
                line={line}
                qrSlug={qrSlug}
                currency={currency}
                editable={editable.has(line.key)}
                readOnly={!acceptsOrders}
                compact
              />
            ))}
          </ul>
          <div className="border-t border-line p-5">
            <div className="mb-4 flex items-center justify-between text-[16px]">
              <span className="text-ink-2">Item total</span>
              <span className="font-bold tabular-nums">{fmtPrice(totals.subtotal, currency)}</span>
            </div>
            <ButtonLink href={tablePath(qrSlug, "/cart")} fullWidth iconRight={<ArrowRight size={20} aria-hidden />}>
              View cart
            </ButtonLink>
          </div>
        </>
      )}
    </aside>
  );
}

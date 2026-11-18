// components/cart/CartLineRow.tsx - one cart line (design screen 7): veg mark,
// name, chosen options, Edit link, soft Marigold stepper and line total.
// Lines whose dish sold out are shown greyed with a Remove button.
"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { PricedLine } from "@/lib/cart";
import { fmtPrice } from "@/lib/format";
import { describeChoices } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { MAX_LINE_QUANTITY } from "@/services/config";
import { dishPath } from "@/hooks/useDishActions";
import { useAppDispatch } from "@/store/hooks";
import { lineRemoved } from "@/store/slices/cartSlice";
import { changeQuantity } from "@/store/thunks/cartThunks";
import { Stepper, VegMark } from "@/components/ui/Dish";

interface CartLineRowProps {
  line: PricedLine;
  qrSlug: string;
  currency: string;
  /** Show the Edit link (dish has choices and can still be ordered). */
  editable: boolean;
  /** Steppers are hidden while the restaurant has paused ordering. */
  readOnly?: boolean;
  compact?: boolean;
}

export function CartLineRow({ line, qrSlug, currency, editable, readOnly, compact }: CartLineRowProps) {
  const dispatch = useAppDispatch();
  const choices = describeChoices(line.customisations);

  return (
    <li className={cn("flex gap-3.5 border-b border-line last:border-b-0", compact ? "py-4" : "py-5")}>
      <span className="pt-1">
        <VegMark isVeg={line.isVeg} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold", compact ? "text-[16px]" : "text-dish", !line.available && "text-ink-3")}>{line.name}</p>
        {choices && <p className="mt-1 text-[15px] leading-snug text-ink-2">{choices}</p>}
        {!line.available ? (
          <p className="mt-1.5 text-[15px] font-medium text-danger">Sold out, remove it to continue</p>
        ) : (
          editable &&
          !readOnly && (
            <Link
              href={dishPath(qrSlug, line.menuItemId, line.key)}
              className="mt-1.5 inline-block text-[16px] font-semibold text-brand hover:underline"
            >
              Edit
            </Link>
          )
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-3">
        {!line.available ? (
          <button
            type="button"
            onClick={() => dispatch(lineRemoved(line.key))}
            className="inline-flex h-11 items-center gap-1.5 rounded-[14px] border border-line px-3.5 text-[15px] font-semibold text-danger hover:bg-danger-soft"
          >
            <Trash2 size={16} aria-hidden /> Remove
          </button>
        ) : readOnly ? (
          <span className="text-[16px] font-medium text-ink-2">× {line.quantity}</span>
        ) : (
          <Stepper
            tone="soft"
            name={line.name}
            quantity={line.quantity}
            onDecrement={() => dispatch(changeQuantity(line.key, -1))}
            onIncrement={() => dispatch(changeQuantity(line.key, 1))}
            incrementDisabled={line.quantity >= MAX_LINE_QUANTITY}
            className={compact ? "w-[112px]" : "w-[136px] sm:w-[148px]"}
          />
        )}
        <span className={cn("font-bold tabular-nums", compact ? "text-[16px]" : "text-[18px]", !line.available && "text-ink-3 line-through")}>
          {fmtPrice(line.lineTotal, currency)}
        </span>
      </div>
    </li>
  );
}

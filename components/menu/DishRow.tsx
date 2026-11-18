// components/menu/DishRow.tsx - one dish in a menu list (design screens 4-5):
// veg mark + tags, name, price, description, and a 112 px thumbnail with the
// ADD button / stepper overlapping its bottom edge.
"use client";

import Link from "next/link";
import { memo } from "react";
import type { MenuItem } from "@/types/api";
import { MAX_LINE_QUANTITY } from "@/services/config";
import { fmtPrice } from "@/lib/format";
import { readTags } from "@/lib/menu";
import { dishPath, useDishActions } from "@/hooks/useDishActions";
import { AddButton, DishImage, Stepper, TagPill, VegMark } from "@/components/ui/Dish";

interface DishRowProps {
  item: MenuItem;
  qrSlug: string;
  currency: string;
  acceptsOrders: boolean;
  /** Position in the list: picks the placeholder tint and eager-loads the first images. */
  index: number;
}

export const DishRow = memo(function DishRow({ item, qrSlug, currency, acceptsOrders, index }: DishRowProps) {
  const { quantity, increment, decrement, hasChoices } = useDishActions(item, qrSlug);
  const tags = readTags(item.tags).slice(0, 2);
  const href = dishPath(qrSlug, item.documentId);

  return (
    <article className="flex gap-4 border-b border-line py-6">
      <Link href={href} className="group min-w-0 flex-1" aria-label={`${item.name}, ${fmtPrice(item.price, currency)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <VegMark isVeg={item.is_veg} />
          {tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>
        <h3 className="mt-2 text-dish text-ink group-hover:text-brand">{item.name}</h3>
        <p className="mt-1 text-[18px] font-semibold tabular-nums">{fmtPrice(item.price, currency)}</p>
        {item.description && <p className="mt-2 line-clamp-3 text-[16px] leading-[1.45] text-ink-2">{item.description}</p>}
      </Link>

      <div className="relative w-28 shrink-0 self-start pb-5">
        <Link href={href} tabIndex={-1} aria-hidden className="block">
          <DishImage
            image={item.image}
            alt={item.name}
            size="thumb"
            tintIndex={index}
            eager={index < 4}
            className="size-28 rounded-[18px]"
          />
        </Link>
        {acceptsOrders && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            {quantity > 0 ? (
              <Stepper
                name={item.name}
                quantity={quantity}
                onDecrement={decrement}
                onIncrement={increment}
                // Dishes with choices open the dish screen, which checks the per-line limit itself.
                incrementDisabled={!hasChoices && quantity >= MAX_LINE_QUANTITY}
                className="w-[124px] shrink-0"
              />
            ) : (
              <AddButton onClick={increment} label={`Add ${item.name}`} className="w-[100px]" />
            )}
          </div>
        )}
      </div>
    </article>
  );
});

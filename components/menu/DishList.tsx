// components/menu/DishList.tsx - dishes in one column on phones, two from md up.

import type { MenuItem } from "@/types/api";
import { DishRow } from "./DishRow";

export function DishList({
  items,
  qrSlug,
  currency,
  acceptsOrders,
}: {
  items: MenuItem[];
  qrSlug: string;
  currency: string;
  acceptsOrders: boolean;
}) {
  return (
    <div className="grid md:grid-cols-2 md:gap-x-10">
      {items.map((item, index) => (
        <DishRow
          key={item.documentId}
          item={item}
          index={index}
          qrSlug={qrSlug}
          currency={currency}
          acceptsOrders={acceptsOrders}
        />
      ))}
    </div>
  );
}

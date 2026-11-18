// hooks/useDishActions.ts - what the ADD button and steppers on menu rows do.
//
//  - Dish without choices: + / − change its single cart line directly.
//  - Dish with choices: + opens the dish screen so the customer can pick them;
//    − works directly while there is one line, otherwise sends them to the cart
//    (we can't know which variant they meant to remove).
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { MenuItem } from "@/types/api";
import { toast } from "@/services/toast";
import { readCustomisations } from "@/lib/menu";
import { toNumber } from "@/lib/format";
import { tablePath } from "@/hooks/useTableSlug";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { selectQuantityByDish } from "@/store/selectors";
import { addToCart, changeQuantity } from "@/store/thunks/cartThunks";

export function dishPath(qrSlug: string, dishId: string, lineKey?: string) {
  const base = tablePath(qrSlug, `/dish/${encodeURIComponent(dishId)}`);
  return lineKey ? `${base}?line=${encodeURIComponent(lineKey)}` : base;
}

export function useDishActions(item: MenuItem, qrSlug: string) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const store = useAppStore();
  // Subscribe to this dish's total only, so other cart changes don't re-render the row.
  const quantity = useAppSelector((s) => selectQuantityByDish(s).get(item.documentId) ?? 0);
  const hasChoices = useMemo(() => readCustomisations(item.customisations).length > 0, [item.customisations]);

  const increment = useCallback(() => {
    if (hasChoices) {
      router.push(dishPath(qrSlug, item.documentId));
      return;
    }
    dispatch(
      addToCart({
        menuItemId: item.documentId,
        name: item.name,
        price: toNumber(item.price),
        isVeg: item.is_veg,
        quantity: 1,
      }),
    );
  }, [hasChoices, router, qrSlug, item, dispatch]);

  const decrement = useCallback(() => {
    const dishLines = store.getState().cart.lines.filter((line) => line.menuItemId === item.documentId);
    if (dishLines.length === 1) {
      dispatch(changeQuantity(dishLines[0].key, -1));
    } else if (dishLines.length > 1) {
      toast.info("This dish has different choices in your cart. Remove the one you want there.");
      router.push(tablePath(qrSlug, "/cart"));
    }
  }, [store, item.documentId, dispatch, router, qrSlug]);

  return { quantity, increment, decrement, hasChoices };
}

// /t/[qrSlug]/cart - design screen 7: cart lines, cooking instructions and the
// estimated bill. The menu is refreshed on arrival so dishes that sold out while
// the customer browsed are flagged before checkout.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Pencil, Plus, ShoppingBag } from "lucide-react";
import { MAX_NOTE_LENGTH } from "@/services/config";
import { fmtPrice } from "@/lib/format";
import { readCustomisations } from "@/lib/menu";
import { tablePath, useTableSlug } from "@/hooks/useTableSlug";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCartTotals, selectMenuIndex, selectPricedLines, selectUnavailableLines } from "@/store/selectors";
import { setCartNote } from "@/store/thunks/cartThunks";
import { loadTable } from "@/store/thunks/tableThunks";
import { ButtonLink } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/IconButton";
import { PoweredBy } from "@/components/ui/Brand";
import { BottomBar, Screen, ScreenHeader, StateMessage, ToPay } from "@/components/ui/Layout";
import { BillSummary } from "@/components/cart/BillSummary";
import { CartLineRow } from "@/components/cart/CartLineRow";
import { PausedBanner, TableChip } from "@/components/menu/MenuParts";

export default function CartPage() {
  const qrSlug = useTableSlug();
  const dispatch = useAppDispatch();
  const data = useAppSelector((s) => s.table.data);
  const hydrated = useAppSelector((s) => s.cart.hydrated);
  const note = useAppSelector((s) => s.cart.note);
  const lines = useAppSelector(selectPricedLines);
  const totals = useAppSelector(selectCartTotals);
  const unavailable = useAppSelector(selectUnavailableLines);
  const menuIndex = useAppSelector(selectMenuIndex);
  const [noteOpen, setNoteOpen] = useState(false);

  // Fresh availability and prices before the customer commits.
  useEffect(() => {
    if (qrSlug) void dispatch(loadTable({ qrSlug, silent: true }));
  }, [dispatch, qrSlug]);

  const editable = useMemo(() => {
    const keys = new Set<string>();
    for (const line of lines) {
      const dish = menuIndex?.get(line.menuItemId);
      if (dish && readCustomisations(dish.item.customisations).length) keys.add(line.key);
    }
    return keys;
  }, [lines, menuIndex]);

  if (!data || !hydrated) return null;
  const { restaurant, table } = data;
  const menuHref = tablePath(qrSlug);

  const header = (
    <ScreenHeader
      back={<BackButton href={menuHref} label="Back to menu" />}
      title="Your cart"
      subtitle={restaurant.name}
      right={<TableChip table={table} />}
    />
  );

  if (lines.length === 0) {
    return (
      <Screen>
        {header}
        <StateMessage
          icon={<ShoppingBag size={30} aria-hidden />}
          title="Your cart is empty"
          className="flex-1 justify-center"
          actions={
            <ButtonLink href={menuHref} fullWidth>
              Browse the menu
            </ButtonLink>
          }
        >
          Add dishes from the menu and they&apos;ll show up here.
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }

  const canCheckout = restaurant.accepts_orders && unavailable.length === 0 && totals.itemCount > 0;

  return (
    <>
      <Screen bottomBar>
        {header}

        {!restaurant.accepts_orders && (
          <div className="mt-2 mb-4">
            <PausedBanner />
          </div>
        )}

        {unavailable.length > 0 && (
          <div className="mt-2 mb-4 flex items-start gap-3 rounded-[18px] bg-danger-soft p-4 text-danger" role="alert">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden />
            <p className="text-[15px] font-medium">
              {unavailable.length === 1
                ? `${unavailable[0].name} just sold out. Remove it to continue.`
                : `${unavailable.length} dishes just sold out. Remove them to continue.`}
            </p>
          </div>
        )}

        <section className="mt-2 rounded-[24px] border border-line px-5 sm:px-6" aria-label="Items in your cart">
          <ul>
            {lines.map((line) => (
              <CartLineRow
                key={line.key}
                line={line}
                qrSlug={qrSlug}
                currency={restaurant.currency}
                editable={editable.has(line.key)}
                readOnly={!restaurant.accepts_orders}
              />
            ))}
          </ul>
          <Link
            href={menuHref}
            className="-mx-5 flex h-16 items-center gap-3 border-t border-line px-5 text-[18px] font-semibold text-brand hover:bg-brand-soft/50 sm:-mx-6 sm:px-6"
          >
            <Plus size={22} strokeWidth={2.4} aria-hidden /> Add more items
          </Link>
        </section>

        <section className="mt-5">
          {noteOpen || note ? (
            <div className="rounded-[20px] bg-mist p-4">
              <label htmlFor="cart-note" className="flex items-center gap-3 text-[16px] font-semibold">
                <Pencil size={18} aria-hidden /> Cooking instructions
              </label>
              <textarea
                id="cart-note"
                value={note}
                autoFocus={noteOpen && !note}
                onChange={(e) => dispatch(setCartNote(e.target.value))}
                maxLength={MAX_NOTE_LENGTH}
                rows={3}
                placeholder="Anything the kitchen should know?"
                className="mt-3 w-full resize-none rounded-[14px] border border-line bg-white p-3 text-[16px] outline-none placeholder:text-ink-3 focus:border-brand"
              />
              <p className="mt-1 text-right text-[14px] text-ink-2 tabular-nums">
                {note.length}/{MAX_NOTE_LENGTH}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="flex h-16 w-full items-center gap-4 rounded-[20px] bg-mist px-5 text-left text-[17px] text-ink-2 hover:text-ink"
            >
              <Pencil size={20} aria-hidden /> Add cooking instructions
            </button>
          )}
        </section>

        <div className="mt-5">
          <BillSummary totals={totals} restaurant={restaurant} />
        </div>

        <PoweredBy className="mt-4" />
      </Screen>

      <BottomBar>
        <div className="flex items-center gap-4">
          <ToPay amount={fmtPrice(totals.total, restaurant.currency)} />
          {canCheckout ? (
            <ButtonLink
              href={tablePath(qrSlug, "/checkout")}
              className="flex-1"
              iconRight={<ArrowRight size={22} aria-hidden />}
            >
              Checkout
            </ButtonLink>
          ) : (
            <button
              type="button"
              disabled
              className="h-14 flex-1 rounded-[18px] bg-brand/45 text-button text-white"
              aria-describedby="checkout-blocked"
            >
              Checkout
            </button>
          )}
        </div>
        {!canCheckout && (
          <p id="checkout-blocked" className="pt-2 text-center text-[14px] text-ink-2">
            {!restaurant.accepts_orders ? "Ordering is paused right now." : "Remove sold-out dishes to continue."}
          </p>
        )}
      </BottomBar>
    </>
  );
}

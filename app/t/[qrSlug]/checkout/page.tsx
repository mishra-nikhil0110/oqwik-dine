"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertTriangle, Check, Lock, LogOut, NotebookPen, Smartphone } from "lucide-react";
import { fmtPhone, fmtPrice, pluralize, tableName } from "@/lib/format";
import { toCheckoutLines } from "@/lib/cart";
import { describeChoices } from "@/lib/menu";
import { useCheckout } from "@/hooks/useCheckout";
import { useLoginOpen } from "@/hooks/useLoginOpen";
import { tablePath, useTableSlug } from "@/hooks/useTableSlug";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCartTotals, selectPricedLines, selectUnavailableLines } from "@/store/selectors";
import { logout } from "@/store/thunks/sessionThunks";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/IconButton";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { LogoTile, PoweredBy } from "@/components/ui/Brand";
import { VegMark } from "@/components/ui/Dish";
import { BottomBar, Screen, ScreenHeader, ToPay } from "@/components/ui/Layout";
import { BillSummary } from "@/components/cart/BillSummary";

export default function CheckoutPage() {
  const qrSlug = useTableSlug();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const data = useAppSelector((s) => s.table.data);
  const hydrated = useAppSelector((s) => s.cart.hydrated);
  const note = useAppSelector((s) => s.cart.note);
  const lines = useAppSelector(selectPricedLines);
  const totals = useAppSelector(selectCartTotals);
  const unavailable = useAppSelector(selectUnavailableLines);
  const session = useAppSelector((s) => s.session);
  const { pay, busy, error } = useCheckout(qrSlug);
  const loginOpen = useLoginOpen();

  const blocked = !data?.restaurant.accepts_orders || lines.length === 0 || unavailable.length > 0;

  // Nothing payable here (empty cart, sold-out dish, ordering paused): back to the cart.
  useEffect(() => {
    if (hydrated && data && blocked && !busy) router.replace(tablePath(qrSlug, "/cart"));
  }, [hydrated, data, blocked, busy, router, qrSlug]);

  if (!data || !hydrated || blocked) return null;
  const { restaurant, table } = data;
  const { currency } = restaurant;
  const customer = session.status === "signedIn" ? session.customer : null;
  const cartHref = tablePath(qrSlug, "/cart");

  function handlePay() {
    void pay({
      items: toCheckoutLines(lines),
      ...(note.trim() ? { special_instructions: note.trim() } : {}),
    });
  }

  return (
    <>
      <Screen bottomBar>
        <ScreenHeader back={<BackButton href={cartHref} label="Back to cart" />} title="Checkout" />

        {/* Where the order goes */}
        <section className="mt-1 flex items-center gap-4 rounded-[24px] bg-mist p-4 sm:p-5">
          <LogoTile restaurant={restaurant} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[19px] font-bold">{restaurant.name}</p>
            <p className="text-[16px] text-ink-2">
              {pluralize(totals.itemCount, "item")} · {tableName(table)}
            </p>
          </div>
          <Link href={cartHref} className="inline-flex h-11 items-center px-2 text-[17px] font-semibold text-brand">
            Edit
          </Link>
        </section>

        {/* Your order */}
        <section className="mt-8" aria-labelledby="order-title">
          <h2 id="order-title" className="text-section">
            Your order
          </h2>
          <ul className="mt-4 rounded-[24px] border border-line px-5 sm:px-6">
            {lines.map((line) => {
              const choices = describeChoices(line.customisations);
              return (
                <li key={line.key} className="flex items-start gap-3.5 border-b border-line py-4 last:border-b-0">
                  <span className="pt-1">
                    <VegMark isVeg={line.isVeg} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold">{line.name}</p>
                    {choices && <p className="mt-0.5 text-[15px] leading-snug text-ink-2">{choices}</p>}
                    <p className="mt-0.5 text-[15px] text-ink-2 tabular-nums">
                      {line.quantity} × {fmtPrice(line.unitPrice, currency)}
                    </p>
                  </div>
                  <span className="pt-0.5 text-[17px] font-bold tabular-nums">{fmtPrice(line.lineTotal, currency)}</span>
                </li>
              );
            })}
          </ul>
          {note.trim() && (
            <div className="mt-3 flex items-start gap-3 rounded-[18px] bg-mist px-5 py-4">
              <NotebookPen size={20} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
              <p className="min-w-0 text-[16px] break-words text-ink-2">{note.trim()}</p>
            </div>
          )}
        </section>

        <div className="mt-5">
          <BillSummary totals={totals} restaurant={restaurant} />
        </div>

        {/* Who is paying */}
        <section className="mt-8" aria-labelledby="details-title">
          <h2 id="details-title" className="text-section">
            Your details
          </h2>
          {customer ? (
            <>
              <div className="mt-4 flex items-center gap-3.5 rounded-[18px] bg-mist px-5 py-4">
                <Smartphone size={22} className="shrink-0 text-ink-2" aria-hidden />
                <div className="min-w-0 flex-1">
                  {customer.name && <p className="truncate text-[15px] text-ink-2">{customer.name}</p>}
                  <p className="truncate text-[18px] font-medium">{fmtPhone(customer.phone)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[16px] font-semibold text-brand">
                  <Check size={18} strokeWidth={2.6} aria-hidden /> Verified
                </span>
              </div>
              <button
                type="button"
                onClick={() => void dispatch(logout())}
                disabled={session.loggingOut || busy}
                className="mt-2 inline-flex h-11 items-center gap-2 text-[15px] font-semibold text-ink-2 hover:text-ink disabled:opacity-60"
              >
                <LogOut size={16} aria-hidden /> Not you? Use another number
              </button>
            </>
          ) : (
            <div className="mt-4 flex items-center gap-3.5 rounded-[18px] bg-mist px-5 py-4">
              <Smartphone size={22} className="shrink-0 text-ink-2" aria-hidden />
              <p className="text-[16px] text-ink-2">Your session has ended. You&apos;ll verify your number again when you tap Pay now.</p>
            </div>
          )}
          <p className="mt-3 text-[15px] text-ink-2">Your bill will be sent to this number on WhatsApp.</p>
        </section>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-[18px] bg-danger-soft p-4 text-danger" role="alert">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden />
            <p className="text-[15px] font-medium">{error}</p>
          </div>
        )}

        <p className="mt-8 flex items-center justify-center gap-2.5 text-center text-[16px] text-ink-2">
          <Lock size={18} className="shrink-0" aria-hidden /> Pay securely with UPI, card or netbanking on the next screen
        </p>

        <PoweredBy className="mt-2" />
      </Screen>

      <BottomBar>
        <div className="flex items-center gap-4">
          <ToPay amount={fmtPrice(totals.total, currency)} />
          <Button onClick={handlePay} loading={busy} className="flex-1" iconRight={<Lock size={20} aria-hidden />}>
            Pay now
          </Button>
        </div>
      </BottomBar>
      {/* Pricing the order and opening the payment page; steps aside for the re-login sheet. */}
      {busy && !loginOpen && <LoadingOverlay label="Starting secure payment" />}
    </>
  );
}

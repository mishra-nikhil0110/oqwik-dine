// components/cart/BillSummary.tsx - "Bill summary" card (design screen 7).
// The numbers are an estimate with the server's formula; the payment amount
// returned by checkout is what the customer actually pays (guide §5).

import { ReceiptText } from "lucide-react";
import type { Restaurant } from "@/types/api";
import type { CartTotals } from "@/lib/cart";
import { fmtAmount, fmtPrice } from "@/lib/format";

/** "5" or "2.5" - percentages as the restaurant typed them. */
const pct = (value: number) => `${Number(value.toFixed(2))}%`;

export function BillSummary({
  totals,
  restaurant,
}: {
  totals: CartTotals;
  restaurant: Pick<Restaurant, "currency" | "tax_percent" | "service_charge_percent">;
}) {
  const { currency } = restaurant;
  // Indian restaurants charge GST; anywhere else it is just "Tax".
  const taxLabel = currency === "INR" ? "GST" : "Tax";

  return (
    <section className="rounded-[24px] border border-line p-5 sm:p-6" aria-labelledby="bill-summary-title">
      <h2 id="bill-summary-title" className="flex items-center gap-3 text-section">
        <ReceiptText size={22} aria-hidden /> Bill summary
      </h2>
      <dl className="mt-4 space-y-3 text-[17px]">
        <Row label="Item total" value={fmtAmount(totals.subtotal, currency)} />
        {restaurant.service_charge_percent > 0 && (
          <Row
            label={`Service charge ${pct(restaurant.service_charge_percent)}`}
            value={fmtAmount(totals.serviceCharge, currency)}
          />
        )}
        {restaurant.tax_percent > 0 && (
          <Row label={`${taxLabel} ${pct(restaurant.tax_percent)}`} value={fmtAmount(totals.tax, currency)} />
        )}
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="text-[21px] font-bold">To pay</span>
        <span className="text-[21px] font-bold tabular-nums">{fmtPrice(totals.total, currency)}</span>
      </div>
      <p className="mt-2 text-[14px] text-ink-2">The final amount is confirmed when you pay.</p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

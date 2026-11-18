// /bill/[token] - public bill page opened from the WhatsApp link (guide §8).
// No login: the token is long and random. Text is English only and amounts are
// labelled with the currency code. "Download PDF" is a plain link to the PDF.
"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Download, ReceiptText, RefreshCw, SearchX } from "lucide-react";
import type { Bill } from "@/types/api";
import { ApiError, errorMessage, isAbortError } from "@/services/apiClient";
import { guestApi } from "@/services/guestApi";
import { addressLines, fmtCodeAmount, fmtDateTime, tableName } from "@/lib/format";
import { describeChoices } from "@/lib/menu";
import { tablePath, useRememberedTable } from "@/hooks/useTableSlug";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PoweredBy } from "@/components/ui/Brand";
import { Screen, Skeleton, StateMessage } from "@/components/ui/Layout";

const PAYMENT_METHOD: Record<NonNullable<Bill["payment_method"]>, string> = {
  online: "Paid online",
  upi: "UPI",
  card: "Card",
  cash: "Cash",
};

type State = { status: "loading" } | { status: "ready"; bill: Bill } | { status: "error"; notFound: boolean; message: string };

export default function BillPage() {
  const { token } = useParams<{ token: string }>();
  const rememberedTable = useRememberedTable();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(
    (signal?: AbortSignal) => {
      setState({ status: "loading" });
      guestApi
        .getBill(token, signal)
        .then((bill) => setState({ status: "ready", bill }))
        .catch((error) => {
          if (isAbortError(error)) return;
          const notFound = error instanceof ApiError && error.status === 404;
          setState({ status: "error", notFound, message: errorMessage(error) });
        });
    },
    [token],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (state.status === "loading") {
    return (
      <Screen className="pt-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-5 w-64" />
        <Skeleton className="mt-8 h-96 rounded-[24px]" />
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen className="justify-center">
        <StateMessage
          icon={state.notFound ? <SearchX size={30} aria-hidden /> : <RefreshCw size={30} aria-hidden />}
          title={state.notFound ? "Bill not found" : "Couldn't load the bill"}
          tone={state.notFound ? "warning" : "danger"}
          actions={!state.notFound && <Button onClick={() => load()}>Try again</Button>}
        >
          {state.notFound ? "Check that you opened the full link from your WhatsApp message." : state.message}
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }

  const { bill } = state;
  const { restaurant, currency } = bill;
  const address = addressLines(restaurant.address);

  return (
    <Screen className="pt-[max(24px,env(safe-area-inset-top))]">
      <header className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-marigold-soft text-marigold-ink">
          <ReceiptText size={26} aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-bold">{restaurant.name}</h1>
          {restaurant.legal_name && restaurant.legal_name !== restaurant.name && (
            <p className="text-[15px] text-ink-2">{restaurant.legal_name}</p>
          )}
          {address.map((line) => (
            <p key={line} className="text-[15px] text-ink-2">
              {line}
            </p>
          ))}
          {restaurant.gstin && <p className="mt-1 text-[15px] font-medium">GSTIN: {restaurant.gstin}</p>}
          {restaurant.contact_phone && <p className="text-[15px] text-ink-2">Phone: {restaurant.contact_phone}</p>}
        </div>
      </header>

      <section className="mt-6 rounded-[24px] border border-line p-5 sm:p-6" aria-label="Bill">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[15px]">
          <Meta label="Bill number" value={bill.bill_number} />
          <Meta label="Order" value={`#${bill.order_number}`} />
          <Meta label="Date" value={bill.placed_at_local || fmtDateTime(bill.placed_at)} />
          {bill.table && <Meta label="Table" value={tableName(bill.table)} />}
          {bill.customer?.name && <Meta label="Customer" value={bill.customer.name} />}
          <Meta
            label="Payment"
            value={
              bill.payment_status === "paid"
                ? bill.payment_method
                  ? PAYMENT_METHOD[bill.payment_method]
                  : "Paid"
                : "Not paid"
            }
          />
        </dl>

        <table className="mt-6 w-full border-t border-line text-[15px]">
          <thead>
            <tr className="text-left text-[14px] text-ink-2">
              <th scope="col" className="py-3 font-medium">
                Item
              </th>
              <th scope="col" className="py-3 text-center font-medium">
                Qty
              </th>
              <th scope="col" className="py-3 text-right font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, index) => {
              const choices = describeChoices(item.customisations);
              return (
                <tr key={`${item.name}-${index}`} className="border-t border-line align-top">
                  <td className="py-3 pr-2">
                    <span className="font-medium">{item.name}</span>
                    {choices && <span className="block text-[14px] text-ink-2">{choices}</span>}
                    <span className="block text-[13px] text-ink-3">{fmtCodeAmount(item.unit_price, currency)} each</span>
                  </td>
                  <td className="py-3 text-center tabular-nums">{item.quantity}</td>
                  <td className="py-3 text-right whitespace-nowrap tabular-nums">{fmtCodeAmount(item.item_total, currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl className="mt-2 space-y-2 border-t border-line pt-4 text-[15px]">
          <Total label="Subtotal" value={fmtCodeAmount(bill.subtotal, currency)} />
          {bill.service_charge_amount > 0 && (
            <Total label="Service charge" value={fmtCodeAmount(bill.service_charge_amount, currency)} />
          )}
          {bill.tax_amount > 0 && <Total label={currency === "INR" ? "GST" : "Tax"} value={fmtCodeAmount(bill.tax_amount, currency)} />}
          <div className="flex items-center justify-between border-t border-line pt-3 text-[19px] font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{fmtCodeAmount(bill.total_amount, currency)}</dd>
          </div>
        </dl>
        {bill.issued_at && <p className="mt-4 text-[13px] text-ink-3">Issued {fmtDateTime(bill.issued_at)}</p>}
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <ButtonLink href={guestApi.billPdfUrl(token)} external iconLeft={<Download size={20} aria-hidden />}>
          Download PDF
        </ButtonLink>
        {rememberedTable && (
          <ButtonLink href={tablePath(rememberedTable)} variant="secondary">
            Back to menu
          </ButtonLink>
        )}
      </div>
      <PoweredBy />
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

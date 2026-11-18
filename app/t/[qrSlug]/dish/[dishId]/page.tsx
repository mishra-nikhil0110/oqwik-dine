// /t/[qrSlug]/dish/[dishId] - design screen 6: dish details with its
// customisation choices and the "Add item · ₹X" bar.
// With ?line=<cart line key> it edits that cart line instead ("Update item").
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { SearchX, Share2 } from "lucide-react";
import type { Customisations, MenuItem } from "@/types/api";
import { MAX_LINE_QUANTITY } from "@/services/config";
import { toast } from "@/services/toast";
import { fmtPrice, round2, toNumber } from "@/lib/format";
import { missingRequired, readCustomisations, readTags, sanitizeChoices, type CustomisationGroup } from "@/lib/menu";
import { tablePath, useTableSlug } from "@/hooks/useTableSlug";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectMenuIndex } from "@/store/selectors";
import { addToCart, updateCartLine } from "@/store/thunks/cartThunks";
import type { CartLine } from "@/types/cart";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BackButton, IconButton } from "@/components/ui/IconButton";
import { PoweredBy } from "@/components/ui/Brand";
import { BottomBar, StateMessage } from "@/components/ui/Layout";
import { DishImage, Stepper, TagPill, VegMark } from "@/components/ui/Dish";
import { ChoiceGroup } from "@/components/menu/ChoiceGroup";

export default function DishPage() {
  return (
    <Suspense fallback={null}>
      <DishPageContent />
    </Suspense>
  );
}

function DishPageContent() {
  const qrSlug = useTableSlug();
  const { dishId } = useParams<{ dishId: string }>();
  const lineKey = useSearchParams().get("line");
  const menuIndex = useAppSelector(selectMenuIndex);
  const restaurant = useAppSelector((s) => s.table.data?.restaurant ?? null);
  const editingLine = useAppSelector((s) => (lineKey ? (s.cart.lines.find((l) => l.key === lineKey) ?? null) : null));

  const dish = menuIndex?.get(dishId)?.item ?? null;

  if (!restaurant || !menuIndex) return null;

  if (!dish || (editingLine && editingLine.menuItemId !== dish.documentId)) {
    const backHref = tablePath(qrSlug, lineKey ? "/cart" : "");
    return (
      <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center px-5">
        <StateMessage
          icon={<SearchX size={30} aria-hidden />}
          title="This dish isn't available right now"
          tone="warning"
          actions={
            <ButtonLink href={backHref} fullWidth>
              {lineKey ? "Back to cart" : "Back to menu"}
            </ButtonLink>
          }
        >
          It may have just sold out. Please pick something else.
        </StateMessage>
      </main>
    );
  }

  // Remount the form when switching dish / line so its state starts fresh.
  return (
    <DishForm
      key={`${dish.documentId}:${editingLine?.key ?? "new"}`}
      dish={dish}
      qrSlug={qrSlug}
      currency={restaurant.currency}
      acceptsOrders={restaurant.accepts_orders}
      editingLine={editingLine}
    />
  );
}

/** Starting choices: the line's own when editing; otherwise the first option of required single choices. */
function initialChoices(groups: CustomisationGroup[], editingLine: CartLine | null): Customisations {
  if (editingLine) return sanitizeChoices(editingLine.customisations, groups);
  const choices: Customisations = {};
  for (const group of groups) if (group.required && !group.multiple) choices[group.name] = group.options[0];
  return choices;
}

function DishForm({
  dish,
  qrSlug,
  currency,
  acceptsOrders,
  editingLine,
}: {
  dish: MenuItem;
  qrSlug: string;
  currency: string;
  acceptsOrders: boolean;
  editingLine: CartLine | null;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const groups = useMemo(() => readCustomisations(dish.customisations), [dish.customisations]);
  const tags = readTags(dish.tags);
  const price = toNumber(dish.price);

  const [choices, setChoices] = useState<Customisations>(() => initialChoices(groups, editingLine));
  const [quantity, setQuantity] = useState(editingLine?.quantity ?? 1);
  const [showMissing, setShowMissing] = useState(false);

  const missing = missingRequired(choices, groups);
  const total = round2(price * quantity);

  function leave() {
    // Back to wherever the customer came from (menu, category or cart).
    if (window.history.length > 1) router.back();
    else router.push(tablePath(qrSlug, editingLine ? "/cart" : ""));
  }

  function submit() {
    if (missing.length) {
      setShowMissing(true);
      document.getElementById(groupId(missing[0]))?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(`Please choose ${missing[0]}.`);
      return;
    }
    const args = {
      menuItemId: dish.documentId,
      name: dish.name,
      price,
      isVeg: dish.is_veg,
      quantity,
      customisations: choices,
    };
    const ok = editingLine ? dispatch(updateCartLine(editingLine.key, args)) : dispatch(addToCart(args));
    if (!ok) return;
    toast.success(editingLine ? "Cart updated" : `${dish.name} added to cart`);
    leave();
  }

  async function share() {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: dish.name, text: dish.description ?? undefined, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch (error) {
      // AbortError = the customer closed the share sheet; anything else: say so.
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Couldn't share this dish");
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[560px] pb-36">
        <div className="relative md:mt-6 md:overflow-hidden md:rounded-[28px]">
          <DishImage image={dish.image} alt={dish.name} size="hero" eager className="aspect-[3/2] w-full" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))]">
            <BackButton tone="solid" onClick={leave} />
            <IconButton tone="solid" label="Share this dish" onClick={share}>
              <Share2 size={20} aria-hidden />
            </IconButton>
          </div>
        </div>

        <div className="relative -mt-7 rounded-t-[32px] bg-white px-5 pt-7 md:mt-0 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <VegMark isVeg={dish.is_veg} size={20} />
            {tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="text-screen">{dish.name}</h1>
            <p className="pt-0.5 text-[26px] leading-tight font-bold whitespace-nowrap tabular-nums">{fmtPrice(price, currency)}</p>
          </div>
          {dish.description && <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{dish.description}</p>}

          {groups.map((group) => (
            <ChoiceGroup
              key={group.name}
              id={groupId(group.name)}
              group={group}
              value={choices[group.name]}
              missing={showMissing && missing.includes(group.name)}
              onChange={(value) =>
                setChoices((current) => {
                  const next = { ...current };
                  if (value === undefined) delete next[group.name];
                  else next[group.name] = value;
                  return next;
                })
              }
            />
          ))}

          <PoweredBy className="mt-8" />
        </div>
      </main>

      <BottomBar>
        {acceptsOrders ? (
          <div className="flex items-center gap-3">
            <Stepper
              tone="soft"
              name={dish.name}
              quantity={quantity}
              onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
              onIncrement={() => setQuantity((q) => Math.min(MAX_LINE_QUANTITY, q + 1))}
              decrementDisabled={quantity <= 1}
              incrementDisabled={quantity >= MAX_LINE_QUANTITY}
              tall
              className="w-[136px] shrink-0 sm:w-[156px]"
            />
            <Button onClick={submit} className="flex-1" size="lg">
              {editingLine ? "Update item" : "Add item"} · {fmtPrice(total, currency)}
            </Button>
          </div>
        ) : (
          <p className="flex h-14 items-center justify-center rounded-[18px] bg-mist text-[16px] font-semibold text-ink-2">
            Not taking orders right now
          </p>
        )}
      </BottomBar>
    </>
  );
}

/** DOM id for a group's section (used to scroll to a missing required choice). */
function groupId(name: string): string {
  return `choice-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// components/menu/MenuScreen.tsx - design screen 4: header, search, categories,
// filters and the dish list, with the cart bar (phones/tablets) or the cart
// panel (desktop).
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchX, Star } from "lucide-react";
import type { MenuItem, TableMenu } from "@/types/api";
import { pluralize } from "@/lib/format";
import { isBestseller, matchesSearch } from "@/lib/menu";
import { usePendingPayment } from "@/hooks/usePendingPayment";
import { tablePath } from "@/hooks/useTableSlug";
import { useAppSelector } from "@/store/hooks";
import { PoweredBy } from "@/components/ui/Brand";
import { CartAside } from "@/components/cart/CartAside";
import { CartBar } from "@/components/cart/CartBar";
import { DishList } from "./DishList";
import {
  CategoryCircles,
  FilterChips,
  MenuHeader,
  PausedBanner,
  PendingPaymentBanner,
  SearchField,
  type MenuFilters,
} from "./MenuParts";

const NO_FILTERS: MenuFilters = { vegOnly: false, bestsellers: false };

export function MenuScreen({ data, qrSlug }: { data: TableMenu; qrSlug: string }) {
  const { restaurant, table, menu } = data;
  const signedIn = useAppSelector((s) => s.session.status === "signedIn");
  const pendingPayment = usePendingPayment(qrSlug);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MenuFilters>(NO_FILTERS);

  const bestsellers = useMemo(() => {
    const seen = new Set<string>();
    const list: MenuItem[] = [];
    for (const category of menu) {
      for (const item of category.menu_items) {
        if (isBestseller(item) && !seen.has(item.documentId)) {
          seen.add(item.documentId);
          list.push(item);
        }
      }
    }
    return list;
  }, [menu]);

  const filtering = query.trim() !== "" || filters.vegOnly || filters.bestsellers;

  /** Flat, de-duplicated results while searching or filtering. */
  const results = useMemo(() => {
    if (!filtering) return [];
    const seen = new Set<string>();
    const list: MenuItem[] = [];
    for (const category of menu) {
      for (const item of category.menu_items) {
        if (seen.has(item.documentId)) continue;
        if (!matchesSearch(item, query)) continue;
        if (filters.vegOnly && !item.is_veg) continue;
        if (filters.bestsellers && !isBestseller(item)) continue;
        seen.add(item.documentId);
        list.push(item);
      }
    }
    return list;
  }, [filtering, menu, query, filters]);

  const listProps = { qrSlug, currency: restaurant.currency, acceptsOrders: restaurant.accepts_orders };

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-5 pb-40 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:pb-12">
        <main className="min-w-0">
          <MenuHeader restaurant={restaurant} table={table} qrSlug={qrSlug} signedIn={signedIn} />
          <SearchField value={query} onChange={setQuery} className="mt-4" />

          {(!restaurant.accepts_orders || pendingPayment) && (
            <div className="mt-6 space-y-3">
              {!restaurant.accepts_orders && <PausedBanner />}
              {pendingPayment && <PendingPaymentBanner href={`/pay/${encodeURIComponent(pendingPayment.paymentId)}`} />}
            </div>
          )}

          <section className="mt-8" aria-labelledby="categories-title">
            <div className="flex items-center justify-between">
              <h2 id="categories-title" className="text-section">
                Categories
              </h2>
              {menu[0] && (
                <Link
                  href={tablePath(qrSlug, `/category/${encodeURIComponent(menu[0].documentId)}`)}
                  className="-mr-2 inline-flex h-11 items-center px-2 text-[17px] font-semibold text-brand hover:underline"
                >
                  See all
                </Link>
              )}
            </div>
            <div className="mt-4">
              <CategoryCircles categories={menu} qrSlug={qrSlug} />
            </div>
          </section>

          <div className="mt-5">
            <FilterChips
              filters={filters}
              onChange={setFilters}
              showBestsellers={bestsellers.length > 0}
            />
          </div>

          {filtering ? (
            <section className="mt-8" aria-live="polite">
              <h2 className="text-section">{pluralize(results.length, "dish", "dishes")}</h2>
              {results.length > 0 ? (
                <DishList items={results} {...listProps} />
              ) : (
                <div className="flex flex-col items-center py-14 text-center">
                  <span className="flex size-16 items-center justify-center rounded-[20px] bg-mist text-ink-2">
                    <SearchX size={28} aria-hidden />
                  </span>
                  <p className="mt-4 text-dish">No dishes match</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setFilters(NO_FILTERS);
                    }}
                    className="mt-2 h-11 px-3 text-[16px] font-semibold text-brand"
                  >
                    Clear search and filters
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
              {bestsellers.length > 0 && (
                <section className="mt-8" aria-labelledby="bestsellers-title">
                  <h2 id="bestsellers-title" className="flex items-center gap-2.5 text-section">
                    <Star size={22} className="text-marigold" fill="currentColor" strokeWidth={0} aria-hidden />
                    Bestsellers
                  </h2>
                  <DishList items={bestsellers} {...listProps} />
                </section>
              )}
              {menu.map((category) => (
                <section key={category.documentId} className="mt-10" aria-labelledby={`cat-${category.documentId}`}>
                  <h2 id={`cat-${category.documentId}`} className="text-section">
                    {category.name}
                    <span className="ml-2 text-[16px] font-medium text-ink-3">{category.menu_items.length}</span>
                  </h2>
                  <DishList items={category.menu_items} {...listProps} />
                </section>
              ))}
            </>
          )}

          <PoweredBy className="mt-6" />
        </main>

        <div className="hidden pt-6 lg:block">
          <CartAside qrSlug={qrSlug} currency={restaurant.currency} acceptsOrders={restaurant.accepts_orders} />
        </div>
      </div>

      <CartBar qrSlug={qrSlug} currency={restaurant.currency} />
    </>
  );
}

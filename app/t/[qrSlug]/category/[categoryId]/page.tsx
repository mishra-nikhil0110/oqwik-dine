// /t/[qrSlug]/category/[categoryId] - design screen 5: one category with
// category pills, an All / Veg / Non-veg switch and an optional search.
"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import { matchesSearch } from "@/lib/menu";
import { pluralize } from "@/lib/format";
import { tablePath, useTableSlug } from "@/hooks/useTableSlug";
import { useAppSelector } from "@/store/hooks";
import { BackButton, IconButton } from "@/components/ui/IconButton";
import { ButtonLink } from "@/components/ui/Button";
import { PoweredBy } from "@/components/ui/Brand";
import { StateMessage } from "@/components/ui/Layout";
import { CartAside } from "@/components/cart/CartAside";
import { CartBar } from "@/components/cart/CartBar";
import { DishList } from "@/components/menu/DishList";
import { CategoryPills, PausedBanner, SearchField, VegSegmented, type VegFilter } from "@/components/menu/MenuParts";

export default function CategoryPage() {
  const qrSlug = useTableSlug();
  const { categoryId } = useParams<{ categoryId: string }>();
  const data = useAppSelector((s) => s.table.data);

  const [veg, setVeg] = useState<VegFilter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const category = data?.menu.find((c) => c.documentId === categoryId) ?? null;

  const items = useMemo(() => {
    if (!category) return [];
    return category.menu_items.filter(
      (item) =>
        (veg === "all" || (veg === "veg" ? item.is_veg : !item.is_veg)) && matchesSearch(item, searchOpen ? query : ""),
    );
  }, [category, veg, query, searchOpen]);

  if (!data) return null;
  const menuHref = tablePath(qrSlug);

  if (!category) {
    // The category was emptied or switched off since the link was made.
    return (
      <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center px-5">
        <StateMessage
          icon={<SearchX size={30} aria-hidden />}
          title="This category isn't available"
          actions={
            <ButtonLink href={menuHref} fullWidth>
              Back to menu
            </ButtonLink>
          }
        >
          Its dishes may have sold out. Have a look at the rest of the menu.
        </StateMessage>
      </main>
    );
  }

  const { restaurant } = data;
  const listProps = { qrSlug, currency: restaurant.currency, acceptsOrders: restaurant.accepts_orders };

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-5 pb-40 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:pb-12">
        <main className="min-w-0">
          <header className="flex items-center gap-4 pt-[max(16px,env(safe-area-inset-top))] pb-4">
            <BackButton href={menuHref} label="Back to menu" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[24px] leading-tight font-bold">{category.name}</h1>
              <p className="text-[16px] text-ink-2">{pluralize(category.menu_items.length, "dish", "dishes")}</p>
            </div>
            <IconButton
              label={searchOpen ? "Close search" : "Search in this category"}
              onClick={() => {
                setSearchOpen((open) => !open);
                setQuery("");
              }}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <X size={20} aria-hidden /> : <Search size={20} aria-hidden />}
            </IconButton>
          </header>

          {searchOpen && <SearchField value={query} onChange={setQuery} autoFocus className="mb-4" />}

          <CategoryPills categories={data.menu} activeId={category.documentId} qrSlug={qrSlug} />

          <div className="mt-5">
            <VegSegmented value={veg} onChange={setVeg} />
          </div>

          {!restaurant.accepts_orders && (
            <div className="mt-5">
              <PausedBanner />
            </div>
          )}

          {items.length > 0 ? (
            <div className="mt-2">
              <DishList items={items} {...listProps} />
            </div>
          ) : (
            <p className="py-14 text-center text-[16px] text-ink-2">
              {query ? "No dishes match your search." : `No ${veg === "veg" ? "veg" : "non-veg"} dishes here.`}
            </p>
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

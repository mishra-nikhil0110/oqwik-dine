// /t/[qrSlug] - entry from the table's QR code (guide §2).
// TableGate (the layout) has already loaded the table and made sure the
// customer is signed in, so this page is simply the menu.
"use client";

import { useTableSlug } from "@/hooks/useTableSlug";
import { useAppSelector } from "@/store/hooks";
import { MenuScreen } from "@/components/menu/MenuScreen";

export default function TablePage() {
  const qrSlug = useTableSlug();
  const data = useAppSelector((s) => s.table.data);
  if (!data) return null;
  return <MenuScreen data={data} qrSlug={qrSlug} />;
}

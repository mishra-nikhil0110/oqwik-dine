import type { ReactNode } from "react";
import { TableGate } from "@/components/layout/TableGate";

/**
 * Every table page is a client-only shell: the menu, cart and orders are fetched
 * in the browser, and nothing on the server depends on the visitor. So each URL is
 * rendered once on its first visit and then served from the CDN cache, instead of
 * running a server function on every page change (which made navigation lag on
 * phones). Applies to all pages below this layout.
 */
export const dynamic = "force-static";

/** Every table page (menu, category, dish, cart, checkout, orders) needs the table loaded. */
export default function TableLayout({ children }: { children: ReactNode }) {
  return <TableGate>{children}</TableGate>;
}

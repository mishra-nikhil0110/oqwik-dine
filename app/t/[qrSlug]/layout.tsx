import type { ReactNode } from "react";
import { TableGate } from "@/components/layout/TableGate";

/** Every table page (menu, category, dish, cart, checkout, orders) needs the table loaded. */
export default function TableLayout({ children }: { children: ReactNode }) {
  return <TableGate>{children}</TableGate>;
}

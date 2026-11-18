// components/layout/BrandTheme.tsx - paints the app in the restaurant's
// primary_color once its table has loaded (guide §4 "Theming").
"use client";

import { useEffect } from "react";
import { applyBrandColor, resolveBrandColor } from "@/lib/theme";
import { useAppSelector } from "@/store/hooks";

export function BrandTheme() {
  const primaryColor = useAppSelector((s) => s.table.data?.restaurant.primary_color ?? null);
  useEffect(() => {
    applyBrandColor(resolveBrandColor(primaryColor));
  }, [primaryColor]);
  return null;
}

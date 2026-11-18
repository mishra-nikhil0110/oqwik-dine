// components/layout/StartScreen.tsx - shown at "/" and for unknown URLs: the
// guest app is always entered from a table's QR code. If this tab already has a
// table, offer to go back to it.
"use client";

import { ArrowRight, QrCode } from "lucide-react";
import { tablePath, useRememberedTable } from "@/hooks/useTableSlug";
import { ButtonLink } from "@/components/ui/Button";
import { PoweredBy } from "@/components/ui/Brand";
import { Screen, StateMessage } from "@/components/ui/Layout";

export function StartScreen({ title, text }: { title: string; text: string }) {
  const table = useRememberedTable();
  return (
    <Screen className="justify-center">
      <StateMessage
        icon={<QrCode size={30} aria-hidden />}
        title={title}
        tone="warning"
        actions={
          table && (
            <ButtonLink href={tablePath(table)} iconRight={<ArrowRight size={20} aria-hidden />}>
              Back to your table
            </ButtonLink>
          )
        }
      >
        {text}
      </StateMessage>
      <PoweredBy />
    </Screen>
  );
}

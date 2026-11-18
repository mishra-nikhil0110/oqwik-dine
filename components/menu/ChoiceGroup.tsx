// components/menu/ChoiceGroup.tsx - one customisation group on the dish screen
// (design screen 6). Choices never change the price (guide §4 "No extra charge").
//   single choice, up to 3 short options -> segmented control (e.g. Spice level)
//   single choice, otherwise             -> radio cards (e.g. Portion)
//   multiple choice                      -> checkbox cards (e.g. Add-ons)
"use client";

import { Check } from "lucide-react";
import type { CustomisationGroup } from "@/lib/menu";
import { cn } from "@/lib/utils";

const SEGMENT_MAX_OPTIONS = 3;
const SEGMENT_MAX_LABEL = 12;

interface ChoiceGroupProps {
  group: CustomisationGroup;
  value: string | string[] | undefined;
  onChange: (value: string | string[] | undefined) => void;
  /** Highlights a required group the customer skipped. */
  missing?: boolean;
  id: string;
}

export function ChoiceGroup({ group, value, onChange, missing, id }: ChoiceGroupProps) {
  const titleId = `${id}-title`;
  const segmented =
    !group.multiple &&
    group.options.length <= SEGMENT_MAX_OPTIONS &&
    group.options.every((option) => option.length <= SEGMENT_MAX_LABEL);

  const selected = (option: string) => (Array.isArray(value) ? value.includes(option) : value === option);

  function toggle(option: string) {
    if (group.multiple) {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      // Keep the restaurant's option order so equal choices make equal cart lines.
      const ordered = group.options.filter((o) => next.includes(o));
      onChange(ordered.length ? ordered : undefined);
    } else if (value === option) {
      // An optional choice can be cleared by tapping it again; a required one stays.
      if (!group.required) onChange(undefined);
    } else {
      onChange(option);
    }
  }

  return (
    <section id={id} className="mt-8 scroll-mt-24" aria-labelledby={titleId}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-section">
          {group.name}
        </h2>
        {group.required ? (
          <span
            className={cn(
              "rounded-[10px] px-3 py-1 text-[14px] font-semibold",
              missing ? "bg-danger-soft text-danger" : "bg-mist text-ink-2",
            )}
          >
            Required
          </span>
        ) : (
          <span className="text-[16px] text-ink-2">{group.multiple ? "Optional, pick any" : "Optional"}</span>
        )}
      </div>

      {segmented ? (
        <div
          role="radiogroup"
          aria-labelledby={titleId}
          aria-required={group.required || undefined}
          className={cn("mt-4 grid gap-1.5 rounded-[18px] bg-mist p-1.5", missing && "ring-2 ring-danger")}
          style={{ gridTemplateColumns: `repeat(${group.options.length}, minmax(0, 1fr))` }}
        >
          {group.options.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected(option)}
              onClick={() => toggle(option)}
              className={cn(
                "h-12 truncate rounded-[14px] px-2 text-[17px] transition-colors",
                selected(option) ? "bg-marigold font-semibold text-ink" : "font-medium text-ink hover:bg-white/70",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div
          role={group.multiple ? "group" : "radiogroup"}
          aria-labelledby={titleId}
          aria-required={group.required || undefined}
          className="mt-4 space-y-3"
        >
          {group.options.map((option) => {
            const on = selected(option);
            return (
              <button
                key={option}
                type="button"
                role={group.multiple ? "checkbox" : "radio"}
                aria-checked={on}
                onClick={() => toggle(option)}
                className={cn(
                  "flex min-h-[60px] w-full items-center gap-4 rounded-[18px] border-2 px-4 py-3 text-left transition-colors",
                  on ? "border-marigold bg-marigold-soft" : missing ? "border-danger/40 bg-white" : "border-line bg-white hover:bg-mist",
                )}
              >
                {group.multiple ? (
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-[8px] border-2",
                      on ? "border-brand bg-brand text-white" : "border-ink-3 bg-white",
                    )}
                  >
                    {on && <Check size={18} strokeWidth={3} />}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border-2 bg-white",
                      on ? "border-brand" : "border-ink-3",
                    )}
                  >
                    {on && <span className="size-3.5 rounded-full bg-brand" />}
                  </span>
                )}
                <span className="flex-1 text-[18px] font-medium">{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

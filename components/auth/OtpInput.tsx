
"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const OTP_LENGTH = 6;

export interface OtpInputHandle {
  focus: () => void;
}

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  busy?: boolean;
  invalid?: boolean;
}
function nextCode(previous: string, raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= OTP_LENGTH) return digits;
  const inserted = digits.length - previous.length;
  return inserted >= OTP_LENGTH ? digits.slice(-OTP_LENGTH) : digits.slice(0, OTP_LENGTH);
}

function caretToEnd(input: HTMLInputElement) {
  const end = input.value.length;
  if (input.selectionStart !== end || input.selectionEnd !== end) {
    try {
      input.setSelectionRange(end, end);
    } catch {
    }
  }
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, busy = false, invalid = false },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        const input = inputRef.current;
        if (!input) return;
        input.focus({ preventScroll: true });
        caretToEnd(input);
      },
    }),
    [],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (busy) return;
    const next = nextCode(value, event.target.value);
    if (next === value) return;
    onChange(next);
    if (next.length === OTP_LENGTH) onComplete?.(next);
  }

  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <div className="relative">
      <div className="grid grid-cols-6 gap-2.5 sm:gap-3" aria-hidden>
        {Array.from({ length: OTP_LENGTH }, (_, index) => {
          const digit = value[index] ?? "";
          const active = index === activeIndex && !busy;
          return (
            <div
              key={index}
              className={cn(
                "flex aspect-[5/6] min-w-0 items-center justify-center rounded-[16px] border text-[28px] font-bold text-ink select-none",
                "transition-[background-color,border-color,box-shadow] duration-150",
                invalid
                  ? "border-danger bg-danger-soft"
                  : digit && !(active && focused)
                    ? "border-line bg-white"
                    : active
                      ? // Inset shadow doubles the border without changing the box size (no layout shift).
                        "border-marigold bg-marigold-soft shadow-[inset_0_0_0_1px_var(--color-marigold)]"
                      : "border-line bg-mist",
                busy && "opacity-60",
              )}
            >
              {digit ||
                (active && focused && (
                  <span className="h-8 w-[2px] rounded-full bg-ink motion-safe:animate-caret-blink" />
                ))}
            </div>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        enterKeyHint="done"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        value={value}
        readOnly={busy}
        aria-label="6-digit code"
        aria-invalid={invalid || undefined}
        aria-busy={busy || undefined}
        onChange={handleChange}
        onFocus={(event) => {
          setFocused(true);
          caretToEnd(event.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(event) => caretToEnd(event.currentTarget)}
        className="absolute inset-0 size-full cursor-text appearance-none border-0 bg-transparent text-[16px] text-transparent caret-transparent opacity-0 outline-none [-webkit-tap-highlight-color:transparent] selection:bg-transparent"
      />
    </div>
  );
});

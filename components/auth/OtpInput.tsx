// components/auth/OtpInput.tsx - six one-digit boxes (design screen 3).
// Supports typing, backspace to the previous box, arrow keys, pasting the whole
// code into any box, and iOS/Android one-time-code autofill.
"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export const OTP_LENGTH = 6;

export interface OtpInputHandle {
  focus: (index?: number) => void;
}

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when all six digits are entered. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, disabled, invalid },
  ref,
) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useImperativeHandle(ref, () => ({
    focus: (index) => {
      const target = index ?? Math.min(value.length, OTP_LENGTH - 1);
      inputs.current[target]?.focus();
    },
  }));

  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  function commit(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(clean);
    inputs.current[Math.min(focusIndex, OTP_LENGTH - 1)]?.focus();
    if (clean.length === OTP_LENGTH) onComplete?.(clean);
  }

  function handleInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    if (typed.length > 1) {
      // Autofill / paste into a single box: spread from this box onwards.
      commit(value.slice(0, index) + typed, index + typed.length);
      return;
    }
    const chars = digits.slice();
    chars[index] = typed;
    // Boxes are filled left to right; never leave a hole before this digit.
    const next = chars.join("").slice(0, Math.max(index + 1, value.length));
    commit(next, index + 1);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        commit(value.slice(0, index) + value.slice(index + 1), index);
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index), index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputs.current[Math.min(index + 1, value.length)]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    commit(pasted, pasted.length);
  }

  return (
    <div className="grid grid-cols-6 gap-2.5 sm:gap-3" role="group" aria-label="6-digit code">
      {digits.map((digit, index) => {
        const active = index === Math.min(value.length, OTP_LENGTH - 1) && !disabled;
        return (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={index === 0 ? OTP_LENGTH : 1}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={invalid || undefined}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => {
              // Always type into the first empty box.
              if (index > value.length) inputs.current[value.length]?.focus();
              else e.target.select();
            }}
            className={cn(
              "aspect-[5/6] w-full min-w-0 rounded-[16px] border text-center text-[28px] font-bold text-ink caret-transparent outline-none transition-colors",
              invalid
                ? "border-danger bg-danger-soft"
                : digit
                  ? "border-line bg-white"
                  : active
                    ? "border-marigold border-2 bg-marigold-soft"
                    : "border-line bg-mist",
              "focus:border-2 focus:border-marigold focus:bg-marigold-soft disabled:opacity-60",
            )}
          />
        );
      })}
    </div>
  );
});

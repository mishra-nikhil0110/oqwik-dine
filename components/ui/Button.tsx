// components/ui/Button.tsx - buttons from the design.
//   primary   Indigo, the one main action per screen (Get OTP, Checkout, Pay)
//   secondary white with a hairline border (View bill, Cancel payment)
//   marigold  add / quantity actions
//   ghost     text-only link style
"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "marigold" | "ghost";
type Size = "lg" | "md" | "sm";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-deep active:bg-brand-deep disabled:bg-brand/45 shadow-[0_10px_24px_-12px_var(--color-brand)]",
  secondary: "bg-white text-ink border border-line hover:bg-mist active:bg-mist disabled:text-ink-3",
  marigold: "bg-marigold text-ink hover:brightness-[0.97] active:brightness-95 disabled:opacity-50",
  ghost: "bg-transparent text-brand hover:bg-brand-soft disabled:text-ink-3",
};

const SIZE: Record<Size, string> = {
  lg: "h-14 px-6 rounded-[18px] text-button",
  md: "h-12 px-5 rounded-[14px] text-[16px] font-semibold",
  sm: "h-11 px-4 rounded-[12px] text-[15px] font-semibold",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  iconRight?: ReactNode;
  iconLeft?: ReactNode;
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

function classes({ variant = "primary", size = "lg", fullWidth }: CommonProps, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap transition-[background-color,filter,box-shadow,opacity] duration-150",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading, iconLeft, iconRight, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, fullWidth }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={20} /> : iconLeft}
      <span className="truncate">{children}</span>
      {!loading && iconRight}
    </button>
  );
});

interface ButtonLinkProps extends CommonProps {
  href: string;
  className?: string;
  children: ReactNode;
  /** Plain <a> (external URL / file download) instead of client-side navigation. */
  external?: boolean;
  replace?: boolean;
}

export function ButtonLink({
  href,
  className,
  children,
  external,
  replace,
  variant,
  size,
  fullWidth,
  iconLeft,
  iconRight,
}: ButtonLinkProps) {
  const content = (
    <>
      {iconLeft}
      <span className="truncate">{children}</span>
      {iconRight}
    </>
  );
  const cls = classes({ variant, size, fullWidth }, className);
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} replace={replace}>
      {content}
    </Link>
  );
}

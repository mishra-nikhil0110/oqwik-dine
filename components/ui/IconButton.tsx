// components/ui/IconButton.tsx - 44 x 44 square buttons (back, search, share).
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "outline" | "solid";

const TONE: Record<Tone, string> = {
  /** White with a hairline border - headers on white. */
  outline: "bg-white border border-line text-ink hover:bg-mist",
  /** White without border - floating over the dish hero image. */
  solid: "bg-white text-ink shadow-[0_4px_14px_-6px_rgba(20,20,43,0.25)] hover:bg-mist",
};

const BASE =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] transition-colors duration-150 disabled:opacity-50";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: Tone;
  children: ReactNode;
}

export function IconButton({ label, tone = "outline", className, children, type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cn(BASE, TONE[tone], className)} {...rest}>
      {children}
    </button>
  );
}

interface BackButtonProps {
  /** Where to go. Without it, goes back in history (or to `fallback` when there is none). */
  href?: string;
  fallback?: string;
  onClick?: () => void;
  tone?: Tone;
  label?: string;
}

/** The chevron button at the top-left of every inner screen. */
export function BackButton({ href, fallback = "/", onClick, tone = "outline", label = "Go back" }: BackButtonProps) {
  const router = useRouter();
  const icon = <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />;

  if (href && !onClick) {
    return (
      <Link href={href} aria-label={label} title={label} className={cn(BASE, TONE[tone])}>
        {icon}
      </Link>
    );
  }
  return (
    <IconButton
      label={label}
      tone={tone}
      onClick={() => {
        if (onClick) return onClick();
        // A deep link opened in a fresh tab has no history to go back to.
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      {icon}
    </IconButton>
  );
}

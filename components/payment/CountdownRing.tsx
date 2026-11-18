// components/payment/CountdownRing.tsx - the Marigold "4:32 time left" ring
// (design screen 9): time until the pending payment expires.

import { fmtCountdown } from "@/lib/format";

const SIZE = 220;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownRing({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const fraction = totalSeconds > 0 ? Math.min(1, Math.max(0, secondsLeft / totalSeconds)) : 0;
  return (
    <div className="relative mx-auto size-[200px] sm:size-[220px]" role="timer" aria-label={`${fmtCountdown(secondsLeft)} left to pay`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-mist)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-marigold)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-[52px] leading-none font-bold tracking-tight tabular-nums">{fmtCountdown(secondsLeft)}</span>
        <span className="mt-1.5 text-[17px] text-ink-2">time left</span>
      </div>
    </div>
  );
}

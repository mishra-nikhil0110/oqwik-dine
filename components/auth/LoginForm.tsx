// components/auth/LoginForm.tsx - phone + one-time code login (design screens 2-3, guide §3).
//
// Step 1 sends the code (POST /guest/auth/otp), step 2 verifies it
// (POST /guest/auth/verify) and stores the 45-minute token. The optional name
// typed in step 1 is sent with the verification.
//
// Used in two places:
//   page  - the table entry screen when there is no live session (TableGate)
//   sheet - the dialog that re-signs the customer in mid-visit (LoginSheet)
//
// Error handling (guide §3):
//   send   400 invalid / unsupported number · 429 cooldown (details.retry_after)
//   verify 400 wrong code (details.attempts_left) · 400 expired / too many tries
//          -> back to step 1 · 403 blocked number
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, MessageSquareText, Smartphone } from "lucide-react";
import { ApiError, errorMessage } from "@/services/apiClient";
import { MAX_NAME_LENGTH, PHONE_COUNTRY_CODE, PRIVACY_URL, TERMS_URL } from "@/services/config";
import { guestApi } from "@/services/guestApi";
import { saveSession } from "@/services/session";
import { toast } from "@/services/toast";
import { useNow } from "@/hooks/useNow";
import { fmtCountdown, groupLocalDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { selectRestaurant } from "@/store/selectors";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/IconButton";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { LogoTile, PoweredBy } from "@/components/ui/Brand";
import { OtpInput, OTP_LENGTH, type OtpInputHandle } from "./OtpInput";

/** Indian mobile numbers: 10 digits starting 6-9. The server re-validates every number. */
const LOCAL_NUMBER = /^[6-9]\d{9}$/;

/** Digits typed or pasted -> the 10 local digits (drops +91 / 91 / 0 prefixes). */
function toLocalDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

type Step = "phone" | "code";

interface LoginFormProps {
  mode: "page" | "sheet";
  /** Called after the session has been saved. */
  onSuccess: () => void;
  /** Sheet only: the customer closed the dialog from step 1. */
  onClose?: () => void;
}

export function LoginForm({ mode, onSuccess, onClose }: LoginFormProps) {
  const restaurant = useAppSelector(selectRestaurant);

  const [step, setStep] = useState<Step>("phone");
  const [digits, setDigits] = useState("");
  const [name, setName] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  /** The E.164 number the current code was sent to. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<OtpInputHandle>(null);

  const phone = `${PHONE_COUNTRY_CODE}${digits}`;
  const phoneValid = LOCAL_NUMBER.test(digits);

  // Move focus with the step so the keyboard is ready for the next input.
  useEffect(() => {
    if (step === "phone") phoneInputRef.current?.focus();
    else otpRef.current?.focus();
  }, [step]);

  /* ---- step 1: send the code ---- */
  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setPhoneTouched(true);
    if (!phoneValid || sending) return;

    setSending(true);
    setPhoneError(null);
    try {
      const sent = await guestApi.sendOtp(phone);
      setSentTo(phone);
      setResendAt(Date.now() + sent.resend_in * 1000);
      setCode("");
      setCodeError(null);
      setStep("code");
    } catch (error) {
      if (error instanceof ApiError && error.status === 429 && sentTo === phone && error.retryAfter) {
        // A code was just sent to this same number and is still the valid one.
        setResendAt(Date.now() + error.retryAfter * 1000);
        setStep("code");
      } else {
        setPhoneError(errorMessage(error));
      }
    } finally {
      setSending(false);
    }
  }

  /* ---- step 2: verify ---- */
  async function verify(value = code) {
    if (verifying || !sentTo || value.length !== OTP_LENGTH) return;
    setVerifying(true);
    setCodeError(null);
    try {
      const session = await guestApi.verifyOtp(sentTo, value, name);
      saveSession(session);
      toast.success("Number verified");
      onSuccess();
    } catch (error) {
      setCode("");
      if (error instanceof ApiError && error.status === 400 && typeof error.details.attempts_left !== "number") {
        // Expired code or too many wrong tries: a new code is needed (step 1).
        setSentTo(null);
        setResendAt(0);
        setPhoneError(error.message);
        setStep("phone");
      } else {
        setCodeError(errorMessage(error));
        otpRef.current?.focus();
      }
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (Date.now() < resendAt || sending || !sentTo) return;
    setSending(true);
    setCodeError(null);
    try {
      const sent = await guestApi.sendOtp(sentTo);
      setResendAt(Date.now() + sent.resend_in * 1000);
      setCode("");
      otpRef.current?.focus();
      toast.success("We've sent you a new code");
    } catch (error) {
      if (error instanceof ApiError && error.status === 429 && error.retryAfter) {
        setResendAt(Date.now() + error.retryAfter * 1000);
      }
      setCodeError(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  const showPhoneError = phoneTouched && !phoneValid && digits.length > 0;
  const headerPad = "pt-[max(16px,env(safe-area-inset-top))] pb-3";

  if (step === "phone") {
    return (
      <form onSubmit={sendCode} noValidate className="flex min-h-full flex-1 flex-col">
        <header className={cn("flex min-h-[76px] items-center justify-between gap-3", headerPad)}>
          {mode === "sheet" && onClose ? <BackButton onClick={onClose} label="Close" /> : <span />}
          {restaurant && (
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-[18px] font-semibold">{restaurant.name}</span>
              <LogoTile restaurant={restaurant} size={36} />
            </div>
          )}
        </header>

        <div className="mt-6 flex size-16 items-center justify-center rounded-[20px] bg-marigold-soft text-marigold-ink">
          <Smartphone size={28} strokeWidth={2} aria-hidden />
        </div>
        <h1 id="login-title" className="mt-7 text-screen">
          {mode === "sheet" ? "Verify your number again" : "Enter your mobile number"}
        </h1>
        <p className="mt-3 text-body text-ink-2">
          {mode === "sheet"
            ? "Your session has ended. We'll send a new 6-digit code to continue."
            : "We'll send a 6-digit code to confirm it's you. Your order updates come here too."}
        </p>

        <label htmlFor="login-phone" className="mt-8 block text-[16px] font-semibold">
          Mobile number
        </label>
        <div
          className={cn(
            "mt-2.5 flex h-[60px] items-stretch overflow-hidden rounded-[18px] border-2 transition-colors",
            showPhoneError || phoneError ? "border-danger" : "border-line focus-within:border-brand",
          )}
        >
          <span className="flex items-center border-r border-line bg-mist px-4 text-[18px] font-semibold" aria-hidden>
            {PHONE_COUNTRY_CODE}
          </span>
          <input
            ref={phoneInputRef}
            id="login-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            value={groupLocalDigits(digits)}
            onChange={(e) => {
              setDigits(toLocalDigits(e.target.value));
              setPhoneError(null);
            }}
            aria-invalid={showPhoneError || Boolean(phoneError) || undefined}
            aria-describedby="login-phone-help"
            className="min-w-0 flex-1 bg-white px-4 text-[22px] font-semibold tracking-wide outline-none placeholder:font-normal placeholder:text-ink-3"
          />
        </div>
        <p id="login-phone-help" className="mt-2 min-h-5 text-[14px] text-danger" role="alert">
          {showPhoneError ? "Enter a valid 10-digit mobile number." : phoneError}
        </p>

        <label htmlFor="login-name" className="mt-3 block text-[16px] font-semibold">
          Your name <span className="font-normal text-ink-2">(optional)</span>
        </label>
        <input
          id="login-name"
          type="text"
          autoComplete="name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          placeholder="So staff can call you"
          className="mt-2.5 h-[60px] w-full rounded-[18px] border-2 border-line bg-white px-4 text-[18px] outline-none placeholder:text-ink-3 focus:border-brand"
        />

        <div className="mt-6 flex items-center gap-3.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-marigold text-ink">
            <Check size={18} strokeWidth={3} aria-hidden />
          </span>
          <p className="text-[16px] text-ink">Your bill will be sent to this number on WhatsApp.</p>
        </div>

        <div className="min-h-10 flex-1" />

        <Button type="submit" fullWidth loading={sending} disabled={!phoneValid}>
          Get OTP
        </Button>
        {(TERMS_URL || PRIVACY_URL) && (
          <p className="mt-4 text-center text-[14px] text-ink-2">
            By continuing you agree to the{" "}
            {TERMS_URL && (
              <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
                Terms
              </a>
            )}
            {TERMS_URL && PRIVACY_URL && " and "}
            {PRIVACY_URL && (
              <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
                Privacy policy
              </a>
            )}
            .
          </p>
        )}
        <PoweredBy />
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
      noValidate
      className="flex min-h-full flex-1 flex-col"
    >
      <header className={cn("flex min-h-[76px] items-center gap-4", headerPad)}>
        <BackButton onClick={() => setStep("phone")} label="Change number" />
        <h1 id="login-title" className="text-[24px] font-bold">
          Verify number
        </h1>
      </header>

      <div className="mt-6 flex size-16 items-center justify-center rounded-[20px] bg-marigold-soft text-marigold-ink">
        <MessageSquareText size={28} strokeWidth={2} aria-hidden />
      </div>
      <h2 className="mt-7 text-screen">Enter the 6-digit code</h2>
      <p className="mt-3 text-body text-ink-2">
        Sent on WhatsApp to{" "}
        <span className="font-semibold whitespace-nowrap text-ink">
          {PHONE_COUNTRY_CODE} {groupLocalDigits(digits)}
        </span>{" "}
        <button type="button" onClick={() => setStep("phone")} className="font-semibold text-brand underline">
          Edit
        </button>
      </p>

      <div className="mt-8">
        <OtpInput
          ref={otpRef}
          value={code}
          onChange={(value) => {
            setCode(value);
            setCodeError(null);
          }}
          onComplete={(value) => void verify(value)}
          busy={verifying}
          invalid={Boolean(codeError)}
        />
      </div>
      <p className="mt-3 min-h-5 text-[14px] text-danger" role="alert">
        {codeError}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[16px] text-ink-2">Didn&apos;t get it?</span>
        <ResendCode resendAt={resendAt} sending={sending} onResend={resend} />
      </div>

      {process.env.NODE_ENV === "development" && (
        <p className="mt-6 rounded-[14px] bg-mist p-3 text-[14px] text-ink-2">
          Development: with MESSAGING_CHANNEL=console the code is printed in the backend log.
        </p>
      )}

      <div className="min-h-10 flex-1" />

      <Button type="submit" fullWidth loading={verifying} disabled={code.length !== OTP_LENGTH}>
        Verify and continue
      </Button>
      <PoweredBy />
      {verifying && <LoadingOverlay label="Verifying your code" />}
    </form>
  );
}

/**
 * "Resend in 0:24" countdown, then the Resend button. Owns the 1-second clock so
 * only this pill re-renders every tick, never the code boxes being typed into.
 */
function ResendCode({ resendAt, sending, onResend }: { resendAt: number; sending: boolean; onResend: () => void }) {
  const now = useNow(1000, resendAt > 0);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  if (resendIn > 0) {
    return (
      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-marigold-soft px-4 text-[16px] font-semibold text-marigold-ink tabular-nums">
        <Clock size={18} aria-hidden /> Resend in {fmtCountdown(resendIn)}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={sending}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-marigold px-5 text-[16px] font-semibold text-ink disabled:opacity-60"
    >
      {sending ? "Sending…" : "Resend code"}
    </button>
  );
}

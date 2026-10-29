"use client";

/**
 * ContactApp - "Contact".
 *
 * Leads with the form. A short heading and one sentence sit above it; the
 * reach-me links (email, LinkedIn, GitHub) and the availability chip sit in a
 * side column when the window is wide (>= 820px) and after the form when it
 * is narrow. Every layout switch keys off the app's own query container
 * (`.contact-app`, see the C block in globals.css), never the viewport, so a
 * resized window behaves like a real app and the phone shell gets the narrow
 * layout for free.
 *
 * Behaviour:
 *   - Validation runs on submit and trims before counting. Each error is tied
 *     to its field (aria-invalid + aria-describedby), a hidden alert sums them
 *     up, and focus moves to the first invalid field.
 *   - The real POST to /api/contact. The submit button never disables itself
 *     (that drops focus to <body>); it is aria-disabled while sending.
 *   - Success focuses its heading. Failure shows a banner by the submit row
 *     with copy per status code (503 offline, 429 rate limited, anything else),
 *     the email address as a mailto link that carries the visitor's text, a
 *     Copy email button, and a Try again that actually resends.
 *   - Inputs are 16px on the phone so iOS Safari does not zoom on focus, and
 *     carry autocomplete / inputMode hints.
 *
 * Persona: identity leaks from specifics (the work + location), never from
 * student / graduation / degree / visa framing.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Hairline, MetaLabel } from "@/components/editorial";
import { useIsMono } from "@/hooks/usePalette";
import { reveal } from "@/lib/motion";
import { identity, contactLinks } from "@/data/aboutMe";
import { useOSStore } from "@/store/osStore";
import { useMobileStore } from "@/store/mobileStore";
import { CONTACT_MAX_LEN } from "@/lib/contactLimits";

// Strong ease-out for UI enter/exit (Kowalski). Never ease-in on UI; keep <300ms.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Pressable surface for the link rows: hairline-hover tint plus a tactile
// :active settle. Focus is the global 2px ring.
const PRESSABLE =
  "transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] " +
  "active:scale-[0.98] active:duration-100 motion-reduce:active:scale-100 " +
  "hover:bg-black/[0.035] dark:hover:bg-white/[0.05]";

// Primary action: a bordered button, monochrome in both palettes.
const PRIMARY_BTN =
  "inline-flex min-h-[44px] items-center justify-center gap-2 border border-text px-5 py-2.5 " +
  "text-sm font-medium text-text transition-[transform,background-color,color] duration-150 " +
  "ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-text hover:text-bg active:scale-[0.98] " +
  "motion-reduce:active:scale-100";

// Secondary action: hairline border, secondary ink.
const SECONDARY_BTN =
  "inline-flex min-h-[44px] items-center justify-center gap-2 border border-border px-4 py-2.5 " +
  "text-sm text-text transition-[transform,border-color] duration-150 " +
  "ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-text active:scale-[0.98] " +
  "motion-reduce:active:scale-100";

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

type FieldKey = keyof FormData;
type RequiredKey = "name" | "email" | "subject" | "message";

const REQUIRED: RequiredKey[] = ["name", "email", "subject", "message"];

const FIELD_LABEL: Record<FieldKey, string> = {
  name: "Name",
  email: "Email",
  company: "Company",
  subject: "Subject",
  message: "Message",
};

// Length caps, shared with /api/contact so both sides agree.
const MAX_LEN: Record<FieldKey, number> = CONTACT_MAX_LEN;

const EMPTY_FORM: FormData = { name: "", email: "", company: "", subject: "", message: "" };

type Status = "idle" | "submitting" | "success" | "error";

/** Why a send failed, from the API's status code. */
export type FailKind = "offline" | "rate_limited" | "failed";

export function failKindFor(status: number | null): FailKind {
  if (status === 503) return "offline";
  if (status === 429) return "rate_limited";
  return "failed";
}

const FAIL_COPY: Record<FailKind, string> = {
  offline: "The form is offline right now. Email me instead:",
  rate_limited: "Too many messages from this network. Wait a minute and try again, or email me:",
  failed: "Your message didn't send. Your text is still here. Try again, or email me:",
};

/** Validate one field. Returns the error copy, or null when it passes. */
export function validateField(key: FieldKey, raw: string): string | null {
  const value = raw.trim();
  switch (key) {
    case "name":
      if (!value) return "Enter your name";
      return value.length < 2 ? "Name needs at least 2 characters" : null;
    case "email":
      if (!value) return "Enter your email";
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Enter an email like name@company.com";
    case "subject":
      if (!value) return "Add a subject";
      return value.length < 2 ? "Subject needs at least 2 characters" : null;
    case "message":
      if (!value) return "Write a message";
      return value.length < 10 ? "Add a bit more detail (10 characters minimum)" : null;
    default:
      return null;
  }
}

interface ContactAppProps {
  variant?: "desktop" | "mobile";
}

// ---------------------------------------------------------------------------
// Reach-me rows: label above value, so the same row works in the 260px side
// column and in a full-width narrow window. Values are readable, not raw URLs.
// ---------------------------------------------------------------------------

const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

interface ReachRow {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

const REACH_ROWS: ReachRow[] = [
  { label: "Email", value: contactLinks.email, href: `mailto:${contactLinks.email}` },
  { label: "LinkedIn", value: displayUrl(contactLinks.linkedin), href: contactLinks.linkedin, external: true },
  { label: "GitHub", value: displayUrl(contactLinks.github), href: contactLinks.github, external: true },
];

function LinkRow({ label, value, href, external }: ReachRow) {
  return (
    <a
      href={href}
      {...(external
        ? {
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": `${label}, ${value} (opens in a new tab)`,
          }
        : {})}
      className={`group flex items-start justify-between gap-3 py-3 px-1 text-left ${PRESSABLE}`}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <MetaLabel>{label}</MetaLabel>
        <span className="font-mono text-sm text-text [overflow-wrap:anywhere]">{value}</span>
      </span>
      {external && (
        <span aria-hidden className="shrink-0 pt-0.5 font-mono text-sm text-text-secondary">
          ↗
        </span>
      )}
    </a>
  );
}

function ReachAside() {
  const mono = useIsMono();
  return (
    <aside aria-labelledby="contact-reach-heading" className="contact-aside flex flex-col gap-4">
      <h2 id="contact-reach-heading" className="text-sm font-medium text-text">
        Or reach me directly
      </h2>
      <div className="flex flex-col">
        <Hairline />
        {REACH_ROWS.map((row) => (
          <React.Fragment key={row.label}>
            <LinkRow {...row} />
            <Hairline />
          </React.Fragment>
        ))}
      </div>
      {/* Availability chip: hairline border, filled square, no pulse. In Fun
          the square and label carry hue; in mono it is tone only. */}
      <span
        className={`inline-flex w-fit items-center gap-2 border px-2.5 py-1
                    ${mono ? "border-border" : "border-green-500/30"}`}
      >
        <span aria-hidden className={`h-2 w-2 ${mono ? "bg-text" : "bg-green-500"}`} />
        <span className={`text-sm ${mono ? "text-text" : "text-green-700 dark:text-green-400"}`}>
          {identity.availabilityShort}
        </span>
      </span>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Field: mono label, hairline-underline input, sentence-case error tied to
// the input by id.
// ---------------------------------------------------------------------------

const errorId = (id: string) => `contact-${id}-error`;

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const mono = useIsMono();
  // Mono: tone + weight. Fun: red, darker on light so it stays above 4.5:1.
  const errorCls = mono ? "text-text font-medium" : "text-red-700 dark:text-red-400";

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={`contact-${id}`} className="block">
        <MetaLabel>{label}</MetaLabel>
        {optional && <span className="ml-1.5 text-sm text-text-secondary">(optional)</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId(id)}
            // Transform string (not the `y` shorthand) so the slide is
            // GPU-composited; ease-out enter, snappier exit (Kowalski).
            initial={{ opacity: 0, transform: "translateY(-4px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className={`flex items-center gap-2 font-sans text-[0.8125rem] leading-snug ${errorCls}`}
          >
            <span
              aria-hidden
              className="inline-grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-current text-[0.625rem] font-semibold leading-none"
            >
              !
            </span>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hairline-underline input. No filled box; the bottom border thickens on
// focus and goes 2px on error. 16px text (text-base) so iOS never zooms.
const inputCls = (hasError?: boolean) =>
  `w-full bg-transparent px-0 py-2.5 text-base text-text outline-none
   placeholder:text-text-tertiary
   border-0 transition-colors duration-150
   ${hasError
     ? "border-b-2 border-text"
     : "border-b border-border focus:border-text/70 hover:border-text/40"}`;

// ---------------------------------------------------------------------------
// Success state: focused heading, a plain reply line, two ways forward.
// ---------------------------------------------------------------------------

function SuccessView({
  name,
  email,
  onReset,
  onAbout,
  reduced,
}: {
  name: string;
  email: string;
  onReset: () => void;
  onAbout: () => void;
  reduced: boolean | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <motion.div
      role="status"
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
      className="flex flex-col items-start gap-5"
    >
      <motion.h2
        ref={headingRef}
        tabIndex={-1}
        variants={reveal.item(reduced)}
        className="font-display text-[clamp(1.75rem,5cqi,2.5rem)] leading-tight text-text [text-wrap:balance] outline-none"
      >
        {firstName ? `Thanks, ${firstName}. Your message is in my inbox.` : "Thanks. Your message is in my inbox."}
      </motion.h2>

      {email && (
        <motion.p variants={reveal.item(reduced)} className="text-sm text-text-secondary max-w-[48ch] leading-relaxed">
          I&apos;ll reply to <span className="text-text [overflow-wrap:anywhere]">{email}</span>.
        </motion.p>
      )}

      <motion.div variants={reveal.item(reduced)} className="flex flex-wrap gap-3">
        <button type="button" onClick={onReset} className={PRIMARY_BTN}>
          Write another message
        </button>
        <button type="button" onClick={onAbout} className={SECONDARY_BTN}>
          Back to About Me
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Failure banner: sits directly above the submit row.
// ---------------------------------------------------------------------------

function FailBanner({
  kind,
  mailtoHref,
  onRetry,
}: {
  kind: FailKind;
  mailtoHref: string;
  onRetry: () => void;
}) {
  const mono = useIsMono();
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    ref.current?.focus();
  }, [kind]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contactLinks.email);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <motion.div
      ref={ref}
      role="alert"
      tabIndex={-1}
      data-testid="contact-fail"
      initial={{ opacity: 0, transform: "translateY(-6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex flex-col gap-3 border-l-2 border-text py-1 pl-4 outline-none"
    >
      <p className={`text-sm leading-relaxed ${mono ? "text-text" : "text-red-700 dark:text-red-400"}`}>
        {FAIL_COPY[kind]}{" "}
        <a
          href={mailtoHref}
          className="font-medium text-text underline underline-offset-4 [overflow-wrap:anywhere]"
        >
          {contactLinks.email}
        </a>
      </p>
      <div className="flex flex-wrap gap-2">
        {kind !== "offline" && (
          <button type="button" onClick={onRetry} className={SECONDARY_BTN}>
            Try again
          </button>
        )}
        <button type="button" onClick={copy} className={SECONDARY_BTN}>
          {copied === "done" ? "Email copied" : "Copy email"}
        </button>
        {kind === "offline" && (
          <a href={mailtoHref} className={SECONDARY_BTN}>
            Open mail app
          </a>
        )}
      </div>
      {copied === "failed" && (
        <p className="text-sm text-text-secondary">Copy is blocked here. Select the address above instead.</p>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ContactApp({ variant = "desktop" }: ContactAppProps = {}) {
  const reduced = useReducedMotion();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [errorSummary, setErrorSummary] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [failKind, setFailKind] = useState<FailKind>("failed");
  const [sent, setSent] = useState<{ name: string; email: string }>({ name: "", email: "" });
  const submittingRef = useRef(false);

  const handleChange = (key: FieldKey, value: string) => {
    setFormData((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const submit = useCallback(async () => {
    if (submittingRef.current) return;

    const newErrors: Partial<Record<FieldKey, string>> = {};
    for (const key of REQUIRED) {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    }
    const invalid = REQUIRED.filter((k) => newErrors[k]);
    setErrors(newErrors);
    if (invalid.length > 0) {
      const names = invalid.map((k) => FIELD_LABEL[k]).join(", ");
      setErrorSummary(
        invalid.length === 1 ? `${names} needs attention.` : `${invalid.length} fields need attention: ${names}.`,
      );
      document.getElementById(`contact-${invalid[0]}`)?.focus();
      return;
    }
    setErrorSummary("");

    submittingRef.current = true;
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      });
      if (!res.ok) {
        setFailKind(failKindFor(res.status));
        setStatus("error");
        return;
      }
      setSent({ name: formData.name, email: formData.email.trim() });
      setStatus("success");
      setFormData(EMPTY_FORM);
    } catch {
      setFailKind(failKindFor(null));
      setStatus("error");
    } finally {
      submittingRef.current = false;
    }
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const openAbout = () => {
    if (variant === "mobile") useMobileStore.getState().openApp("about-me");
    else useOSStore.getState().openWindow("about-me");
  };

  const submitting = status === "submitting";

  // The mailto fallback carries whatever the visitor already typed.
  const mailtoHref = (() => {
    const params = new URLSearchParams();
    if (formData.subject.trim()) params.set("subject", formData.subject.trim());
    if (formData.message.trim()) params.set("body", formData.message.trim());
    const q = params.toString().replace(/\+/g, "%20");
    return `mailto:${contactLinks.email}${q ? `?${q}` : ""}`;
  })();

  // Shared props for every input: id, name, value, error wiring, max length.
  const fieldProps = (key: FieldKey) => ({
    id: `contact-${key}`,
    name: key,
    value: formData[key],
    maxLength: MAX_LEN[key],
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? errorId(key) : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(key, e.target.value),
  });

  return (
    <div className="contact-app h-full overflow-y-auto bg-bg">
      <div className="contact-doc mx-auto flex w-full max-w-5xl flex-col">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <SuccessView
                name={sent.name}
                email={sent.email}
                onReset={() => setStatus("idle")}
                onAbout={openAbout}
                reduced={reduced}
              />
            </motion.div>
          ) : (
            <motion.div
              key="document"
              variants={reveal.container(reduced)}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
              className="contact-layout"
            >
              <motion.section variants={reveal.item(reduced)} aria-labelledby="contact-heading" className="flex min-w-0 flex-col gap-5">
                <header className="flex flex-col gap-2">
                  <h1 id="contact-heading" className="font-display text-[clamp(1.75rem,5cqi,2.25rem)] leading-tight text-text">
                    Send a message
                  </h1>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-[56ch]">
                    Hiring for a role or have a project in mind? Send a note. It goes straight to my inbox.
                    All fields are required unless marked optional.
                  </p>
                </header>

                {/* Screen-reader summary of what failed validation. */}
                <p role="alert" className="sr-only">
                  {errorSummary}
                </p>

                {/* noValidate: the JS validation is the single source of truth,
                    so type="email" keeps the phone's email keyboard without the
                    native bubble pre-empting the inline errors. */}
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  <div className="contact-fields">
                    <Field id="name" label="Name" error={errors.name}>
                      <input
                        {...fieldProps("name")}
                        autoComplete="name"
                        enterKeyHint="next"
                        required
                        aria-required
                        className={inputCls(!!errors.name)}
                      />
                    </Field>

                    <Field id="email" label="Email" error={errors.email}>
                      <input
                        {...fieldProps("email")}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        placeholder="name@company.com"
                        required
                        aria-required
                        className={inputCls(!!errors.email)}
                      />
                    </Field>

                    <Field id="company" label="Company" optional>
                      <input
                        {...fieldProps("company")}
                        autoComplete="organization"
                        enterKeyHint="next"
                        className={inputCls(false)}
                      />
                    </Field>

                    <Field id="subject" label="Subject" error={errors.subject}>
                      <input
                        {...fieldProps("subject")}
                        autoComplete="off"
                        enterKeyHint="next"
                        placeholder="e.g. Software Engineer role at Acme"
                        required
                        aria-required
                        className={inputCls(!!errors.subject)}
                      />
                    </Field>
                  </div>

                  <Field id="message" label="Message" error={errors.message}>
                    <textarea
                      {...fieldProps("message")}
                      placeholder="What's the role or project, and how can I help?"
                      rows={4}
                      required
                      aria-required
                      className={`${inputCls(!!errors.message)} resize-none`}
                    />
                  </Field>

                  {status === "error" && (
                    <FailBanner kind={failKind} mailtoHref={mailtoHref} onRetry={() => void submit()} />
                  )}

                  {/* Submit: aria-disabled (not disabled) while sending, so focus
                      stays on the button instead of dropping to <body>. */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      aria-disabled={submitting}
                      aria-busy={submitting}
                      className={`${PRIMARY_BTN} ${submitting ? "cursor-progress opacity-70" : ""}`}
                    >
                      {submitting ? "Sending" : "Send message"}
                      <span
                        aria-hidden
                        className={submitting ? "motion-safe:animate-spin" : ""}
                      >
                        {submitting ? "◴" : "→"}
                      </span>
                    </button>
                  </div>
                </form>
              </motion.section>

              <motion.div variants={reveal.item(reduced)} className="min-w-0">
                <ReachAside />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

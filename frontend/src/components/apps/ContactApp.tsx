"use client";

/**
 * ContactApp - "Ping Me" in the Instrument editorial register.
 *
 * A single vertically-scrolled editorial document: an identity masthead
 * (serif name + mono spec metadata + availability chip + hairline-divided
 * reach-me link rows) sits above a contact form. The form keeps every piece
 * of behaviour from the original - the five fields, per-field validation, the
 * real POST to /api/contact, and the submitting / success / error states -
 * but the chrome is rebuilt in the house language: hairline-underline inputs,
 * mono uppercase MetaLabel field labels, and a restrained monochrome submit
 * (text + glyph + hairline), never a filled accent block.
 *
 * Desktop and mobile share this one layout; the only difference is horizontal
 * padding. The same registry component renders both (mobile passes
 * variant="mobile").
 *
 * Animations: content reveals ONCE on mount via a staggered container, never
 * on scroll - a windowed inner scroll container makes in-view triggers
 * unreliable, so nothing here depends on an IntersectionObserver. Everything
 * collapses to instant under reduced motion via the shared `reveal` variants.
 *
 * Persona: identity leaks from specifics (the work + location), never from
 * student / graduation / degree / visa framing.
 */

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Hairline, MetaLabel, EditorialSection } from "@/components/editorial";
import { useIsMono } from "@/hooks/usePalette";
import { reveal } from "@/lib/motion";
import { identity, contactLinks } from "@/data/aboutMe";

// Strong ease-out for UI enter/exit (Kowalski). Never ease-in on UI; keep <300ms.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Pressable surface shared by every tappable editorial row (link rows, submit,
// reset, retry). Hairline-hover bg stays, plus:
//   - tactile :active scale(0.98) settle on a 160ms ease-out (GPU transform only)
//   - hover motion gated behind a fine pointer so touch taps don't false-fire
//   - transform + colors animate on their own short ease-out curves
const PRESSABLE =
  "transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] " +
  "active:scale-[0.98] active:duration-100 motion-reduce:active:scale-100 " +
  "hover:bg-black/[0.035] dark:hover:bg-white/[0.05] " +
  "focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]";

// Hover-only glyph nudge, gated behind a real (fine) pointer so a touch tap
// never strands the glyph in its hover position. Collapses under reduced motion.
const HOVER_NUDGE =
  "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] " +
  "[@media(hover:hover)and(pointer:fine)]:group-hover:translate-x-0.5 " +
  "motion-reduce:transform-none";

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

type Status = "idle" | "submitting" | "success" | "error";

interface ContactAppProps {
  variant?: "desktop" | "mobile";
}

// ---------------------------------------------------------------------------
// Masthead spec-line + reach-me rows. Mono metadata, hairline-divided links.
// ---------------------------------------------------------------------------

const SPEC_LINE = [identity.title, identity.location] as const;

interface ReachRow {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

const REACH_ROWS: ReachRow[] = [
  { label: "Email", value: contactLinks.email, href: `mailto:${contactLinks.email}` },
  { label: "LinkedIn", value: contactLinks.linkedin, href: contactLinks.linkedin, external: true },
  { label: "GitHub", value: contactLinks.github, href: contactLinks.github, external: true },
];

function LinkRow({ label, value, href, external }: ReachRow) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`group flex items-center gap-4 py-3 px-1 text-left ${PRESSABLE}`}
    >
      <MetaLabel className="shrink-0 w-20 justify-start">{label}</MetaLabel>
      <span className="flex-1 min-w-0 font-mono text-sm text-text truncate">
        {value}
        {/* Hairline underline grows on hover (transform-only, monochrome).
            Gated behind a fine pointer so a touch tap doesn't strand it open;
            collapses under the global reduced-motion safety net. */}
        <span
          aria-hidden
          className="block h-px origin-left scale-x-0 bg-text/40 transition-transform
                     duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
                     [@media(hover:hover)and(pointer:fine)]:group-hover:scale-x-100
                     motion-reduce:transition-none"
        />
      </span>
      <MetaLabel className={`shrink-0 justify-end ${HOVER_NUDGE}`} aria-hidden>
        ↗
      </MetaLabel>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Identity masthead - serif name, mono spec-line, editorial availability chip,
// hairline-divided reach-me rows.
// ---------------------------------------------------------------------------

function IdentityMasthead({ reduced }: { reduced: boolean | null }) {
  const mono = useIsMono();

  return (
    <motion.header variants={reveal.item(reduced)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="editorial-head font-display text-text leading-tight">
          {identity.name}
        </h1>

        {/* Mono spec-line: MetaLabel cells separated by middots. */}
        <p className="flex flex-wrap items-center gap-x-1 gap-y-1">
          {SPEC_LINE.map((cell, i) => (
            <React.Fragment key={cell}>
              {i > 0 && (
                <span aria-hidden className="font-mono-meta opacity-50">
                  &middot;
                </span>
              )}
              <MetaLabel>{cell}</MetaLabel>
            </React.Fragment>
          ))}
        </p>
      </div>

      {/* Availability - editorial chip: hairline border, filled square, no
          pulse. In Fun the square + label may carry hue; in mono it is tone
          and weight only. */}
      <span
        className={`inline-flex w-fit items-center gap-2 border px-2.5 py-1
                    ${mono ? "border-border" : "border-green-500/30"}`}
      >
        <span aria-hidden className={`h-2 w-2 ${mono ? "bg-text" : "bg-green-500"}`} />
        <MetaLabel className={mono ? undefined : "text-green-600 dark:text-green-400"}>
          Open to opportunities
        </MetaLabel>
      </span>

      {/* Reach-me rows - hairline-divided link list, About-Me register. */}
      <div className="flex flex-col mt-1">
        <Hairline />
        {REACH_ROWS.map((row) => (
          <React.Fragment key={row.label}>
            <LinkRow {...row} />
            <Hairline />
          </React.Fragment>
        ))}
      </div>
    </motion.header>
  );
}

// ---------------------------------------------------------------------------
// Editorial field - mono uppercase MetaLabel, hairline-underline input,
// mono-toned error copy (no colored chips).
// ---------------------------------------------------------------------------

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const mono = useIsMono();
  // In mono the asterisk + error copy carry meaning via tone + weight, not
  // hue; in Fun the original red returns.
  const markerCls = mono ? "text-text" : "text-red-400";
  const errorCls = mono ? "text-text font-medium" : "text-red-400";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="block">
        <MetaLabel>
          {label}
          {required && (
            <span aria-hidden className={`${markerCls} ml-0.5`}>
              *
            </span>
          )}
        </MetaLabel>
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            // Transform string (not the `y` shorthand) so the slide is
            // GPU-composited; ease-out enter, snappier exit (Kowalski).
            initial={{ opacity: 0, transform: "translateY(-4px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            // Error copy is deliberately a notch smaller than the mono-meta ramp;
            // clamp keeps it window-dynamic instead of pinned at a fixed 10px.
            className={`font-mono-meta text-[clamp(0.6rem,1.25cqi,0.625rem)] normal-case tracking-normal ${errorCls}`}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hairline-underline input. No filled box, no ring; the bottom border thickens
// to graphite on focus and on error. Strictly monochrome in mono.
const inputCls = (hasError?: boolean) =>
  `w-full bg-transparent px-0 py-2 text-sm text-text outline-none
   placeholder:text-text-secondary/40
   border-0 border-b transition-colors duration-150
   ${hasError
     ? "border-text/60"
     : "border-border focus:border-text/70 hover:border-text/40"}`;

// ---------------------------------------------------------------------------
// Success state - mono glyph + serif line + restrained reset, no color, no
// scale-pop card.
// ---------------------------------------------------------------------------

function SuccessView({ onReset, reduced }: { onReset: () => void; reduced: boolean | null }) {
  return (
    <motion.div
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
      className="flex flex-col items-start gap-5"
    >
      <motion.div variants={reveal.item(reduced)} className="flex items-center gap-3">
        <span aria-hidden className="font-mono-meta text-text text-base leading-none">
          ✓
        </span>
        <MetaLabel>Message sent</MetaLabel>
      </motion.div>

      <motion.h2 variants={reveal.item(reduced)} className="editorial-head font-display text-text leading-tight">
        Thanks for reaching out.
      </motion.h2>

      <motion.p variants={reveal.item(reduced)} className="text-sm text-text-secondary max-w-[48ch] leading-relaxed">
        {"I read every message and reply faster than a hot reload. Promise."}
      </motion.p>

      <motion.div variants={reveal.item(reduced)} className="flex flex-col w-full max-w-xs">
        <Hairline />
        <button
          type="button"
          onClick={onReset}
          className={`group flex items-center justify-between py-3 px-1 text-left ${PRESSABLE}`}
        >
          <MetaLabel>Send another</MetaLabel>
          <span aria-hidden className={`font-mono-meta text-text-secondary ${HOVER_NUDGE}`}>
            →
          </span>
        </button>
        <Hairline />
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// The `variant` prop is accepted for registry compatibility (mobile passes
// variant="mobile"); desktop and mobile share this one editorial layout, so it
// is intentionally not branched on.
export default function ContactApp(_props: ContactAppProps = {}) {
  void _props;
  const reduced = useReducedMotion();
  const mono = useIsMono();
  const [formData, setFormData] = useState<FormData>({
    name: "", email: "", company: "", subject: "", message: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [status, setStatus] = useState<Status>("idle");

  const validate = (key: keyof FormData, value: string): string | null => {
    switch (key) {
      case "name":    return value.length < 2 ? "At least 2 characters" : null;
      case "email":   return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Enter a valid email" : null;
      case "subject": return value.length < 5 ? "At least 5 characters" : null;
      case "message": return value.length < 20 ? "At least 20 characters" : null;
      default:        return null;
    }
  };

  const handleChange = (key: keyof FormData, value: string) => {
    setFormData((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<FormData> = {};
    (["name", "email", "subject", "message"] as const).forEach((f) => {
      if (!formData[f].trim()) newErrors[f] = "Required";
      else {
        const err = validate(f, formData[f]);
        if (err) newErrors[f] = err;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setFormData({ name: "", email: "", company: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  const submitting = status === "submitting";

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-8 sm:px-10 sm:py-10 flex flex-col gap-10">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <SuccessView onReset={() => setStatus("idle")} reduced={reduced} />
            </motion.div>
          ) : (
            <motion.div
              key="document"
              variants={reveal.container(reduced)}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
              className="flex flex-col gap-10"
            >
              <IdentityMasthead reduced={reduced} />

              <motion.div variants={reveal.item(reduced)}>
                <EditorialSection number="01" eyebrow="Get in touch" title="Drop me a line">
                  <div className="flex flex-col gap-6">
                    <p className="text-sm text-text-secondary leading-relaxed max-w-[56ch]">
                      Have a role, a project, or just want to say hi? Send it over and
                      it lands straight in my inbox.
                    </p>

                    {status === "error" && (
                      <motion.div
                        // GPU transform string + ease-out; <300ms (Kowalski).
                        initial={{ opacity: 0, transform: "translateY(-6px)" }}
                        animate={{ opacity: 1, transform: "translateY(0px)" }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        className="flex flex-col"
                      >
                        <Hairline />
                        <div className="flex items-center justify-between gap-3 py-3 px-1">
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden
                              className={`font-mono-meta text-base leading-none ${
                                mono ? "text-text" : "text-red-400"
                              }`}
                            >
                              !
                            </span>
                            <span
                              className={`text-sm ${
                                mono ? "text-text font-medium" : "text-red-400"
                              }`}
                            >
                              Something broke on my end.
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setStatus("idle")}
                            className="font-mono-meta text-text-secondary
                                       transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                                       hover:text-text active:scale-[0.97] active:duration-100
                                       motion-reduce:active:scale-100
                                       focus-visible:outline-none focus-visible:text-text"
                          >
                            Retry
                          </button>
                        </div>
                        <Hairline />
                      </motion.div>
                    )}

                    {/* noValidate: custom JS validation is the single source of
                        truth, so type="email" keeps the mobile email keyboard
                        without the native bubble pre-empting our editorial errors. */}
                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Field id="name" label="Name" required error={errors.name}>
                          <input
                            id="name"
                            placeholder="Your name"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            className={inputCls(!!errors.name)}
                          />
                        </Field>

                        <Field id="email" label="Email" required error={errors.email}>
                          <input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            className={inputCls(!!errors.email)}
                          />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Field id="company" label="Company">
                          <input
                            id="company"
                            placeholder="Optional"
                            value={formData.company}
                            onChange={(e) => handleChange("company", e.target.value)}
                            className={inputCls(false)}
                          />
                        </Field>

                        <Field id="subject" label="Subject" required error={errors.subject}>
                          <input
                            id="subject"
                            placeholder="What's on your mind?"
                            value={formData.subject}
                            onChange={(e) => handleChange("subject", e.target.value)}
                            className={inputCls(!!errors.subject)}
                          />
                        </Field>
                      </div>

                      <Field id="message" label="Message" required error={errors.message}>
                        <textarea
                          id="message"
                          placeholder="Tell me about the opportunity, project, or just say hey..."
                          value={formData.message}
                          onChange={(e) => handleChange("message", e.target.value)}
                          rows={5}
                          className={`${inputCls(!!errors.message)} resize-none`}
                        />
                      </Field>

                      {/* Submit - restrained monochrome row: serif-adjacent mono
                          label + glyph above a hairline, never a filled accent
                          block. The glyph spins under load (collapses under
                          reduced motion). */}
                      <div className="flex flex-col">
                        <Hairline />
                        <button
                          type="submit"
                          disabled={submitting}
                          aria-busy={submitting}
                          className={`group flex items-center justify-between py-3 px-1 text-left
                                     disabled:cursor-not-allowed disabled:opacity-60
                                     disabled:active:scale-100 ${PRESSABLE}`}
                        >
                          {/* Label crossfade is masked with a touch of blur so the
                              two words blend into one state change instead of a
                              hard text swap (Kowalski's blur-mask trick). */}
                          <MetaLabel
                            className={`transition-[filter,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                                        ${submitting ? "motion-safe:blur-[1px] opacity-80" : "blur-0 opacity-100"}`}
                          >
                            {submitting ? "Sending" : "Send message"}
                          </MetaLabel>
                          <span
                            aria-hidden
                            className={`font-mono-meta text-text-secondary
                                        ${submitting
                                          ? "motion-safe:animate-spin"
                                          : `transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                                             [@media(hover:hover)and(pointer:fine)]:group-hover:translate-x-0.5
                                             motion-reduce:transform-none`}`}
                          >
                            {submitting ? "◴" : "→"}
                          </span>
                        </button>
                        <Hairline />
                      </div>
                    </form>
                  </div>
                </EditorialSection>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

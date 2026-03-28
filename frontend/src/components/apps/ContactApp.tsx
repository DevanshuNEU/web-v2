'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Mail, User, MessageSquare, Send, CheckCircle,
  Building, Loader2, Github, Linkedin, MapPin,
} from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

/* ------------------------------------------------------------------ */
/*  Inline macOS-style input                                           */
/* ------------------------------------------------------------------ */

function Field({
  id, label, required, error, children,
}: {
  id: string; label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-[11px] text-red-400"
          >{error}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = (hasError?: boolean) =>
  `w-full px-3 py-2 rounded-lg text-sm text-text
   bg-black/[0.04] dark:bg-white/[0.06]
   border transition-all duration-150 outline-none
   placeholder:text-text-secondary/40
   focus:ring-2 focus:ring-accent/30 focus:border-accent/50
   ${hasError
     ? 'border-red-400/60'
     : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'}`;

/* ------------------------------------------------------------------ */
/*  Success state                                                      */
/* ------------------------------------------------------------------ */

function SuccessView({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col items-center justify-center gap-5 p-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center"
      >
        <CheckCircle className="w-8 h-8 text-green-500" />
      </motion.div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-text mb-1">Message sent!</h3>
        <p className="text-sm text-text-secondary max-w-xs">
          {"I'll get back to you faster than a hot reload. Promise."}
        </p>
      </div>
      <button
        onClick={onReset}
        className="px-4 py-1.5 rounded-lg text-sm text-text-secondary border border-black/10 dark:border-white/10 hover:border-accent/40 hover:text-accent transition-colors"
      >
        Send another
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function ContactApp() {
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', company: '', subject: '', message: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [status, setStatus] = useState<Status>('idle');

  const validate = (key: keyof FormData, value: string): string | null => {
    switch (key) {
      case 'name':    return value.length < 2 ? 'At least 2 characters' : null;
      case 'email':   return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email' : null;
      case 'subject': return value.length < 5 ? 'At least 5 characters' : null;
      case 'message': return value.length < 20 ? 'At least 20 characters' : null;
      default:        return null;
    }
  };

  const handleChange = (key: keyof FormData, value: string) => {
    setFormData(p => ({ ...p, [key]: value }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<FormData> = {};
    (['name', 'email', 'subject', 'message'] as const).forEach(f => {
      if (!formData[f].trim()) newErrors[f] = 'Required';
      else { const err = validate(f, formData[f]); if (err) newErrors[f] = err; }
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setFormData({ name: '', email: '', company: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left sidebar: personal card ── */}
      <div className="w-52 flex-shrink-0 app-sidebar flex flex-col">

        {/* Identity */}
        <div className="p-5 flex flex-col items-center gap-3 border-b border-black/6 dark:border-white/6">
          <div className="w-[72px] h-[72px] rounded-full overflow-hidden ring-2 ring-accent/20 shadow-md flex-shrink-0">
            <Image
              src="/devanshu-photo.png"
              alt="Devanshu"
              width={72} height={72}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-text leading-tight">Devanshu</p>
            <p className="text-[11px] text-text-secondary mt-0.5">Software Engineer</p>
          </div>
          {/* Availability */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            Open to opportunities
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 p-3 overflow-auto">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest px-2 mb-2 mt-0.5">
            Reach me
          </p>
          {[
            { href: 'mailto:chicholikar.d@northeastern.edu', icon: Mail,     label: 'chicholikar.d@...' },
            { href: 'https://github.com/DevanshuNEU',        icon: Github,   label: 'DevanshuNEU' },
            { href: 'https://linkedin.com/in/devanshuchicholikar', icon: Linkedin, label: 'LinkedIn' },
            { href: '#',                                      icon: MapPin,   label: 'Boston, MA' },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] text-text-secondary hover:text-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors mb-0.5"
            >
              <Icon size={12} className="text-accent flex-shrink-0" />
              <span className="truncate">{label}</span>
            </a>
          ))}
        </div>

        {/* Bottom quote */}
        <div className="p-4 text-[11px] text-text-secondary/50 italic text-center border-t border-black/6 dark:border-white/6 leading-relaxed">
          &ldquo;My inbox is warmer than Boston winters.&rdquo;
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <SuccessView key="success" onReset={() => setStatus('idle')} />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto p-5"
            >
              {/* Header */}
              <div className="mb-5">
                <h1 className="text-xl font-bold text-text mb-1">Drop me a line</h1>
                <p className="text-sm text-text-secondary">
                  Have a role? A project? Just want to say hi? Send it over.
                </p>
              </div>

              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-sm text-red-500 flex items-center justify-between"
                >
                  <span>Something broke on my end.{' '}</span>
                  <button className="text-xs underline ml-2 flex-shrink-0" onClick={() => setStatus('idle')}>
                    Try again
                  </button>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="name" label="Name" required error={errors.name}>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/40 pointer-events-none" />
                      <input
                        id="name" placeholder="Your name"
                        value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                        className={`${inputCls(!!errors.name)} pl-8`}
                      />
                    </div>
                  </Field>

                  <Field id="email" label="Email" required error={errors.email}>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/40 pointer-events-none" />
                      <input
                        id="email" type="email" placeholder="you@company.com"
                        value={formData.email}
                        onChange={e => handleChange('email', e.target.value)}
                        className={`${inputCls(!!errors.email)} pl-8`}
                      />
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field id="company" label="Company">
                    <div className="relative">
                      <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/40 pointer-events-none" />
                      <input
                        id="company" placeholder="Optional"
                        value={formData.company}
                        onChange={e => handleChange('company', e.target.value)}
                        className={`${inputCls()} pl-8`}
                      />
                    </div>
                  </Field>

                  <Field id="subject" label="Subject" required error={errors.subject}>
                    <div className="relative">
                      <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/40 pointer-events-none" />
                      <input
                        id="subject" placeholder="What's on your mind?"
                        value={formData.subject}
                        onChange={e => handleChange('subject', e.target.value)}
                        className={`${inputCls(!!errors.subject)} pl-8`}
                      />
                    </div>
                  </Field>
                </div>

                <Field id="message" label="Message" required error={errors.message}>
                  <textarea
                    id="message"
                    placeholder="Tell me about the opportunity, project, or just say hey..."
                    value={formData.message}
                    onChange={e => handleChange('message', e.target.value)}
                    rows={6}
                    className={`${inputCls(!!errors.message)} resize-none`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
                             bg-accent text-white text-sm font-medium
                             hover:opacity-90 active:opacity-80
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-opacity shadow-sm"
                >
                  {status === 'submitting' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Message</>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, User, MessageSquare, Send, CheckCircle, Building, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactApp() {
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', company: '', subject: '', message: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [status, setStatus] = useState<Status>('idle');

  const validateField = (key: keyof FormData, value: string): string | null => {
    switch (key) {
      case 'name': return value.length < 2 ? 'Name must be at least 2 characters' : null;
      case 'email': return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email' : null;
      case 'subject': return value.length < 5 ? 'Subject must be at least 5 characters' : null;
      case 'message': return value.length < 20 ? 'Message must be at least 20 characters' : null;
      default: return null;
    }
  };

  const handleInputChange = (key: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<FormData> = {};
    (['name', 'email', 'subject', 'message'] as const).forEach(field => {
      if (!formData[field].trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      } else {
        const err = validateField(field, formData[field]);
        if (err) newErrors[field] = err;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('send failed');
      setStatus('success');
      setFormData({ name: '', email: '', company: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-text mb-2">Message sent!</h3>
          <p className="text-sm text-text-secondary mb-6">
            {"I'll get back to you faster than a hot reload."}
          </p>
          <Button onClick={() => setStatus('idle')} variant="outline">
            Send another
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-5">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-text mb-1">Ping Me</h1>
        <p className="text-sm text-text-secondary">
          Have a role in mind? A project? Just want to say hi? I&apos;m all ears.
        </p>
      </div>

      {status === 'error' && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
          Something went wrong. Even my code has bad days.{' '}
          <button className="underline" onClick={() => setStatus('idle')}>Try again?</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-text">
              Name <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/50" />
              <Input
                id="name"
                placeholder="Your name"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                className={`pl-9 ${errors.name ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-text">
              Email <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/50" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                className={`pl-9 ${errors.email ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Company */}
          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs font-medium text-text">
              Company
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/50" />
              <Input
                id="company"
                placeholder="Optional"
                value={formData.company}
                onChange={e => handleInputChange('company', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs font-medium text-text">
              Subject <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/50" />
              <Input
                id="subject"
                placeholder="What's on your mind?"
                value={formData.subject}
                onChange={e => handleInputChange('subject', e.target.value)}
                className={`pl-9 ${errors.subject ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.subject && <p className="text-xs text-red-400">{errors.subject}</p>}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <Label htmlFor="message" className="text-xs font-medium text-text">
            Message <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="message"
            placeholder="Tell me about the opportunity, project, or anything you'd like to discuss..."
            value={formData.message}
            onChange={e => handleInputChange('message', e.target.value)}
            className={`min-h-32 resize-none ${errors.message ? 'border-red-400' : ''}`}
            rows={6}
          />
          {errors.message && <p className="text-xs text-red-400">{errors.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

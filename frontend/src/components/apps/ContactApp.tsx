'use client';

import React, { useState } from 'react';
import { Mail, User, MessageSquare, Send, CheckCircle, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StandardCard, AppPage } from '@/components/ui/standard';

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

export default function ContactApp() {
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', company: '', subject: '', message: ''
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
        const error = validateField(field, formData[field]);
        if (error) newErrors[field] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitted(true);
    setFormData({ name: '', email: '', company: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <AppPage>
        <div className="flex items-center justify-center min-h-96">
          <StandardCard>
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Message Sent!</h3>
              <p className="text-gray-600 mb-8 text-lg">
                Thanks for reaching out! I'll get back to you within 24 hours.
              </p>
              <Button onClick={() => setIsSubmitted(false)} size="lg">
                Send Another Message
              </Button>
            </div>
          </StandardCard>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage>
      {/* Header */}
      <StandardCard>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Get in Touch</h1>
        <p className="text-xl text-gray-600">
          Interested in working together? Have a question about my projects? Let's connect!
        </p>
      </StandardCard>

      {/* Contact Form */}
      <StandardCard delay={0.2}>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-base font-medium text-gray-900">
                Your Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`pl-12 h-14 ${errors.name ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium text-gray-900">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`pl-12 h-14 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>

          {/* Company & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="company" className="text-base font-medium text-gray-900">
                Company/Organization
              </Label>
              <div className="relative">
                <Building className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="company"
                  placeholder="Your company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="pl-12 h-14"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="subject" className="text-base font-medium text-gray-900">
                Subject <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="subject"
                  placeholder="What would you like to discuss?"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={`pl-12 h-14 ${errors.subject ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.subject && <p className="text-sm text-red-500">{errors.subject}</p>}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <Label htmlFor="message" className="text-base font-medium text-gray-900">
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Tell me about the opportunity, your project, or anything you'd like to discuss..."
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              className={`min-h-40 resize-none ${errors.message ? 'border-red-500' : ''}`}
              rows={8}
            />
            {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-base"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-3" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </StandardCard>
    </AppPage>
  );
}

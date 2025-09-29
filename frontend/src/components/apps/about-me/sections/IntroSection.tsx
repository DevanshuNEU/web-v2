'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Calendar, Mail, Github, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StandardCard } from '@/components/ui/standard';

export default function IntroSection() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <StandardCard>
        <div className="text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <div 
              className="rounded-full overflow-hidden ring-4 ring-white/50 shadow-xl"
              style={{ width: '8rem', height: '8rem' }}
            >
              <Image
                src="/devanshu-photo.png"
                alt="Devanshu Chicholikar"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-gray-900 mb-3"
          >
            Devanshu Chicholikar
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-600 mb-6"
          >
            Software Engineer
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-8 text-base text-gray-500 mb-6"
          >
            <span className="flex items-center gap-2">
              <MapPin size={16} />
              Boston, MA
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={16} />
              MS 2026
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Badge 
              variant="outline" 
              className="bg-green-50 text-green-700 border-green-300 px-4 py-2"
            >
              Open to opportunities
            </Badge>
          </motion.div>
        </div>
      </StandardCard>
    </div>
  );
}
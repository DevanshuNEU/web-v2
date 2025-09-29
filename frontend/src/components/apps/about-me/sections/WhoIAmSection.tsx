'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Calendar, Mail, Github, Linkedin, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StandardCard } from '@/components/ui/standard';

export default function WhoIAmSection() {
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <StandardCard>
        <div className="text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <div className="rounded-full overflow-hidden ring-4 ring-white/50 shadow-xl w-32 h-32">
              <Image
                src="/devanshu-photo.png"
                alt="Devanshu Chicholikar"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Devanshu Chicholikar
          </h1>
          <p className="text-lg text-gray-600 mb-4">Software Engineer</p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-2">
              <MapPin size={16} />
              Boston, MA
            </span>
            <span className="flex items-center gap-2">
              <GraduationCap size={16} />
              MS Student at Northeastern
            </span>
          </div>
          
          <Badge className="bg-blue-50 text-blue-700 border-blue-300">
            Spring 2026 Co-op + Full-time Opportunities
          </Badge>
        </div>
      </StandardCard>

      {/* Personal Story */}
      <StandardCard>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          How It All Started
        </h2>
        
        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p>
            I was eight years old when my father brought home our first laptop. 
            Watching that machine do incredible things with just a few clicks completely 
            blew my mind. The curiosity didn't stop there - it only grew stronger.
          </p>
          
          <p>
            Those Digit magazine CDs and endless hours exploring what computers 
            could do shaped everything. That kid who was fascinated by technology 
            is now building distributed systems and solving complex engineering challenges.
          </p>
          
          <p>
            Today, I&apos;m working through my MS at Northeastern while actively looking 
            for Spring 2026 co-ops and full-time opportunities. I&apos;m here to learn, 
            grow, and work on projects that actually matter. Always excited about 
            crazy opportunities that push boundaries.
          </p>
        </div>
      </StandardCard>

      {/* Current Focus */}
      <StandardCard>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          What I'm About
        </h2>
        
        <div className="space-y-4 text-gray-700">
          <p>
            I genuinely enjoy building systems that work reliably at scale. 
            Whether it's optimizing APIs for 65% latency reduction or architecting 
            fault-tolerant infrastructure with 99.9% uptime, I care about the details 
            that make software actually usable.
          </p>
          
          <p>
            Right now I'm looking for Spring 2026 co-ops and genuinely excited about 
            full-time opportunities where I can learn, grow, and work on meaningful projects 
            with great teams. Always open to discussing technology, sharing experiences, 
            or collaborating on interesting problems.
          </p>
        </div>
      </StandardCard>

      {/* Quick Connect */}
      <StandardCard>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Let's Connect
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <Button size="sm" asChild>
            <a href="mailto:chicholikar.d@northeastern.edu">
              <Mail className="mr-2" size={16} />
              Email
            </a>
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <a href="https://www.linkedin.com/in/devanshuchicholikar/" target="_blank">
              <Linkedin className="mr-2" size={16} />
              LinkedIn
            </a>
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <a href="https://github.com/devanshuNEU" target="_blank">
              <Github className="mr-2" size={16} />
              GitHub
            </a>
          </Button>
        </div>
      </StandardCard>
    </div>
  );
}
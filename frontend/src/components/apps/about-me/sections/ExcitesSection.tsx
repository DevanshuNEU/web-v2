'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Brain, Rocket, Globe, Code, Lightbulb } from 'lucide-react';
import { StandardCard } from '@/components/ui/standard';

const excitementCards = [
  {
    icon: <Brain className="text-purple-600" size={24} />,
    title: "AI & Future of Engineering",
    description: "The intersection of human creativity and AI capabilities is reshaping how we build software. I'm fascinated by tools that amplify developer productivity while preserving the craft of thoughtful system design."
  },
  {
    icon: <Rocket className="text-blue-600" size={24} />,
    title: "System Architecture at Scale",
    description: "There's something deeply satisfying about designing systems that can handle 10x growth gracefully. Clean architecture isn't just about code—it's about building foundations that enable teams to move fast without breaking things."
  },
  {
    icon: <Globe className="text-green-600" size={24} />,
    title: "The Next Decade of Tech",
    description: "We're at an inflection point. Edge computing, AI integration, and developer experience tooling are converging to create possibilities we haven't seen since the mobile revolution."
  },
  {
    icon: <Code className="text-orange-600" size={24} />,
    title: "Developer Experience Revolution",
    description: "The best tools disappear into the background, letting you focus on solving real problems. I'm excited about frameworks and platforms that make complex things simple without hiding the important details."
  }
];

const thoughtPosts = [
  {
    title: "Why Clean Code Matters More Than Ever",
    excerpt: "In a world where AI can generate code instantly, the real value lies in thoughtful architecture and maintainable systems...",
    date: "Dec 2024",
    readTime: "5 min"
  },
  {
    title: "The Art of Technical Decision-Making",
    excerpt: "Every technology choice is a bet on the future. Here's how I think about evaluating trade-offs in fast-moving environments...",
    date: "Nov 2024",
    readTime: "7 min"
  },
  {
    title: "Building for 10x Growth",
    excerpt: "Premature optimization might be the root of all evil, but being completely unprepared for scale is worse...",
    date: "Oct 2024",
    readTime: "6 min"
  }
];

export default function ExcitesSection() {
  return (
    <div className="space-y-8">
      {/* Main Excitement Areas */}
      <StandardCard>
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              What Excites Me Most
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Technology is evolving rapidly, and I'm energized by the possibilities. 
              Here's what gets me excited about the future of software engineering.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {excitementCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white/50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {card.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {card.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </StandardCard>

      {/* Recent Thoughts */}
      <StandardCard>
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="text-yellow-600" size={24} />
            <h2 className="text-2xl font-semibold text-gray-900">
              Recent Thoughts & Reflections
            </h2>
          </div>

          <div className="space-y-4">
            {thoughtPosts.map((post, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 hover:text-blue-700 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center pt-4">
            <p className="text-gray-600 text-sm">
              More thoughts and technical deep-dives coming soon...
            </p>
          </div>
        </div>
      </StandardCard>
    </div>
  );
}
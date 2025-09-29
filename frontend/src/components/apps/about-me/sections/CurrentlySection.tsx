'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Code, 
  Coffee, 
  MapPin, 
  Calendar, 
  Target,
  Zap,
  Music
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StandardCard } from '@/components/ui/standard';

const currentActivities = [
  {
    icon: <BookOpen className="text-blue-600" size={20} />,
    category: "Learning",
    title: "Advanced System Design",
    description: "Deep diving into distributed systems and microservices architecture patterns",
    status: "Active"
  },
  {
    icon: <Code className="text-green-600" size={20} />,
    category: "Building",
    title: "Portfolio OS",
    description: "Creating this interactive portfolio with PostHog-inspired design principles",
    status: "In Progress"
  },
  {
    icon: <Target className="text-purple-600" size={20} />,
    category: "Seeking",
    title: "Full-Stack Opportunities",
    description: "Looking for roles where I can work on meaningful projects and grow with great teams",
    status: "Open"
  },
  {
    icon: <Zap className="text-orange-600" size={20} />,
    category: "Exploring",
    title: "AI-Powered Development",
    description: "Experimenting with AI tools to enhance developer productivity and code quality",
    status: "Research"
  }
];

const currentStack = [
  "TypeScript", "React", "Next.js", "Node.js", "Python", 
  "AWS", "Docker", "PostgreSQL", "Redis", "GraphQL"
];

const interests = [
  { icon: <Coffee />, label: "Third Wave Coffee" },
  { icon: <Music />, label: "Electronic Music" },
  { icon: <Code />, label: "Open Source" },
  { icon: <BookOpen />, label: "Tech Blogs" }
];

export default function CurrentlySection() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <StandardCard>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            What I'm Up To Right Now
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            A real-time snapshot of my current projects, learning, and focus areas.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <MapPin size={16} />
              Boston, MA
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={16} />
              Last updated: December 2024
            </span>
          </div>
        </div>
      </StandardCard>

      {/* Current Activities */}
      <StandardCard>
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Current Focus Areas
          </h2>

          <div className="space-y-4">
            {currentActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-5 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="p-2 bg-gray-50 rounded-lg">
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activity.category}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {activity.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {activity.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </StandardCard>

      {/* Current Tech Stack */}
      <StandardCard>
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Current Tech Stack
          </h2>
          <p className="text-gray-600">
            Technologies I'm actively using and enjoying right now:
          </p>
          
          <div className="flex flex-wrap gap-2">
            {currentStack.map((tech, index) => (
              <motion.div
                key={tech}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Badge 
                  variant="outline" 
                  className="px-3 py-1 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-default"
                >
                  {tech}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </StandardCard>

      {/* Personal Interests */}
      <StandardCard>
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Outside of Code
          </h2>
          <p className="text-gray-600">
            When I'm not building software, you'll find me exploring:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {interests.map((interest, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-gray-500">
                  {interest.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {interest.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </StandardCard>
    </div>
  );
}
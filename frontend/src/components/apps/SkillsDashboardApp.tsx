'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Server, Cloud, Database, Zap } from 'lucide-react';

const categoryIcons = {
  'code': Code,
  'server': Server,
  'cloud': Cloud,
  'database': Database
};

const skillsData = {
  categories: [
    {
      name: 'Languages',
      icon: 'code',
      skills: [
        { name: 'TypeScript', level: 90, experience: '3 years' },
        { name: 'Python', level: 85, experience: '4 years' },
        { name: 'Java', level: 80, experience: '2 years' },
        { name: 'SQL', level: 85, experience: '3 years' },
      ]
    },
    {
      name: 'Frontend',
      icon: 'code',
      skills: [
        { name: 'React/Next.js', level: 90, experience: '3 years' },
        { name: 'Tailwind CSS', level: 85, experience: '2 years' },
        { name: 'Framer Motion', level: 80, experience: '1 year' },
      ]
    },
    {
      name: 'Backend',
      icon: 'server',
      skills: [
        { name: 'Node.js', level: 85, experience: '3 years' },
        { name: 'Flask', level: 80, experience: '2 years' },
        { name: 'PostgreSQL', level: 85, experience: '3 years' },
      ]
    },
    {
      name: 'Cloud & DevOps',
      icon: 'cloud',
      skills: [
        { name: 'AWS', level: 85, experience: '2 years' },
        { name: 'Docker', level: 80, experience: '2 years' },
        { name: 'Terraform', level: 75, experience: '1 year' },
        { name: 'CI/CD', level: 80, experience: '2 years' },
      ]
    },
  ]
};

export default function SkillsDashboardApp() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="h-full flex flex-col bg-surface/30">
      {/* Header */}
      <div className="glass-subtle border-b border-white/10 p-6">
        <h1 className="text-2xl font-bold text-text mb-2">Skills Dashboard</h1>
        <p className="text-text-secondary mb-6">Technical expertise and experience</p>

        {/* Category Tabs */}
        <div className="flex gap-2">
          {skillsData.categories.map((category, index) => {
            const Icon = categoryIcons[category.icon as keyof typeof categoryIcons];
            return (
              <button
                key={category.name}
                onClick={() => setActiveCategory(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium
                          ${activeCategory === index
                            ? 'bg-accent text-white'
                            : 'bg-surface/50 text-text-secondary hover:bg-surface/80 hover:text-text'
                          }`}
              >
                <Icon size={16} />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="flex-1 overflow-auto p-6">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4 max-w-4xl"
        >
          {skillsData.categories[activeCategory].skills.map((skill, idx) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-subtle rounded-xl p-5 border border-white/10 hover:border-accent/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text">{skill.name}</h3>
                <span className="text-xs text-text-secondary">{skill.experience}</span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-surface/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.level}%` }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/80 rounded-full"
                />
              </div>

              <div className="mt-2 text-right">
                <span className="text-xs font-medium text-accent">{skill.level}%</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

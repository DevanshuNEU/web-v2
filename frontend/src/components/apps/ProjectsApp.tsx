'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  Github, 
  Calendar, 
  TrendingUp,
  Code,
  Sparkles
} from 'lucide-react';

const projects = [
  {
    id: 'financial-copilot',
    name: 'Financial Copilot',
    tagline: 'Because manual bookkeeping is so 2019',
    description: 'A fintech platform that uses OCR and NLP to automate receipt processing',
    story: [
      "Ever tried managing receipts manually? Yeah, it's painful. That's why I built Financial Copilot - a platform that actually understands your receipts and turns them into organized financial data automatically.",
      "The cool part? It uses OCR to read receipts (even the blurry ones), NLP to understand what everything means, and then organizes it all in a way that actually makes sense. No more shoebox full of crumpled receipts.",
      "Built with React 18 and TypeScript on the frontend because type safety matters, and Flask on the backend because sometimes Python just gets the job done. The whole thing runs in Docker containers with proper CI/CD because deploying manually is also very 2019."
    ],
    technologies: ['React 18', 'TypeScript', 'Flask', 'PostgreSQL', 'OpenAI API', 'Docker', 'GitHub Actions'],
    achievements: [
      { metric: '60%', label: 'Reduced manual bookkeeping', detail: 'Because nobody has time for manual data entry' },
      { metric: '<200ms', label: 'Response times', detail: 'With smart caching and database optimization' },
      { metric: '100%', label: 'Automated deployments', detail: 'Safe rollbacks and staged rollouts included' },
      { metric: 'OCR+NLP', label: 'Integration', detail: 'Turns messy receipts into clean data' }
    ],
    period: 'Jun 2025 - Present',
    type: 'Full-Stack',
    status: 'active',
    github: '#',
    demo: '#'
  },
  
  {
    id: 'securescale',
    name: 'SecureScale',
    tagline: 'Infrastructure that actually stays up',
    description: 'Multi-AZ AWS infrastructure with Terraform automation',
    story: [
      "You know what's harder than writing code? Making sure it stays running in production. SecureScale is my answer to that problem - a completely automated AWS infrastructure setup that's designed to not break at 3 AM.",
      "The whole thing is Infrastructure as Code using Terraform, which means no more 'it works on my machine' problems. Multi-AZ setup across different availability zones, automated CI/CD pipelines, comprehensive monitoring, and cost optimization that actually saves money.",
      "The best part? We achieved 99.9% uptime, which sounds like marketing speak but is actually measured. And yes, I obsess over uptime metrics because downtime is expensive and embarrassing."
    ],
    technologies: ['AWS', 'Terraform', 'GitHub Actions', 'CloudWatch', 'Docker', 'PostgreSQL'],
    achievements: [
      { metric: '99.9%', label: 'Uptime achieved', detail: 'With fault-tolerant multi-AZ design' },
      { metric: '85%', label: 'Reduction in deployment effort', detail: 'Automation beats manual work every time' },
      { metric: '65%', label: 'Faster releases', detail: 'Blue-green deployments with zero downtime' },
      { metric: '30%', label: 'Cost reduction', detail: 'Through rightsizing and smart resource allocation' }
    ],
    period: 'Jan 2025 - Apr 2025',
    type: 'Infrastructure',
    status: 'completed',
    github: '#',
    demo: '#'
  }
];

export default function ProjectsApp() {
  const [selectedProject, setSelectedProject] = useState(projects[0]);

  return (
    <div className="h-full flex flex-col bg-surface/30">
      {/* Header with project tabs */}
      <div className="glass-subtle border-b border-white/10 p-6">
        <h1 className="text-2xl font-bold text-text mb-2">My Projects</h1>
        <p className="text-text-secondary mb-6">Things I've built that I'm actually proud of</p>

        <div className="flex gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium
                        ${selectedProject.id === project.id
                          ? 'bg-accent text-white'
                          : 'bg-surface/50 text-text-secondary hover:bg-surface/80 hover:text-text'
                        }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <motion.div
          key={selectedProject.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-4xl"
        >
          {/* Project Hero */}
          <div className="glass-subtle rounded-2xl p-6 border border-white/10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-text mb-2">{selectedProject.name}</h2>
                <p className="text-xl text-text-secondary mb-4">{selectedProject.tagline}</p>
                <p className="text-text-secondary">{selectedProject.description}</p>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button className="p-2 rounded-lg glass-subtle border border-white/20 hover:border-accent/50 transition-all hover:scale-105 text-text">
                  <Github size={18} />
                </button>
                <button className="p-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-all hover:scale-105">
                  <ExternalLink size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-text-secondary pt-4 border-t border-white/10">
              <span className="flex items-center gap-2">
                <Calendar size={14} />
                {selectedProject.period}
              </span>
              <span className="px-2 py-1 rounded-full bg-surface/50 text-xs font-medium">
                {selectedProject.type}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium
                              ${selectedProject.status === 'active' 
                                ? 'bg-green-500/10 text-green-600' 
                                : 'bg-blue-500/10 text-blue-600'
                              }`}>
                {selectedProject.status === 'active' ? '🟢 Active' : '✅ Completed'}
              </span>
            </div>
          </div>

          {/* The Story */}
          <div className="glass-subtle rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              The Story
            </h3>
            <div className="space-y-4 text-text-secondary leading-relaxed">
              {selectedProject.story.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Technologies */}
          <div className="glass-subtle rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Code size={18} className="text-accent" />
              Built With
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedProject.technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="glass-subtle rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              Key Results
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {selectedProject.achievements.map((achievement, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20"
                >
                  <div className="text-3xl font-bold text-accent mb-1">{achievement.metric}</div>
                  <div className="text-sm font-semibold text-text mb-1">{achievement.label}</div>
                  <div className="text-xs text-text-secondary">{achievement.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

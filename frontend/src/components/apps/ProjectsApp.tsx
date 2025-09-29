'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppPage, StandardCard, Section, Grid } from '@/components/ui/standard';

const projects = [
  {
    id: 'financial-copilot',
    name: 'Financial Copilot',
    tagline: 'Because manual bookkeeping is so 2019',
    description: 'A fintech platform that uses OCR and NLP to automate receipt processing',
    story: `Ever tried managing receipts manually? Yeah, it's painful. That's why I built Financial Copilot - a platform that actually understands your receipts and turns them into organized financial data automatically.

The cool part? It uses OCR to read receipts (even the blurry ones), NLP to understand what everything means, and then organizes it all in a way that actually makes sense. No more shoebox full of crumpled receipts.

Built with React 18 and TypeScript on the frontend because type safety matters, and Flask on the backend because sometimes Python just gets the job done. The whole thing runs in Docker containers with proper CI/CD because deploying manually is also very 2019.`,
    
    technologies: ['React 18', 'TypeScript', 'Flask', 'PostgreSQL', 'OpenAI API', 'Docker', 'GitHub Actions'],
    achievements: [
      { text: 'Reduced manual bookkeeping by 60%', detail: 'Because nobody has time for manual data entry' },
      { text: 'Sub-200ms response times', detail: 'With smart caching and database optimization' },
      { text: 'Automated deployments', detail: 'Safe rollbacks and staged rollouts included' },
      { text: 'OCR + NLP integration', detail: 'Turns messy receipts into clean data' }
    ],
    period: 'Jun 2025 - Present',
    type: 'Full-Stack',
    status: 'In Development'
  },
  
  {
    id: 'securescale',
    name: 'SecureScale',
    tagline: 'Infrastructure that actually stays up',
    description: 'Multi-AZ AWS infrastructure with Terraform automation',
    story: `You know what's harder than writing code? Making sure it stays running in production. SecureScale is my answer to that problem - a completely automated AWS infrastructure setup that's designed to not break at 3 AM.

The whole thing is Infrastructure as Code using Terraform, which means no more "it works on my machine" problems. Multi-AZ setup across different availability zones, automated CI/CD pipelines, comprehensive monitoring, and cost optimization that actually saves money.

The best part? We achieved 99.9% uptime, which sounds like marketing speak but is actually measured. And yes, I obsess over uptime metrics because downtime is expensive and embarrassing.`,
    
    technologies: ['AWS', 'Terraform', 'GitHub Actions', 'CloudWatch', 'Docker', 'PostgreSQL'],
    achievements: [
      { text: '99.9% uptime achieved', detail: 'With fault-tolerant multi-AZ design' },
      { text: '85% reduction in deployment effort', detail: 'Automation beats manual work every time' },
      { text: '65% faster releases', detail: 'Blue-green deployments with zero downtime' },
      { text: '30% cost reduction', detail: 'Through rightsizing and smart resource allocation' }
    ],
    period: 'Jan 2025 - Apr 2025',
    type: 'Infrastructure',
    status: 'Completed'
  }
];

export default function ProjectsApp() {
  const [selectedProject, setSelectedProject] = useState(projects[0]);

  return (
    <AppPage>
      {/* Header */}
      <StandardCard>
        <h1 className="text-4xl font-bold text-gray-900" style={{ marginBottom: '0.75rem' }}>
          My Projects
        </h1>
        <p className="text-xl text-gray-600" style={{ marginBottom: '2rem' }}>
          Things I've built that I'm actually proud of
        </p>

        {/* Simple Project Navigation */}
        <div className="flex" style={{ gap: '1rem', marginBottom: '2rem' }}>
          {projects.map((project) => (
            <Button
              key={project.id}
              variant={selectedProject.id === project.id ? "default" : "outline"}
              onClick={() => setSelectedProject(project)}
              className="text-sm"
            >
              {project.name}
            </Button>
          ))}
        </div>
      </StandardCard>

      {/* Selected Project Details */}
      <motion.div
        key={selectedProject.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Project Header */}
        <StandardCard delay={0.1}>
          <div className="flex items-start justify-between" style={{ marginBottom: '2rem' }}>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900" style={{ marginBottom: '0.75rem' }}>
                {selectedProject.name}
              </h2>
              <p className="text-xl text-gray-600" style={{ marginBottom: '1rem' }}>
                {selectedProject.tagline}
              </p>
              <p className="text-lg text-gray-700 leading-8">
                {selectedProject.description}
              </p>
            </div>
            
            <div className="flex" style={{ gap: '0.75rem', marginLeft: '2rem' }}>
              <Button variant="outline" size="sm">
                <Github style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Code
              </Button>
              <Button size="sm">
                <ExternalLink style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Demo
              </Button>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 pt-6 border-t border-gray-200" style={{ gap: '1rem' }}>
            <span className="flex items-center" style={{ gap: '0.5rem' }}>
              <Calendar size={16} />
              {selectedProject.period}
            </span>
            <Badge variant="secondary">{selectedProject.type}</Badge>
            <Badge 
              variant="outline"
              className={
                selectedProject.status === 'In Development' 
                  ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/30' 
                  : 'bg-brand-green/10 text-brand-green border-brand-green/30'
              }
            >
              {selectedProject.status}
            </Badge>
          </div>
        </StandardCard>

        {/* Project Story */}
        <StandardCard delay={0.2}>
          <Section title="The story">
            {selectedProject.story.split('\n\n').map((paragraph, index) => (
              <p 
                key={index} 
                className="text-base text-gray-700 leading-8" 
                style={{ marginBottom: '1.5rem' }}
              >
                {paragraph}
              </p>
            ))}
          </Section>
        </StandardCard>

        {/* Technologies */}
        <StandardCard delay={0.3}>
          <Section title="Built with">
            <div className="flex flex-wrap" style={{ gap: '0.75rem' }}>
              {selectedProject.technologies.map((tech) => (
                <Badge 
                  key={tech} 
                  variant="outline" 
                  className="bg-gray-50 border-gray-300 text-gray-700"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </Section>
        </StandardCard>

        {/* Key Results */}
        <StandardCard delay={0.4}>
          <Section title="Key results">
            <Grid columns={2}>
              {selectedProject.achievements.map((achievement, index) => (
                <div 
                  key={index} 
                  className="flex bg-brand-green/8 rounded-xl border border-brand-green/20 h-full"
                  style={{ padding: '1.5rem', gap: '1rem' }}
                >
                  <div 
                    className="bg-brand-green/15 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ padding: '0.75rem' }}
                  >
                    <TrendingUp className="text-brand-green" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900" style={{ marginBottom: '0.5rem' }}>
                      {achievement.text}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {achievement.detail}
                    </p>
                  </div>
                </div>
              ))}
            </Grid>
          </Section>
        </StandardCard>
      </motion.div>
    </AppPage>
  );
}

'use client';

/**
 * ResumeApp — Interactive Resume Viewer
 *
 * A styled, scannable resume with section nav, print support, and
 * a download link. Reads clean, looks great, no BS.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Mail, MapPin, Github, Linkedin,
  Briefcase, GraduationCap, Code2, FolderGit2, ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const RESUME = {
  name: 'Devanshu Chicholikar',
  title: 'Software Engineer',
  tagline: 'MS Software Engineering @ Northeastern · Open to Spring 2026 Co-op + Full-time',
  contact: {
    email: 'chicholikar.d@northeastern.edu',
    location: 'Boston, MA',
    github: 'github.com/DevanshuNEU',
    linkedin: 'linkedin.com/in/devanshuchicholikar',
  },
  summary: 'Full-stack engineer with 3+ years building production systems across React, Node.js, AWS, and Python. Passionate about distributed systems, developer tooling, and building things that actually ship. Currently pursuing an MS in Software Engineering at Northeastern University.',

  experience: [
    {
      company: 'Northeastern University',
      role: 'Graduate Research Assistant',
      period: 'Jan 2025 — Present',
      location: 'Boston, MA',
      bullets: [
        'Researching distributed systems resilience patterns for microservice architectures',
        'Building a code intelligence platform (OpenCodeIntel) for semantic code search at scale',
        'Co-authoring paper on automated CLAUDE.md generation from static code analysis',
      ],
    },
    {
      company: 'Capgemini',
      role: 'Software Engineer',
      period: 'Aug 2022 — Jul 2024',
      location: 'Pune, India',
      bullets: [
        'Led migration of a monolithic Java application to microservices on AWS ECS, reducing deployment time by 60%',
        'Built real-time ML feature pipeline processing 500K events/day using Kafka and Redis',
        'Designed multi-tier AWS infrastructure with Terraform, achieving 99.95% uptime SLA',
        'Mentored 3 junior engineers and established team-wide TypeScript coding standards',
      ],
    },
    {
      company: 'Persistent Systems',
      role: 'Software Engineer Intern',
      period: 'Jan 2022 — Jul 2022',
      location: 'Pune, India',
      bullets: [
        'Built RESTful APIs with Flask serving 50K+ daily requests, reducing latency by 35%',
        'Implemented automated test suite with 85% code coverage using pytest and GitHub Actions',
        'Contributed to frontend migration from jQuery to React, improving bundle size by 40%',
      ],
    },
  ],

  education: [
    {
      institution: 'Northeastern University',
      degree: 'MS, Software Engineering Systems',
      period: '2024 — 2026',
      location: 'Boston, MA',
      detail: 'Distributed Systems · Cloud Computing · Algorithms · Software Architecture',
    },
    {
      institution: 'Savitribai Phule Pune University',
      degree: 'BE, Computer Engineering',
      period: '2018 — 2022',
      location: 'Pune, India',
      detail: 'GPA: 8.7 / 10 · Data Structures · OS · Databases · Computer Networks',
    },
  ],

  skills: [
    { category: 'Languages',        items: ['TypeScript', 'Python', 'Java', 'SQL', 'Go'] },
    { category: 'Frontend',         items: ['React', 'Next.js', 'Tailwind CSS', 'Framer Motion'] },
    { category: 'Backend',          items: ['Node.js', 'Flask', 'Spring Boot', 'PostgreSQL', 'Redis'] },
    { category: 'Cloud / DevOps',   items: ['AWS (EC2, S3, Lambda, ECS, RDS)', 'Docker', 'Terraform', 'GitHub Actions'] },
    { category: 'Tools',            items: ['Git', 'PostHog', 'GraphQL', 'Kafka', 'pgvector'] },
  ],

  projects: [
    { name: 'devOS', desc: 'Desktop OS portfolio with windowed apps, analytics, and custom wallpapers. Next.js 15, React 19, Zustand.', link: 'devanshuchicholikar.me' },
    { name: 'Financial Copilot', desc: 'AI financial assistant for students. Parses bank statements, integrates Plaid, provides NL budgeting advice.', link: 'github.com/DevanshuNEU/financial-copilot' },
    { name: 'SecureScale', desc: 'Production-grade AWS infra with Terraform — ECS, RDS, Vault, auto-scaling, full CI/CD.', link: 'github.com/DevanshuNEU/securescale' },
    { name: 'Saar', desc: 'CLI tool that auto-generates CLAUDE.md from codebase static analysis using AST parsing and tree-sitter.', link: 'github.com/DevanshuNEU/saar' },
  ],
};

const SECTIONS = ['Summary', 'Experience', 'Education', 'Skills', 'Projects'] as const;
type Section = typeof SECTIONS[number];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-accent flex-shrink-0" />
      <h2 className="text-sm font-bold text-text uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
      <span className="text-accent mt-1 flex-shrink-0">·</span>
      {text}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ResumeApp() {
  const [activeSection, setActiveSection] = useState<Section>('Experience');

  const sectionVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="h-full flex flex-col bg-surface/20 overflow-hidden">

      {/* Top bar */}
      <div className="flex-shrink-0 px-5 py-4 glass-subtle border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          {/* Identity */}
          <div>
            <h1 className="text-xl font-bold text-text">{RESUME.name}</h1>
            <p className="text-accent text-sm font-medium">{RESUME.title}</p>
            <p className="text-text-secondary text-xs mt-0.5">{RESUME.tagline}</p>
          </div>
          {/* Contact + Download */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <a
              href="mailto:chicholikar.d@northeastern.edu"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors text-xs font-medium text-accent"
            >
              <Download size={12} />
              Download PDF
            </a>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Mail size={11} /> {RESUME.contact.email}
              </span>
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <MapPin size={11} /> {RESUME.contact.location}
              </span>
            </div>
            <div className="flex gap-3">
              <a href={`https://${RESUME.contact.github}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors">
                <Github size={11} /> {RESUME.contact.github}
              </a>
              <a href={`https://${RESUME.contact.linkedin}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors">
                <Linkedin size={11} /> LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex gap-1 mt-4">
          {SECTIONS.map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeSection === section
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text hover:bg-white/8'
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >

            {/* Summary */}
            {activeSection === 'Summary' && (
              <motion.div variants={itemVariants}>
                <SectionHeading icon={Code2} title="Summary" />
                <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                  {RESUME.summary}
                </p>
              </motion.div>
            )}

            {/* Experience */}
            {activeSection === 'Experience' && (
              <div className="space-y-6">
                <SectionHeading icon={Briefcase} title="Experience" />
                {RESUME.experience.map((job, idx) => (
                  <motion.div key={idx} variants={itemVariants} className="relative pl-4">
                    {/* Timeline line */}
                    <div className="absolute left-0 top-2 bottom-0 w-px bg-white/10" />
                    <div className="absolute left-[-3px] top-[7px] w-2 h-2 rounded-full bg-accent" />

                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold text-text text-sm">{job.role}</h3>
                        <p className="text-accent text-xs font-medium">{job.company}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-text-secondary font-mono">{job.period}</p>
                        <p className="text-xs text-text-secondary">{job.location}</p>
                      </div>
                    </div>
                    <ul className="space-y-1 mt-2">
                      {job.bullets.map((b, i) => <Bullet key={i} text={b} />)}
                    </ul>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Education */}
            {activeSection === 'Education' && (
              <div className="space-y-5">
                <SectionHeading icon={GraduationCap} title="Education" />
                {RESUME.education.map((edu, idx) => (
                  <motion.div key={idx} variants={itemVariants} className="glass-subtle rounded-xl p-4 border border-white/10">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-text text-sm">{edu.institution}</h3>
                        <p className="text-accent text-xs font-medium mt-0.5">{edu.degree}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-text-secondary font-mono">{edu.period}</p>
                        <p className="text-xs text-text-secondary">{edu.location}</p>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-2 leading-relaxed">{edu.detail}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Skills */}
            {activeSection === 'Skills' && (
              <div className="space-y-4">
                <SectionHeading icon={Code2} title="Skills" />
                {RESUME.skills.map((group, idx) => (
                  <motion.div key={idx} variants={itemVariants}>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                      {group.category}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map(skill => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/6 text-text border border-white/10 hover:border-accent/40 hover:text-accent transition-colors cursor-default"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Projects */}
            {activeSection === 'Projects' && (
              <div className="space-y-4">
                <SectionHeading icon={FolderGit2} title="Projects" />
                {RESUME.projects.map((proj, idx) => (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    className="glass-subtle rounded-xl p-4 border border-white/10 hover:border-accent/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-text text-sm group-hover:text-accent transition-colors">
                        {proj.name}
                      </h3>
                      <a
                        href={`https://${proj.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-secondary hover:text-accent transition-colors flex-shrink-0"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{proj.desc}</p>
                    <p className="text-xs text-accent/60 mt-1.5 font-mono">{proj.link}</p>
                  </motion.div>
                ))}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

'use client';

/**
 * ResumeApp — Interactive Resume + PDF Viewer
 *
 * Two modes: polished interactive view with section nav,
 * and a raw PDF viewer showing the actual file.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Mail, MapPin, Github, Linkedin,
  Briefcase, GraduationCap, Code2, FolderGit2, ExternalLink,
  FileText, LayoutList,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Data — from actual resume
// ---------------------------------------------------------------------------

const RESUME = {
  name: 'Devanshu Chicholikar',
  title: 'Software Engineer',
  tagline: 'MS Software Engineering @ Northeastern · Open to 2026 roles',
  contact: {
    email: 'chicholikar.d@northeastern.edu',
    phone: '(857) 339-8803',
    location: 'Boston, MA',
    github: 'github.com/DevanshuNEU',
    linkedin: 'linkedin.com/in/devanshuchicholikar',
  },
  summary: 'Full-stack engineer with production experience across React, Node.js, AWS, and Python. Passionate about cloud-native systems, AI tooling, and building things that actually ship. Currently pursuing MS in Software Engineering Systems at Northeastern, GPA 3.85. Teaching cloud computing to 60+ graduate students as a TA while building open-source AI infra on the side.',

  experience: [
    {
      company: 'Northeastern University',
      role: 'Graduate Teaching Assistant — Cloud Computing & Networks',
      period: 'Sep 2025 — Present',
      location: 'Boston, MA',
      bullets: [
        'Instruct 60+ graduate students on AWS infrastructure, Terraform IaC, and distributed systems; deliver weekly hands-on sessions covering VPC, load balancing, auto-scaling, and fault-tolerant design',
        'Authored lab curriculum for Docker containerization, GitHub Actions CI/CD, and infra automation; adopted as official course content across 3 sections serving 180+ students',
        'Lead system design reviews for 15 student teams; standardized evaluation criteria across 3 TAs, reducing grade disputes 40%',
      ],
    },
    {
      company: 'Jaksh Enterprise',
      role: 'Software Engineer — Backend / Full Stack',
      period: 'Aug 2022 — Jul 2024',
      location: 'Remote',
      bullets: [
        'Architected production e-commerce platform handling 12K+ monthly users and 15K+ daily API requests using MERN stack; reduced page load from 3.2s to 2.6s, driving 35% conversion lift',
        'Designed zero-downtime CI/CD pipeline using GitHub Actions, Docker, and CI test gates; compressed sprint releases from 2 weeks to 3 days at 99.5% deployment success rate',
        'Reduced API p95 latency 65% (800ms → 280ms) via async queues, PostgreSQL B-tree indexing, and Redis caching; checkout completion up 18% during peak traffic',
      ],
    },
  ],

  education: [
    {
      institution: 'Northeastern University',
      degree: 'MS, Software Engineering Systems',
      period: 'Sept 2024 — May 2026',
      location: 'Boston, MA',
      detail: 'GPA: 3.85 · Network Structures & Cloud Computing · Generative AI · MLOps · Database Management · Algorithms',
    },
    {
      institution: 'Dhirubhai Ambani Institute of ICT',
      degree: 'B.Tech, Information & Communication Technology',
      period: 'Aug 2018 — May 2022',
      location: 'Gujarat, India',
      detail: 'Computer Networks · Operating Systems · Data Structures · Databases',
    },
  ],

  skills: [
    { category: 'Languages',      items: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'Java'] },
    { category: 'Frontend',       items: ['React', 'Next.js', 'Tailwind CSS', 'shadcn/ui', 'Zustand', 'HTML5', 'CSS3'] },
    { category: 'Backend',        items: ['Node.js', 'Express.js', 'PostgreSQL', 'MongoDB', 'FastAPI', 'Flask', 'GraphQL', 'Redis', 'Prisma', 'Microservices'] },
    { category: 'AI / ML',        items: ['LangChain', 'RAG', 'pgvector', 'Pinecone', 'OpenAI API', 'Voyage AI', 'Cohere', 'Tree-sitter', 'MCP Protocol'] },
    { category: 'Cloud / DevOps', items: ['AWS (EC2, S3, RDS, Lambda, VPC, ALB, ASG, KMS)', 'Terraform', 'Docker', 'Kubernetes', 'Vercel', 'Supabase', 'GitHub Actions', 'Packer', 'Prometheus', 'Grafana'] },
  ],

  projects: [
    {
      name: 'OpenCodeIntel',
      tech: 'FastAPI · React · pgvector · LangChain · MCP Protocol',
      period: 'Sep 2024 — Present',
      desc: 'Open-source AI code intelligence platform. Hybrid RAG pipeline (vector + BM25 + Cohere reranking), Tree-sitter AST parsing for 8 languages, 87.5% Hit@1 accuracy. MCP server powers Claude with 6 semantic tools.',
      link: 'github.com/DevanshuNEU/opencodeintel',
    },
    {
      name: 'SecureScale',
      tech: 'AWS · Terraform · Packer · GitHub Actions · Lambda',
      period: 'Jan 2025 — Apr 2025',
      desc: 'Production-grade multi-AZ AWS infra: VPC, ALB, ASG, RDS, S3. Defense-in-depth with 4 KMS keys, IAM least-privilege, zero-downtime CI/CD. Provisioning from 2 hours to 10 minutes. Cloud spend down 30%.',
      link: 'github.com/DevanshuNEU/securescale',
    },
    {
      name: 'devOS',
      tech: 'Next.js 15 · React 19 · Zustand · Framer Motion',
      period: '2025 — Present',
      desc: 'This portfolio, built as a desktop OS. Windowed apps, analytics, RPG skill tree, arcade games, and a Finder-style project browser.',
      link: 'devanshuchicholikar.com',
    },
  ],
};

const SECTIONS = ['Experience', 'Education', 'Skills', 'Projects', 'Summary'] as const;
type Section = typeof SECTIONS[number];
type ViewMode = 'interactive' | 'pdf';

// ---------------------------------------------------------------------------
// Sub-components
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
  const [viewMode, setViewMode] = useState<ViewMode>('interactive');

  const sectionVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-5 py-4 app-toolbar border-b">
        <div className="flex items-center justify-between gap-4">

          {/* Identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-text leading-tight">{RESUME.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
                {RESUME.title}
              </span>
            </div>
            <p className="text-text-secondary text-[11px] mt-0.5">{RESUME.tagline}</p>
            {/* Contact links inline */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {[
                { href: `mailto:${RESUME.contact.email}`, icon: Mail,    label: RESUME.contact.email },
                { href: `https://${RESUME.contact.github}`, icon: Github, label: RESUME.contact.github },
                { href: `https://${RESUME.contact.linkedin}`, icon: Linkedin, label: 'LinkedIn' },
                { href: '#', icon: MapPin, label: RESUME.contact.location },
              ].map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined}
                   rel="noopener noreferrer"
                   className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors">
                  <Icon size={10} className="flex-shrink-0" />{label}
                </a>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.06] border border-black/8 dark:border-white/10">
              {(['interactive', 'pdf'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === mode
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  {mode === 'interactive' ? <LayoutList size={11} /> : <FileText size={11} />}
                  {mode === 'interactive' ? 'Interactive' : 'PDF'}
                </button>
              ))}
            </div>
            {/* Download */}
            <a
              href="/resume.pdf"
              download="Devanshu_Chicholikar_Resume.pdf"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              <Download size={12} />
              Download
            </a>
          </div>
        </div>

        {/* Section tabs */}
        {viewMode === 'interactive' && (
          <div className="flex gap-1 mt-3">
            {SECTIONS.map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeSection === section
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text hover:bg-black/5 dark:hover:bg-white/8'
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'pdf' ? (
          <motion.div
            key="pdf"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <iframe
              src="/resume.pdf"
              className="w-full h-full border-0"
              title="Resume PDF"
            />
          </motion.div>
        ) : (
          <motion.div
            key="interactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-auto p-5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Experience */}
                {activeSection === 'Experience' && (
                  <div>
                    <SectionHeading icon={Briefcase} title="Experience" />
                    <div className="relative">
                      {/* Gradient timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-px"
                           style={{ background: 'linear-gradient(to bottom, rgb(var(--color-accent)), transparent)' }} />
                      <div className="space-y-7">
                        {RESUME.experience.map((job, idx) => (
                          <motion.div key={idx} variants={itemVariants} className="relative pl-8">
                            {/* Dot */}
                            <div className="absolute left-[3px] top-[6px] w-[9px] h-[9px] rounded-full border-2 border-accent bg-surface" />
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="font-semibold text-text text-sm leading-tight">{job.role}</h3>
                                <p className="text-accent text-xs font-semibold mt-0.5">{job.company}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[11px] text-text-secondary font-mono">{job.period}</p>
                                <p className="text-[11px] text-text-secondary">{job.location}</p>
                              </div>
                            </div>
                            <ul className="space-y-1.5 mt-2">
                              {job.bullets.map((b, i) => <Bullet key={i} text={b} />)}
                            </ul>
                          </motion.div>
                        ))}
                      </div>
                    </div>
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
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h3 className="font-semibold text-text text-sm group-hover:text-accent transition-colors">
                              {proj.name}
                            </h3>
                            <p className="text-xs text-accent/70 font-mono mt-0.5">{proj.tech}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-text-secondary font-mono">{proj.period}</span>
                            <a
                              href={`https://${proj.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-text-secondary hover:text-accent transition-colors"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed mt-2">{proj.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {activeSection === 'Summary' && (
                  <motion.div variants={itemVariants}>
                    <SectionHeading icon={Code2} title="Summary" />
                    <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                      {RESUME.summary}
                    </p>
                  </motion.div>
                )}

              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

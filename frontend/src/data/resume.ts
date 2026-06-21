/**
 * Resume data - single source of truth.
 *
 * Consumed by ResumeApp.tsx only.
 * Personal contact info is imported from portfolio.json so there's one
 * place to update name, email, location, etc.
 *
 * Content mirrors the master AI Engineer resume (live-verified). To update
 * the resume copy: edit this file. To update the downloadable PDF: replace
 * public/resume.pdf.
 */

import portfolioData from './portfolio.json';

const { personalInfo } = portfolioData;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExperienceEntry {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  period: string;
  location: string;
  detail: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface ProjectEntry {
  name: string;
  tech: string;
  period: string;
  desc: string;
  link: string;
}

export interface ResumeData {
  name: string;
  title: string;
  tagline: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    github: string;
    linkedin: string;
  };
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  projects: ProjectEntry[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const RESUME: ResumeData = {
  // Personal info pulled from portfolio.json - update there, reflects here
  name:    personalInfo.name,
  title:   personalInfo.title,
  tagline: 'AI Engineer · MCP & Agent Infrastructure · Boston, MA (Open to Relocation)',
  contact: {
    email:    personalInfo.email,
    phone:    personalInfo.phone,
    location: personalInfo.location,
    github:   'github.com/DevanshuNEU',
    linkedin: 'linkedin.com/in/devanshuchicholikar',
  },

  summary:
    'AI engineer building MCP and agent infrastructure: production MCP servers, hybrid AST plus embedding retrieval, and rigorous LLM evaluation. OpenCodeIntel is a production MCP server hitting 94% average Hit@1 across 14 codebases; CallBudget is an agentic pharmacy-stock system with a calibrated-abstention voice layer; Saar is a Chrome Web Store extension that meters Claude.ai usage entirely client-side. Earlier work spans Java / Spring Boot and AWS platform engineering, plus teaching cloud computing to 60+ graduate students.',

  experience: [
    {
      company:  'Parsewave',
      role:     'Terminal-Bench Task Author (Contract)',
      period:   'May 2026 - Present',
      location: 'Remote',
      bullets: [
        'Authored Harbor-validated agent-evaluation environments under contract (frontier-model training and eval data): 4 agent-debugging tasks with oracle / no-op verification and anti-cheat test design',
        'Designed a reverse-engineering task that held Claude Opus 4.8 to 0/5 resolved across 5 graded trials, passing AI review to human review',
      ],
    },
    {
      company:  'Northeastern University',
      role:     'Graduate Teaching Assistant, Cloud Computing & Networks',
      period:   'Sep 2025 - May 2026',
      location: 'Boston, MA',
      bullets: [
        'Taught AWS, Terraform, and distributed systems to 60+ graduate students; authored a Docker + GitHub Actions CI/CD lab adopted as official course content across 3 sections (180+ students)',
        'Led system-design and code reviews for 15 cloud-native API project teams, coaching on scalability, fault tolerance, and API design',
      ],
    },
    {
      company:  'Jaksh Enterprise',
      role:     'Software Engineer, B2B Industrial-Equipment Platform (Contract)',
      period:   'Aug 2022 - Jul 2024',
      location: 'Ahmedabad, India',
      bullets: [
        'Developed a Java / Spring Boot product-catalog and quotation engine for 590+ customizable products serving a 10K+ B2B customer base, over PostgreSQL and a rules-based pricing module',
        'Cut quote-page p95 latency 65% (800ms to 280ms) via PostgreSQL indexing, Redis caching, and async processing',
        'Owned delivery end-to-end as one of two contract engineers: gathered client requirements, scoped functional specs, and shipped via Dockerized CI/CD, cutting release cycles from 2 weeks to 3 days',
      ],
    },
    {
      company:  'Pitney Bowes',
      role:     'Software Development Engineer Intern',
      period:   'Jan 2022 - Jul 2022',
      location: 'Pune, India',
      bullets: [
        'Built REST APIs for PitneyShipPro with idempotent endpoints, eliminating 40% of manual data entry; raised automated test coverage to 85% with Jest and Cypress',
      ],
    },
  ],

  education: [
    {
      institution: 'Northeastern University',
      degree:      'M.S. in Software Engineering Systems',
      period:      'Sep 2024 - May 2026',
      location:    'Boston, MA',
      detail:      'GPA: 3.85 · Generative AI · MLOps · Distributed Systems · Cloud Computing · Database Management Design · Algorithms · Object-Oriented Design & Design Patterns',
    },
    {
      institution: 'Dhirubhai Ambani Institute of ICT',
      degree:      'B.Tech in Information and Communication Technology',
      period:      'Aug 2018 - May 2022',
      location:    'Gujarat, India',
      detail:      'Computer Networks · Operating Systems · Data Structures · Databases',
    },
  ],

  skills: [
    {
      category: 'AI-Assisted Development',
      items: ['Claude Code (subagents, hooks, custom skills, slash commands)', 'MCP server development', 'Agentic workflows', 'Spec-first development with AI agents', 'LLM evals', 'Cursor'],
    },
    {
      category: 'AI / Agents / Eval',
      items: ['MCP servers (FastMCP)', 'Agent tool-calling', 'RAG (hybrid AST + embedding, BM25 + reranking)', 'LLM evaluation (pre-registration, calibrated abstention, self-consistency, guardrails, LLM-as-judge)', 'Voice agents (Pipecat, Deepgram)', 'tree-sitter', 'Context engineering'],
    },
    {
      category: 'Languages',
      items: ['Python', 'TypeScript', 'Java', 'JavaScript', 'Go', 'SQL'],
    },
    {
      category: 'Backend / APIs',
      items: ['FastAPI', 'Spring Boot', 'Node.js', 'REST', 'gRPC', 'WebSocket', 'Microservices', 'Distributed systems'],
    },
    {
      category: 'Cloud / DevOps',
      items: ['AWS', 'GCP (Cloud Run, Pub/Sub)', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'CI/CD', 'Railway', 'Vercel', 'Sentry', 'CloudWatch'],
    },
    {
      category: 'Data',
      items: ['PostgreSQL', 'Redis', 'Pinecone', 'DuckDB', 'Supabase', 'Firestore', 'MongoDB'],
    },
    {
      category: 'Frontend',
      items: ['React', 'Next.js', 'Tailwind CSS'],
    },
    {
      category: 'Foundations',
      items: ['Data structures & algorithms', 'Distributed systems', 'OOP & design patterns', 'System design'],
    },
  ],

  projects: [
    {
      name:   'OpenCodeIntel',
      tech:   'Python · FastAPI · FastMCP · tree-sitter · Pinecone · Redis · Supabase · React · TypeScript',
      period: 'Sep 2024 - Present',
      desc:   'Production MCP server exposing 12 tools (semantic code search, dependency graph, impact analysis, context assembly) over stdio plus streamable-HTTP for Claude.ai connectors at p95 208ms. Hybrid AST + embedding RAG (BM25 + vector + cross-encoder reranking) benchmarked to 94% average Hit@1 across 14 OSS codebases via a 700-query eval.',
      link:   'https://opencodeintel.com',
    },
    {
      name:   'CallBudget',
      tech:   'Python · FastMCP · scikit-learn · Optuna · Pipecat · Deepgram · DuckDB',
      period: '2026',
      desc:   'Agentic system deployed end-to-end against a real pharmacy-stock workflow: a FastMCP server (predict / plan / eval / converse) over a learned stock-probability ranker, cutting expected calls-to-find from 4.3 to 2.3 (47%). A calibrated-abstention voice layer drove false in-stock answers from 10% to 0% under an unreliable extractor.',
      link:   'https://github.com/DevanshuNEU/callbudget',
    },
    {
      name:   'tool-crowding',
      tech:   'Python · MCP · Anthropic API · pytest',
      period: '2026',
      desc:   'Pre-registered open-methodology benchmark for MCP tool-selection interference: a 345-test fail-closed harness, a 199-tool synthetic corpus, and a 144-trial factorial design locked before data collection. Falsified the naive more-tools-degrade-routing hypothesis, isolating the real failure to a task-ambiguity by agent-persona interaction.',
      link:   'https://github.com/DevanshuNEU/tool-crowding',
    },
    {
      name:   'Saar',
      tech:   'TypeScript · WXT · Chrome MV3 · React · Vitest · Playwright',
      period: 'Mar 2026 - Present',
      desc:   'Chrome MV3 extension shipped to the Chrome Web Store that tracks Claude.ai token usage and cost in real time, entirely client-side. A MAIN-world fetch interceptor decodes Anthropic SSE streams and a service-worker BPE tokenizer reads exact input tokens for context-window tracking. 1,808 Vitest tests across 63 files plus Playwright e2e.',
      link:   'https://getsaar.com',
    },
    {
      name:   'saar CLI',
      tech:   'Python · PyPI',
      period: 'Apr 2026',
      desc:   'Python CLI published to PyPI (22 releases) that statically analyzes a codebase (package manager, logging, auth patterns) and generates agent context files (AGENTS.md, CLAUDE.md, .cursorrules).',
      link:   'https://pypi.org/project/saar',
    },
    {
      name:   'SecureScale',
      tech:   'AWS · Terraform · Packer · Docker · Lambda · RDS · KMS · CloudWatch',
      period: '2025',
      desc:   'Multi-AZ AWS infrastructure (VPC, ALB, ASG, RDS, S3 with KMS) as modular Terraform with IAM least-privilege defense-in-depth, cutting provisioning from 2 hours to 10 minutes and cloud spend 30% at 99.9% uptime with CloudWatch.',
      link:   'https://github.com/DevanshuNEU',
    },
  ],
};

/**
 * Resume data - single source of truth.
 *
 * Consumed by ResumeApp.tsx only.
 * Personal contact info is imported from portfolio.json so there's one
 * place to update name, email, location, etc.
 *
 * Content mirrors the one-page AI Engineer resume (ATS-certified, facts.md
 * verified). To update the resume copy: edit this file. To update the
 * downloadable PDF: replace public/resume.pdf.
 *
 * Note: ProjectsBody renders links as `https://${link}`, so project links are
 * stored bare (no protocol).
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
  tagline: 'Software Engineer · AI Engineer · MCP & Agent Systems · Boston, MA (Open to Relocation)',
  contact: {
    email:    personalInfo.email,
    phone:    personalInfo.phone,
    location: personalInfo.location,
    github:   'github.com/DevanshuNEU',
    linkedin: 'linkedin.com/in/devanshuchicholikar',
  },

  summary:
    'AI engineer who ships AI to production end to end: MCP servers, RAG with retrieval evals, LLM-as-a-judge eval harnesses and voice agents, plus the full-stack, infra and design work around them. OpenCodeIntel is a code-search platform for AI coding agents (web app, REST API, 12-tool MCP server) at 94% Hit@1 on a 14-codebase research eval; Overhear grades voice-agent calls with code checks plus an LLM judge on a 39-call golden dataset; CallBudget cuts expected pharmacy calls 47% with a voice agent that abstains instead of guessing. Earlier: two years full-time on a Java / Spring Boot quotation platform, and teaching cloud computing on AWS to 100+ graduate students.',

  experience: [
    {
      company:  'Northeastern University',
      role:     'Graduate Teaching Assistant, CSYE 6225 Network Structures and Cloud Computing',
      period:   'Sep 2025 - May 2026',
      location: 'Boston, MA',
      bullets: [
        'Taught AWS, Terraform, and distributed systems to 100+ graduate students across two semesters; authored a Docker + GitHub Actions CI/CD lab adopted as official course content across 3 sections (180+ students)',
        'Led system-design and code reviews for 15 cloud-native API project teams, coaching on scalability, fault tolerance, and API design',
      ],
    },
    {
      company:  'Jaksh Enterprise',
      role:     'Software Engineer, B2B Industrial-Equipment Platform',
      period:   'Aug 2022 - Jul 2024',
      location: 'Ahmedabad, India',
      bullets: [
        'Developed a Java / Spring Boot product-catalog and quotation engine for 590+ customizable products serving a 10K+ B2B customer base, over PostgreSQL and a rules-based pricing module',
        'Cut quote-page p95 latency 65% (800ms to 280ms) via PostgreSQL indexing, Redis caching, and async processing',
        'Owned delivery end-to-end as one of two engineers: gathered client requirements, scoped functional specs, and shipped via Dockerized CI/CD on GitHub Actions, cutting release cycles from 2 weeks to 3 days',
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
      detail:      'GPA: 3.85 · Generative AI · MLOps · Distributed Systems · Cloud Computing · Database Management Design · Algorithms',
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
      items: ['Claude Code (subagents, hooks, custom skills)', 'MCP server development', 'Agentic workflows', 'Spec-first development with AI agents', 'LLM evals', 'Cursor'],
    },
    {
      category: 'AI & Agents / Eval',
      items: ['Agent tool-calling', 'RAG (hybrid AST + embeddings, BM25 + reranking)', 'LLM evaluation (LLM-as-a-judge, golden datasets, calibrated abstention, self-consistency, guardrails)', 'Voice agents (Pipecat, Deepgram)', 'tree-sitter', 'Context engineering'],
    },
    {
      category: 'Languages',
      items: ['Python', 'TypeScript', 'Java', 'JavaScript', 'Go', 'SQL'],
    },
    {
      category: 'Backend & APIs',
      items: ['FastAPI', 'Spring Boot', 'Node.js', 'REST', 'gRPC', 'WebSocket', 'React', 'Next.js'],
    },
    {
      category: 'Cloud & DevOps',
      items: ['AWS', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'CI/CD', 'Vercel', 'Railway'],
    },
    {
      category: 'Databases',
      items: ['PostgreSQL', 'Redis', 'Pinecone', 'DuckDB', 'Supabase', 'MongoDB'],
    },
    {
      category: 'Foundations',
      items: ['Data structures & algorithms', 'Distributed systems', 'OOP & design patterns', 'System design'],
    },
  ],

  projects: [
    {
      name:   'OpenCodeIntel',
      tech:   'Python · FastAPI · FastMCP · tree-sitter · Pinecone · Redis · React · TypeScript',
      period: 'Nov 2025 - Present',
      desc:   'Code-search platform for AI coding agents: a web app, a REST API and an MCP server exposing 12 tools (semantic code search, dependency graph, impact analysis, context assembly) over stdio and streamable HTTP. Benchmarked retrieval to 94% average Hit@1 across 14 OSS codebases (665-query research eval), +8.4 points from reranking (Voyage rerank-2) isolated via a 98-run ablation. Production search: p50 641ms cold, 242ms cached.',
      link:   'opencodeintel.com',
    },
    {
      name:   'Overhear',
      tech:   'TypeScript · Next.js · Retell · Claude API · Postgres · Drizzle · Vitest',
      period: 'Sep 2026',
      desc:   'AI QA analyst for voice agents: grades every call a Retell scheduling agent takes against the clinic database on a 7-dimension rubric. 3 dimensions (50% of the score) are decided in code by replaying the agent tool calls; an LLM-as-a-judge scores the rest. Caught 23 of 23 planted failures on a 39-call golden dataset, macro-F1 0.89, 0.99 self-consistency across 3 runs.',
      link:   'github.com/DevanshuNEU/overhear',
    },
    {
      name:   'CallBudget',
      tech:   'Python · FastMCP · scikit-learn · Optuna · Pipecat · Deepgram · DuckDB',
      period: '2026',
      desc:   'Agentic pharmacy-stock search: a FastMCP server (predict / plan / eval / converse) over a learned stock-probability ranker cuts expected calls-to-find from 4.3 to 2.3 (47%) on a 19-pharmacy simulation. An abstention layer on the stock extractor (self-consistency voting) drives false "in stock" answers from 10% to 0% under a deliberately unreliable extractor; a Claude-driven voice agent, tested against a simulated pharmacist, handles the calls.',
      link:   'github.com/DevanshuNEU/callbudget',
    },
    {
      name:   'Saar',
      tech:   'TypeScript · WXT · Chrome MV3 · React · Vitest · Playwright',
      period: 'Mar 2026 - Present',
      desc:   'Chrome MV3 extension on the Chrome Web Store that tracks Claude.ai token usage and cost in real time, entirely client-side: a page-context interceptor decodes Anthropic SSE streams, a Shadow-DOM overlay renders usage, and a service worker runs a BPE tokenizer. 1,808 Vitest tests across 63 files.',
      link:   'getsaar.com',
    },
    {
      name:   'SecureScale',
      tech:   'AWS · Terraform · Packer · Docker · Lambda · RDS · KMS · CloudWatch',
      period: '2025',
      desc:   'Multi-AZ AWS infrastructure (VPC, ALB, ASG, RDS, S3 with KMS) as modular Terraform with IAM least-privilege security, cutting provisioning from 2 hours to 10 minutes and cloud spend 30% at 99.9% uptime.',
      link:   'github.com/DevanshuNEU',
    },
  ],
};

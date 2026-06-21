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
  tagline: 'AI Engineer · MCP & Agent Systems · Boston, MA (Open to Relocation)',
  contact: {
    email:    personalInfo.email,
    phone:    personalInfo.phone,
    location: personalInfo.location,
    github:   'github.com/DevanshuNEU',
    linkedin: 'linkedin.com/in/devanshuchicholikar',
  },

  summary:
    'AI engineer building MCP and agent infrastructure: production MCP servers, hybrid AST plus embedding retrieval, and rigorous LLM evaluation. OpenCodeIntel is a production MCP server hitting 94% average Hit@1 across 14 codebases; CallBudget is an agentic pharmacy-stock system with a calibrated-abstention voice guardrail; tool-crowding is a pre-registered MCP tool-selection benchmark. Earlier work spans Java / Spring Boot and AWS platform engineering, plus teaching cloud computing to 60+ graduate students.',

  experience: [
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
      role:     'Software Engineer, B2B Industrial-Equipment Platform',
      period:   'Aug 2022 - Jul 2024',
      location: 'Ahmedabad, India',
      bullets: [
        'Developed a Java / Spring Boot product-catalog and quotation engine for 590+ customizable products serving a 10K+ customer base, over PostgreSQL and a rules-based pricing module',
        'Cut quote-page p95 latency 65% (800ms to 280ms) via PostgreSQL indexing, Redis caching, and async processing',
        'Owned delivery end-to-end as one of two contract engineers: gathered client requirements and shipped via Dockerized CI/CD, cutting release cycles from 2 weeks to 3 days',
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
      items: ['Agent tool-calling', 'RAG (hybrid AST + embeddings, BM25 + reranking)', 'LLM evaluation (calibrated abstention, self-consistency, guardrails, LLM-as-judge)', 'Voice agents (Pipecat, Deepgram)', 'tree-sitter', 'Context engineering'],
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
      tech:   'Python · FastAPI · MCP · tree-sitter · Pinecone · Redis · React · TypeScript',
      period: 'Sep 2024 - Present',
      desc:   'Production MCP server (12 tools: semantic code search, dependency graph, impact analysis, context assembly) enabling AI agents (Claude, Cursor) to retrieve codebase context at p95 208ms via a hybrid AST + embedding RAG pipeline. Benchmarked to 94% average Hit@1 across 14 OSS codebases (700-query eval), +8.4 points from cross-encoder reranking isolated via a 98-run ablation.',
      link:   'opencodeintel.com',
    },
    {
      name:   'CallBudget',
      tech:   'Python · FastMCP · scikit-learn · Optuna · Pipecat · Deepgram · DuckDB',
      period: '2026',
      desc:   'Agentic system deployed end-to-end against a real pharmacy-stock workflow: a FastMCP server (predict / plan / eval) over a learned stock-probability ranker, cutting expected calls-to-find from 4.3 to 2.3 (about 47%) on a 19-pharmacy simulation. A Claude-driven voice agent with guardrails (calibrated abstention + self-consistency) cut false-positive in-stock from about 10% to near 0%.',
      link:   'github.com/DevanshuNEU/callbudget',
    },
    {
      name:   'tool-crowding',
      tech:   'Python · MCP · Anthropic API · pytest',
      period: '2026',
      desc:   'Pre-registered, fail-closed MCP eval harness (345 tests, 199-tool corpus, 144-trial factorial) measuring agent tool-selection under crowding, with cache-cold enforcement (per-trial nonce + hard-halt assertion) for byte-level reproducibility. Falsified the naive more-tools-degrade-routing hypothesis, isolating the failure to a task-ambiguity by agent-persona interaction.',
      link:   'github.com/DevanshuNEU/tool-crowding',
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

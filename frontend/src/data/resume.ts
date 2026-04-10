/**
 * Resume data — single source of truth.
 *
 * Consumed by ResumeApp.tsx only.
 * Personal contact info is imported from portfolio.json so there's one
 * place to update name, email, location, etc.
 *
 * To update resume: edit this file. Nothing else needs to change.
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
  // Personal info pulled from portfolio.json — update there, reflects here
  name:    personalInfo.name,
  title:   personalInfo.title,
  tagline: `MS Software Engineering @ Northeastern · Open to 2026 roles`,
  contact: {
    email:    personalInfo.email,
    phone:    personalInfo.phone,
    location: personalInfo.location,
    github:   'github.com/DevanshuNEU',
    linkedin: 'linkedin.com/in/devanshuchicholikar',
  },

  summary: 'Full-stack engineer with production experience across React, Node.js, AWS, and Python. Passionate about cloud-native systems, AI tooling, and building things that actually ship. Currently pursuing MS in Software Engineering Systems at Northeastern, GPA 3.85. Teaching cloud computing to 60+ graduate students as a TA while building open-source AI infra on the side.',

  experience: [
    {
      company:  'Northeastern University',
      role:     'Graduate Teaching Assistant, Cloud Computing & Networks',
      period:   'Sep 2025 – Present',
      location: 'Boston, MA',
      bullets: [
        'Instruct 60+ graduate students on AWS infrastructure, Terraform IaC, and distributed systems; deliver weekly hands-on sessions covering VPC, load balancing, auto-scaling, and fault-tolerant design',
        'Authored lab curriculum for Docker containerization, GitHub Actions CI/CD, and infra automation; adopted as official course content across 3 sections serving 180+ students',
        'Lead system design reviews for 15 student teams; standardized evaluation criteria across 3 TAs, reducing grade disputes 40%',
      ],
    },
    {
      company:  'Jaksh Enterprise',
      role:     'Software Engineer, Backend / Full Stack',
      period:   'Aug 2022 – Jul 2024',
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
      degree:      'MS, Software Engineering Systems',
      period:      'Sept 2024 – May 2026',
      location:    'Boston, MA',
      detail:      'GPA: 3.85 · Network Structures & Cloud Computing · Generative AI · MLOps · Database Management · Algorithms',
    },
    {
      institution: 'Dhirubhai Ambani Institute of ICT',
      degree:      'B.Tech, Information & Communication Technology',
      period:      'Aug 2018 – May 2022',
      location:    'Gujarat, India',
      detail:      'Computer Networks · Operating Systems · Data Structures · Databases',
    },
  ],

  // Skills come from data/skills.ts via skillsForResume() — see ResumeApp.tsx.
  // This array is the resume-specific override for categories/grouping that
  // differ from the skill tree (e.g. resume needs "Languages" grouped differently).
  skills: [
    { category: 'Languages',      items: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'Java'] },
    { category: 'Frontend',       items: ['React', 'Next.js', 'Tailwind CSS', 'shadcn/ui', 'Zustand', 'HTML5', 'CSS3'] },
    { category: 'Backend',        items: ['Node.js', 'Express.js', 'PostgreSQL', 'MongoDB', 'FastAPI', 'Flask', 'GraphQL', 'Redis', 'Prisma', 'Microservices'] },
    { category: 'AI / ML',        items: ['LangChain', 'RAG', 'pgvector', 'Pinecone', 'OpenAI API', 'Voyage AI', 'Cohere', 'Tree-sitter', 'MCP Protocol'] },
    { category: 'Cloud / DevOps', items: ['AWS (EC2, S3, RDS, Lambda, VPC, ALB, ASG, KMS)', 'Terraform', 'Docker', 'Kubernetes', 'Vercel', 'Supabase', 'GitHub Actions', 'Packer', 'Prometheus', 'Grafana'] },
  ],

  projects: [
    {
      name:   'OpenCodeIntel',
      tech:   'FastAPI · React · pgvector · LangChain · MCP Protocol',
      period: 'Sep 2024 – Present',
      desc:   'Open-source AI code intelligence platform. Hybrid RAG pipeline (vector + BM25 + Cohere reranking), Tree-sitter AST parsing for 8 languages, 87.5% Hit@1 accuracy. MCP server powers Claude with 6 semantic tools.',
      link:   'github.com/DevanshuNEU/opencodeintel',
    },
    {
      name:   'SecureScale',
      tech:   'AWS · Terraform · Packer · GitHub Actions · Lambda',
      period: 'Jan 2025 – Apr 2025',
      desc:   'Production-grade multi-AZ AWS infra: VPC, ALB, ASG, RDS, S3. Defense-in-depth with 4 KMS keys, IAM least-privilege, zero-downtime CI/CD. Provisioning from 2 hours to 10 minutes. Cloud spend down 30%.',
      link:   'github.com/DevanshuNEU/securescale',
    },
    {
      name:   'devOS',
      tech:   'Next.js 15 · React 19 · Zustand · Framer Motion',
      period: '2025 – Present',
      desc:   'This portfolio, built as a desktop OS. Windowed apps, analytics, RPG skill tree, arcade games, and a Finder-style project browser.',
      link:   'devanshuchicholikar.com',
    },
  ],
};

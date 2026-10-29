import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Section from '@/components/site/Section';
import { identity, quickIntro, whatImAbout, opinions, specs, contactLinks } from '@/data/aboutMe';
import { RESUME } from '@/data/resume';
import { projectMeta, getFeaturedProjects } from '@/data/projectMeta';
import { getAllPosts } from '@/data/writing';
import { projectPath, writingPath } from '@/lib/seoContent';
import { PERSON_NAME } from '@/lib/site';
import JsonLd from '@/components/seo/JsonLd';
import { graph, profilePageNode, breadcrumbNode } from '@/lib/structuredData';

const DESCRIPTION =
  'Devanshu Chicholikar is a software engineer, AI engineer and forward deployed engineer in Boston: MCP servers, RAG, LLM-as-a-judge evals and voice agents, plus the full-stack and infra work around them.';

export const metadata: Metadata = {
  title: 'About',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: { type: 'profile', url: '/about', title: `About ${PERSON_NAME}`, description: DESCRIPTION },
};

// The one-click actions a recruiter landing from search came for. Same order
// and wording as the OS About masthead.
const LINKS = [
  { href: '/resume.pdf', label: 'Resume (PDF)' },
  { href: `mailto:${contactLinks.email}`, label: 'Email' },
  { href: contactLinks.github, label: 'GitHub' },
  { href: contactLinks.linkedin, label: 'LinkedIn' },
];

export default function AboutPage() {
  const featured = getFeaturedProjects().slice(0, 4);
  const writing = getAllPosts().slice(0, 3);

  return (
    // 34rem keeps 17px body text near 66 characters a line (it ran 81).
    <article className="max-w-[34rem]">
      <JsonLd data={graph(profilePageNode('/about'), breadcrumbNode([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]))} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
        <Image
          src={identity.photo}
          alt={PERSON_NAME}
          width={96}
          height={96}
          priority
          className="h-24 w-24 shrink-0 border border-border object-cover grayscale"
        />
        <div className="min-w-0">
          <h1 className="editorial-hero text-text text-[clamp(2.5rem,4vw+1rem,4rem)] text-balance">{PERSON_NAME}</h1>
        </div>
      </div>
      <p className="mt-4 text-[18px] text-text-secondary">{identity.title}</p>
      <p className="mt-1 text-[15px] text-text-secondary">
        {identity.location}. {identity.availability}.
      </p>

      <ul className="mt-6 flex flex-wrap gap-2" aria-label="Resume and contact">
        {LINKS.map(l => (
          <li key={l.label}>
            <a
              href={l.href}
              className="inline-flex min-h-[44px] items-center border border-border px-4 text-[15px] text-text transition-colors hover:border-text"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col gap-5 text-[17px] leading-relaxed">
        {quickIntro.map(p => <p key={p}>{p}</p>)}
      </div>

      <Section label="How I work">
        <div className="flex flex-col gap-4 text-[17px] leading-relaxed text-text">
          {whatImAbout.map(p => <p key={p}>{p}</p>)}
        </div>
      </Section>

      <Section label="Things I'll argue about">
        <ul className="flex flex-col gap-3 text-[17px] leading-relaxed">
          {opinions.map(o => <li key={o}>{o}</li>)}
        </ul>
      </Section>

      <Section label="At a glance">
        <dl className="grid grid-cols-1 gap-y-1 text-[15px] sm:grid-cols-[8rem_1fr] sm:gap-x-6 sm:gap-y-2">
          {specs.map(s => (
            <div key={s.key} className="contents">
              <dt className="text-text-secondary max-sm:mt-2">{s.key}</dt>
              <dd className="font-mono">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section label="Recent work">
        <ul className="flex flex-col gap-3 text-[16px]">
          {featured.map(key => {
            const meta = projectMeta[key];
            return (
              <li key={key}>
                <Link href={projectPath(meta.slug)} className="font-medium underline underline-offset-4">
                  {meta.displayName}
                </Link>
                <span className="text-text-secondary">: {meta.tagline}</span>
              </li>
            );
          })}
        </ul>
        <Link href="/projects" className="text-[15px] underline underline-offset-4">All projects</Link>
      </Section>

      {writing.length > 0 && (
        <Section label="Writing">
          <ul className="flex flex-col gap-3 text-[16px]">
            {writing.map(post => (
              <li key={post.slug}>
                <Link href={writingPath(post.slug)} className="font-medium underline underline-offset-4">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/writing" className="text-[15px] underline underline-offset-4">All writing</Link>
        </Section>
      )}

      <Section label="Experience">
        <ul className="flex flex-col gap-4 text-[16px]">
          {RESUME.experience.map(e => (
            <li key={e.company + e.period}>
              <p className="font-medium">{e.role}</p>
              {/* Separate spans, no middots: a wrapped line never starts with a stray dot. */}
              <p className="flex flex-wrap gap-x-4 text-text-secondary">
                <span>{e.company}</span>
                <span>{e.period}</span>
                <span>{e.location}</span>
              </p>
            </li>
          ))}
        </ul>
        <Link href="/resume" className="text-[15px] underline underline-offset-4">Full resume</Link>
      </Section>

      <Section label="Education">
        <ul className="flex flex-col gap-4 text-[16px]">
          {RESUME.education.map(e => (
            <li key={e.institution}>
              <p className="font-medium">{e.degree}</p>
              <p className="flex flex-wrap gap-x-4 text-text-secondary">
                <span>{e.institution}</span>
                <span>{e.period}</span>
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* No Contact section: the link row above and the site footer carry
          email, GitHub and LinkedIn, so a third copy only repeated them. */}
    </article>
  );
}

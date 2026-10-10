import type { Metadata } from 'next';
import Link from 'next/link';
import Section from '@/components/site/Section';
import { identity, quickIntro, whatImAbout, opinions, specs, contactLinks } from '@/data/aboutMe';
import { RESUME } from '@/data/resume';
import { projectMeta, getFeaturedProjects } from '@/data/projectMeta';
import { projectPath } from '@/lib/seoContent';
import { PERSON_NAME } from '@/lib/site';

const DESCRIPTION =
  'Devanshu Chicholikar is a software engineer and AI engineer in Boston: MCP servers, RAG, LLM-as-a-judge evals and voice agents, plus the full-stack and infra work around them.';

export const metadata: Metadata = {
  title: 'About',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: { type: 'profile', url: '/about', title: `About ${PERSON_NAME}`, description: DESCRIPTION },
};

export default function AboutPage() {
  const featured = getFeaturedProjects().slice(0, 4);

  return (
    <article>
      <h1 className="editorial-hero text-text text-[clamp(2.5rem,8vw,4.5rem)]">{PERSON_NAME}</h1>
      <p className="mt-4 text-[18px] text-text-secondary">{identity.title}</p>
      <p className="mt-1 text-[15px] text-text-secondary">
        {identity.location} · {identity.availability}
      </p>

      <div className="mt-10 flex flex-col gap-5 text-[17px] leading-relaxed">
        {quickIntro.map(p => <p key={p}>{p}</p>)}
      </div>

      <Section label="How I work">
        <div className="flex flex-col gap-4 text-[16px] leading-relaxed text-text-secondary">
          {whatImAbout.map(p => <p key={p}>{p}</p>)}
        </div>
      </Section>

      <Section label="Things I'll argue about">
        <ul className="flex flex-col gap-3 text-[16px] leading-relaxed">
          {opinions.map(o => <li key={o}>{o}</li>)}
        </ul>
      </Section>

      <Section label="Spec sheet">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-6 gap-y-2 text-[15px]">
          {specs.map(s => (
            <div key={s.key} className="contents">
              <dt className="text-text-secondary">{s.key}</dt>
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

      <Section label="Experience">
        <ul className="flex flex-col gap-4 text-[16px]">
          {RESUME.experience.map(e => (
            <li key={e.company + e.period}>
              <p className="font-medium">{e.role}</p>
              <p className="text-text-secondary">{e.company} · {e.period} · {e.location}</p>
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
              <p className="text-text-secondary">{e.institution} · {e.period}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Contact">
        <p className="text-[16px] leading-relaxed">
          Email <a href={`mailto:${contactLinks.email}`} className="underline underline-offset-4">{contactLinks.email}</a>,
          or find me on <a href={contactLinks.linkedin} className="underline underline-offset-4">LinkedIn</a> and{' '}
          <a href={contactLinks.github} className="underline underline-offset-4">GitHub</a>.
        </p>
      </Section>
    </article>
  );
}

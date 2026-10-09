import type { Metadata } from 'next';
import Section from '@/components/site/Section';
import { RESUME } from '@/data/resume';
import { PERSON_NAME } from '@/lib/site';

const DESCRIPTION =
  'Resume of Devanshu Chicholikar, software engineer and AI engineer in Boston: experience, projects (OpenCodeIntel, Overhear, CallBudget, Saar), education and skills.';

export const metadata: Metadata = {
  title: 'Resume',
  description: DESCRIPTION,
  alternates: { canonical: '/resume' },
  openGraph: { url: '/resume', title: `Resume | ${PERSON_NAME}`, description: DESCRIPTION },
};

export default function ResumePage() {
  const { contact } = RESUME;

  return (
    <article>
      <h1 className="editorial-hero text-text text-[clamp(2.5rem,8vw,4.5rem)]">{RESUME.name}</h1>
      <p className="mt-4 text-[17px] text-text-secondary">{RESUME.tagline}</p>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
        <a href={`mailto:${contact.email}`} className="underline underline-offset-4">{contact.email}</a>
        <a href={`https://${contact.github}`} className="underline underline-offset-4">{contact.github}</a>
        <a href={`https://${contact.linkedin}`} className="underline underline-offset-4">{contact.linkedin}</a>
        <a href="/resume.pdf" className="font-medium underline underline-offset-4">Download PDF</a>
      </p>

      <Section label="Summary">
        <p className="text-[16px] leading-relaxed">{RESUME.summary}</p>
      </Section>

      <Section label="Experience">
        <div className="flex flex-col gap-8">
          {RESUME.experience.map(e => (
            <div key={e.company + e.period} className="flex flex-col gap-2">
              <h3 className="font-medium text-[17px]">{e.role}</h3>
              <p className="text-[14px] text-text-secondary">{e.company} · {e.period} · {e.location}</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 text-[15px] leading-relaxed">
                {e.bullets.map(b => <li key={b}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Projects">
        <div className="flex flex-col gap-8">
          {RESUME.projects.map(p => (
            <div key={p.name} className="flex flex-col gap-2">
              <h3 className="font-medium text-[17px]">
                <a href={`https://${p.link}`} className="underline underline-offset-4">{p.name}</a>
                <span className="font-normal text-text-secondary"> · {p.period}</span>
              </h3>
              <p className="text-[14px] text-text-secondary">{p.tech}</p>
              <p className="text-[15px] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Education">
        <div className="flex flex-col gap-6">
          {RESUME.education.map(e => (
            <div key={e.institution} className="flex flex-col gap-1">
              <h3 className="font-medium text-[17px]">{e.degree}</h3>
              <p className="text-[14px] text-text-secondary">{e.institution} · {e.period} · {e.location}</p>
              <p className="text-[15px]">{e.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Skills">
        <dl className="flex flex-col gap-3 text-[15px]">
          {RESUME.skills.map(g => (
            <div key={g.category}>
              <dt className="font-medium">{g.category}</dt>
              <dd className="text-text-secondary">{g.items.join(', ')}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </article>
  );
}

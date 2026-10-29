import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectMeta, getAllProjectKeys, getProjectBySlug } from '@/data/projectMeta';
import { getPostsForProject } from '@/data/writing';
import { projectDescription, projectPath, writingPath, STATUS_LABEL } from '@/lib/seoContent';
import Section from '@/components/site/Section';
import MetaLabel from '@/components/editorial/MetaLabel';
import { PERSON_NAME } from '@/lib/site';
import JsonLd from '@/components/seo/JsonLd';
import { graph, projectNode, breadcrumbNode } from '@/lib/structuredData';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllProjectKeys().map(key => ({ slug: projectMeta[key].slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const found = getProjectBySlug(slug);
  if (!found) return {};
  const { meta } = found;
  const description = projectDescription(meta);
  // The title template appends " | Devanshu Chicholikar"; keep the whole thing
  // short enough that Google does not cut the name off.
  const withTagline = `${meta.displayName}: ${meta.tagline}`;
  return {
    title: withTagline.length <= 48 ? withTagline : meta.displayName,
    description,
    alternates: { canonical: projectPath(slug) },
    openGraph: {
      type: 'article',
      url: projectPath(slug),
      title: `${meta.displayName}, by ${PERSON_NAME}`,
      description,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const found = getProjectBySlug(slug);
  if (!found) notFound();
  const { meta } = found;
  const writing = getPostsForProject(found.key);

  const keys = getAllProjectKeys();
  const i = keys.indexOf(found.key);
  const prev = i > 0 ? projectMeta[keys[i - 1]] : null;
  const next = i < keys.length - 1 ? projectMeta[keys[i + 1]] : null;

  return (
    <article>
      <JsonLd
        data={graph(
          projectNode(meta),
          breadcrumbNode([
            { name: 'Home', path: '/' },
            { name: 'Projects', path: '/projects' },
            { name: meta.displayName, path: projectPath(slug) },
          ]),
        )}
      />
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/projects"><MetaLabel className="text-text-secondary hover:text-text">Projects</MetaLabel></Link>
        <MetaLabel className="text-text-secondary">{STATUS_LABEL[meta.status]}</MetaLabel>
      </p>
      <h1 className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.01em] text-text text-[clamp(2.5rem,8vw,4.5rem)] [overflow-wrap:normal] text-balance">
        {meta.displayName}
      </h1>
      <p className="mt-4 text-[20px] leading-snug text-text-secondary">{meta.tagline}</p>

      {meta.achievements.length > 0 && (
        <ul aria-label="Key results" className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
          {meta.achievements.map(a => (
            <li key={a.label} className="flex flex-col gap-1 border-t border-border pt-3">
              <span className="font-display text-[30px] leading-tight tabular-nums">{a.metric}</span>
              <span className="font-medium text-[15px]">{a.label}</span>
              <span className="text-[14px] text-text-secondary">{a.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-[15px] text-text-secondary">
        Built by <Link href="/about" className="text-text underline underline-offset-4">{PERSON_NAME}</Link>
        {meta.role
          ? `, ${meta.role.toLowerCase()}.`
          : ', software engineer, AI engineer and forward deployed engineer in Boston.'}
      </p>

      <p className="mt-4 flex flex-wrap items-center gap-3 text-[15px]">
        {meta.liveUrl && (
          <a href={meta.liveUrl} className="px-3 py-1.5 bg-text text-bg font-medium">
            {meta.liveLabel ?? 'Live site'}
          </a>
        )}
        {meta.repoUrl && (
          <a href={meta.repoUrl} className="px-3 py-1.5 border border-border font-medium">
            Source on GitHub
          </a>
        )}
        {meta.researchUrl && (
          <a href={meta.researchUrl} className="px-3 py-1.5 border border-border font-medium">
            Research data
          </a>
        )}
        {!meta.repoUrl && <span className="text-text-secondary">Code not public</span>}
      </p>

      {meta.descriptionOverride && (
        <Section label="Overview">
          <p className="text-[17px] leading-relaxed">{meta.descriptionOverride}</p>
        </Section>
      )}

      <Section label="How it works">
        <div className="flex flex-col gap-4 text-[16px] leading-relaxed text-text-secondary">
          {meta.story.map(p => <p key={p}>{p}</p>)}
        </div>
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
        </Section>
      )}

      {meta.extraTech && meta.extraTech.length > 0 && (
        <Section label="Stack">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {meta.extraTech.map(t => (
              <li key={t} className="font-mono text-[14px]">{t}</li>
            ))}
          </ul>
        </Section>
      )}

      <nav aria-label="More projects" className="mt-16 pt-6 border-t border-border flex justify-between gap-6 text-[15px]">
        {prev ? (
          <Link href={projectPath(prev.slug)} className="underline underline-offset-4">Previous: {prev.displayName}</Link>
        ) : <span />}
        {next ? (
          <Link href={projectPath(next.slug)} className="underline underline-offset-4 text-right">Next: {next.displayName}</Link>
        ) : <span />}
      </nav>
    </article>
  );
}

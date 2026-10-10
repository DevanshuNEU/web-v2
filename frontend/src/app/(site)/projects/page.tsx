import type { Metadata } from 'next';
import Link from 'next/link';
import { projectMeta, getAllProjectKeys } from '@/data/projectMeta';
import { projectDescription, projectPath, STATUS_LABEL } from '@/lib/seoContent';
import MetaLabel from '@/components/editorial/MetaLabel';
import { PERSON_NAME, absoluteUrl } from '@/lib/site';
import JsonLd from '@/components/seo/JsonLd';
import { graph, breadcrumbNode, personRef } from '@/lib/structuredData';

const DESCRIPTION =
  'Projects by Devanshu Chicholikar: OpenCodeIntel (code search for AI coding agents), Overhear (QA for voice agents), CallBudget, Saar and more, with the numbers and the caveats.';

export const metadata: Metadata = {
  title: 'Projects',
  description: DESCRIPTION,
  alternates: { canonical: '/projects' },
  openGraph: { url: '/projects', title: `Projects | ${PERSON_NAME}`, description: DESCRIPTION },
};

export default function ProjectsPage() {
  const keys = getAllProjectKeys();

  return (
    <article>
      <JsonLd
        data={graph(
          {
            '@type': 'CollectionPage',
            url: absoluteUrl('/projects'),
            name: `Projects by ${PERSON_NAME}`,
            about: personRef,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: keys.map((key, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: projectMeta[key].displayName,
                url: absoluteUrl(projectPath(projectMeta[key].slug)),
              })),
            },
          },
          breadcrumbNode([{ name: 'Home', path: '/' }, { name: 'Projects', path: '/projects' }]),
        )}
      />
      <h1 className="editorial-hero text-text text-[clamp(2.5rem,8vw,4.5rem)]">Projects</h1>
      <p className="mt-4 text-[18px] text-text-secondary">What I shipped, with the numbers and the caveats.</p>

      <ol className="mt-12 flex flex-col">
        {keys.map(key => {
          const meta = projectMeta[key];
          const top = meta.achievements.slice(0, 2);
          return (
            <li key={key} className="py-8 border-t border-border flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-[28px] leading-tight">
                  <Link href={projectPath(meta.slug)} className="hover:underline underline-offset-4">
                    {meta.displayName}
                  </Link>
                </h2>
                <MetaLabel className="text-text-secondary">{STATUS_LABEL[meta.status]}</MetaLabel>
              </div>
              <p className="text-[16px]">{meta.tagline}</p>
              <p className="text-[15px] leading-relaxed text-text-secondary">{projectDescription(meta, 320)}</p>
              {top.length > 0 && (
                <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
                  {top.map(a => (
                    <li key={a.label}>
                      <span className="font-medium">{a.metric}</span>{' '}
                      <span className="text-text-secondary">{a.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}

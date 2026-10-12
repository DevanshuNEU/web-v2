import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, formatPostDate } from '@/data/writing';
import { writingPath } from '@/lib/seoContent';
import MetaLabel from '@/components/editorial/MetaLabel';
import { PERSON_NAME, absoluteUrl } from '@/lib/site';
import JsonLd from '@/components/seo/JsonLd';
import { graph, breadcrumbNode, personRef } from '@/lib/structuredData';

const DESCRIPTION =
  'Write-ups by Devanshu Chicholikar on real findings from his projects: code search, retrieval evaluation and AI agents, with the data and the mistakes.';

export const metadata: Metadata = {
  title: 'Writing',
  description: DESCRIPTION,
  alternates: { canonical: '/writing' },
  openGraph: { url: '/writing', title: `Writing | ${PERSON_NAME}`, description: DESCRIPTION },
};

export default function WritingPage() {
  const all = getAllPosts();

  return (
    <article>
      <JsonLd
        data={graph(
          {
            '@type': 'CollectionPage',
            url: absoluteUrl('/writing'),
            name: `Writing by ${PERSON_NAME}`,
            about: personRef,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: all.map((post, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: post.title,
                url: absoluteUrl(writingPath(post.slug)),
              })),
            },
          },
          breadcrumbNode([{ name: 'Home', path: '/' }, { name: 'Writing', path: '/writing' }]),
        )}
      />
      <h1 className="editorial-hero text-text text-[clamp(2.5rem,8vw,4.5rem)]">Writing</h1>
      <p className="mt-4 text-[18px] text-text-secondary">Write-ups of real findings from my projects, mistakes included.</p>

      <ol className="mt-12 flex flex-col">
        {all.map(post => (
          <li key={post.slug} className="py-8 border-t border-border flex flex-col gap-3">
            <MetaLabel className="text-text-secondary">
              <time dateTime={post.datePublished}>{formatPostDate(post.datePublished)}</time>
            </MetaLabel>
            <h2 className="font-display text-[28px] leading-tight">
              <Link href={writingPath(post.slug)} className="hover:underline underline-offset-4">
                {post.title}
              </Link>
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">{post.description}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}

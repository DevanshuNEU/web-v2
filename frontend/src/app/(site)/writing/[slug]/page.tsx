import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { posts, getPostBySlug, readPostBody, formatPostDate } from '@/data/writing';
import { projectMeta } from '@/data/projectMeta';
import { projectPath, writingPath } from '@/lib/seoContent';
import { parseMarkdown, wordCount } from '@/lib/markdown';
import Prose from '@/components/site/Prose';
import MetaLabel from '@/components/editorial/MetaLabel';
import { PERSON_NAME } from '@/lib/site';
import JsonLd from '@/components/seo/JsonLd';
import { graph, articleNode, breadcrumbNode } from '@/lib/structuredData';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    // The full title runs long; the template appends the name, so search
    // results show the card title and the page shows the full one.
    title: post.card.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: PERSON_NAME, url: '/about' }],
    alternates: { canonical: writingPath(slug) },
    openGraph: {
      type: 'article',
      url: writingPath(slug),
      title: post.title,
      description: post.description,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified ?? post.datePublished,
      authors: [PERSON_NAME],
    },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const body = readPostBody(slug);
  const project = post.project ? projectMeta[post.project] : undefined;

  return (
    <article>
      <JsonLd
        data={graph(
          articleNode(post, wordCount(body), project),
          breadcrumbNode([
            { name: 'Home', path: '/' },
            { name: 'Writing', path: '/writing' },
            { name: post.card.title, path: writingPath(slug) },
          ]),
        )}
      />
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/writing"><MetaLabel className="text-text-secondary hover:text-text">Writing</MetaLabel></Link>
        <MetaLabel className="text-text-secondary">
          <time dateTime={post.datePublished}>{formatPostDate(post.datePublished)}</time>
        </MetaLabel>
      </p>
      <h1 className="mt-4 editorial-hero text-text text-[clamp(2rem,6vw,3.25rem)] leading-[1.05]">{post.title}</h1>
      <p className="mt-4 text-[15px] text-text-secondary">
        By <Link href="/about" className="text-text underline underline-offset-4">{PERSON_NAME}</Link>
      </p>

      <div className="mt-10">
        <Prose blocks={parseMarkdown(body)} />
      </div>

      {(project || post.sourceUrl) && (
        <footer className="mt-16 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          {project && (
            <Link href={projectPath(project.slug)} className="underline underline-offset-4">
              Project: {project.displayName}
            </Link>
          )}
          {post.sourceUrl && (
            <a href={post.sourceUrl} className="underline underline-offset-4">Data and code</a>
          )}
          <Link href="/writing" className="underline underline-offset-4">All writing</Link>
        </footer>
      )}
    </article>
  );
}

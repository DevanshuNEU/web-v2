import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { posts, getAllPosts, getPostBySlug, readPostBody, formatPostDate } from '@/data/writing';
import { projectMeta } from '@/data/projectMeta';
import { projectPath, writingPath } from '@/lib/seoContent';
import { parseMarkdown, wordCount, readingMinutes } from '@/lib/markdown';
import Prose from '@/components/site/Prose';
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
  // Next in reading order: the next older post, wrapping to the newest.
  const all = getAllPosts();
  const next = all.length > 1 ? all[(all.findIndex(p => p.slug === slug) + 1) % all.length] : null;
  const sourceIsGitHub = post.sourceUrl?.startsWith('https://github.com/') ?? false;

  return (
    // 34rem keeps the 17px body near 66 characters a line (it ran 81).
    <article className="max-w-[34rem]">
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
      <Link
        href="/writing"
        className="-ml-1 inline-flex min-h-[44px] items-center gap-1 pr-2 text-[15px] text-text-secondary transition-colors hover:text-text"
      >
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
        All writing
      </Link>
      <h1 className="mt-3 editorial-hero text-text text-[clamp(2rem,2.5vw+1rem,3.25rem)] leading-[1.08] text-balance">{post.title}</h1>
      <p className="mt-4 flex flex-wrap gap-x-4 text-[15px] text-text-secondary">
        <span>
          By <Link href="/about" className="text-text underline underline-offset-4">{PERSON_NAME}</Link>
        </span>
        <time dateTime={post.datePublished}>{formatPostDate(post.datePublished)}</time>
        <span>{readingMinutes(body)} min read</span>
      </p>

      <div className="mt-10">
        <Prose blocks={parseMarkdown(body)} />
      </div>

      <footer className="mt-16 pt-6 border-t border-border flex flex-col gap-6 text-[15px]">
        {(project || post.sourceUrl) && (
          <p className="flex flex-wrap gap-x-6">
            {project && (
              <Link href={projectPath(project.slug)} className="inline-flex min-h-[44px] items-center underline underline-offset-4">
                Project: {project.displayName}
              </Link>
            )}
            {post.sourceUrl && (
              <a href={post.sourceUrl} className="inline-flex min-h-[44px] items-center underline underline-offset-4">
                {sourceIsGitHub ? 'Data and code on GitHub' : 'Data and code'}
              </a>
            )}
          </p>
        )}
        {next && (
          <Link href={writingPath(next.slug)} className="group flex flex-col gap-1">
            <span className="text-[14px] text-text-secondary">Next</span>
            <span className="font-display text-[22px] leading-snug text-text text-balance underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-text">
              {next.title}
            </span>
          </Link>
        )}
      </footer>
    </article>
  );
}

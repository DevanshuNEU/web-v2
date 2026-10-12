import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { posts, getPostBySlug } from '@/data/writing';
import { PERSON_NAME } from '@/lib/site';

export const alt = `A write-up by ${PERSON_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  return renderOgCard({
    kicker: 'writing',
    title: post?.card.title ?? 'Writing',
    subtitle: post?.card.subtitle ?? '',
  });
}

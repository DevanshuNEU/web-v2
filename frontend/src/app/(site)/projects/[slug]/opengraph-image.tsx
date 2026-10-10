import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { projectMeta, getAllProjectKeys, getProjectBySlug } from '@/data/projectMeta';
import { PERSON_NAME } from '@/lib/site';

export const alt = `A project by ${PERSON_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getAllProjectKeys().map(key => ({ slug: projectMeta[key].slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = getProjectBySlug(slug);
  const meta = found?.meta;
  return renderOgCard({
    kicker: 'projects',
    title: meta?.displayName ?? 'Projects',
    subtitle: meta?.tagline ?? '',
    stats: meta?.achievements.slice(0, 3).map(a => ({ metric: a.metric, label: a.label })),
  });
}

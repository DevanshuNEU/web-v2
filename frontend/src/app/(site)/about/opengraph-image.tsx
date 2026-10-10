import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { PERSON_NAME } from '@/lib/site';

export const alt = `About | ${PERSON_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    kicker: 'about',
    title: 'About',
    subtitle: 'How I got here, what I build, and the opinions I will argue about.',
  });
}

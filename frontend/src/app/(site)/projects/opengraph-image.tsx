import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { PERSON_NAME } from '@/lib/site';

export const alt = `Projects | ${PERSON_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    kicker: 'projects',
    title: 'Projects',
    subtitle: 'What I shipped, with the numbers and the caveats.',
  });
}

import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { PERSON_NAME } from '@/lib/site';

export const alt = `Resume | ${PERSON_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    kicker: 'resume',
    title: 'Resume',
    subtitle: 'Experience, projects, education and skills. The PDF is one click away.',
  });
}

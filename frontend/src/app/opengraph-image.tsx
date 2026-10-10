import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { PERSON_NAME } from '@/lib/site';

export const alt = `${PERSON_NAME}, Software Engineer and AI Engineer`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    title: PERSON_NAME,
    subtitle: 'Software engineer and AI engineer in Boston. MCP servers, RAG, evals and voice agents, shipped end to end.',
    stats: [
      { metric: 'OpenCodeIntel', label: 'Code search for agents' },
      { metric: 'Overhear', label: 'QA for voice agents' },
      { metric: 'Saar', label: 'On the Chrome Web Store' },
    ],
  });
}

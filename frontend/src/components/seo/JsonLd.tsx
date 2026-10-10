import { serializeJsonLd } from '@/lib/structuredData';

/** Renders one JSON-LD document. Server component; content comes from lib/structuredData. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

import type { MetadataRoute } from 'next';
import { projectMeta, getAllProjectKeys } from '@/data/projectMeta';
import { SITE_PAGES, projectPath } from '@/lib/seoContent';
import { absoluteUrl, CONTENT_UPDATED } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = CONTENT_UPDATED;
  return [
    { url: absoluteUrl('/'), lastModified, priority: 1 },
    ...SITE_PAGES.map(p => ({ url: absoluteUrl(p.path), lastModified, priority: 0.8 })),
    ...getAllProjectKeys().map(key => ({
      url: absoluteUrl(projectPath(projectMeta[key].slug)),
      lastModified,
      priority: projectMeta[key].featured ? 0.7 : 0.5,
    })),
  ];
}

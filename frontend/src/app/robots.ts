import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

/**
 * Every search engine and AI crawler is welcome, training crawlers included:
 * the goal is for anyone asking an engine or a model about Devanshu to find
 * this site. Named crawlers are listed explicitly so the intent is on record.
 * A named group replaces the * group for that bot, so it repeats the disallows.
 */
const CRAWLERS = [
  // Search
  'Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot',
  // OpenAI
  'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
  // Anthropic
  'Claude-SearchBot', 'Claude-User', 'ClaudeBot',
  // Perplexity
  'PerplexityBot', 'Perplexity-User',
  // Training opt-ins and open datasets
  'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Amazonbot',
];

const DISALLOW = ['/api/', '/mobile-preview'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: CRAWLERS, allow: '/', disallow: DISALLOW },
      { userAgent: '*', allow: '/', disallow: DISALLOW },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}

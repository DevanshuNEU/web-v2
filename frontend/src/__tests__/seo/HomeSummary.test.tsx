// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeSummary from '@/components/seo/HomeSummary';
import { posts } from '@/data/writing';
import { SITE_PAGES } from '@/lib/seoContent';

describe('HomeSummary (what a no-JS fetch of / reads)', () => {
  it('names all three roles in the heading', () => {
    render(<HomeSummary />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'Software Engineer, AI Engineer and Forward Deployed Engineer',
    );
  });

  it('links every plain-HTML page, writing included', () => {
    const { container } = render(<HomeSummary />);
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
    for (const p of SITE_PAGES) expect(hrefs).toContain(p.path);
    expect(hrefs).toContain('/writing');
  });

  it('links every post', () => {
    const { container } = render(<HomeSummary />);
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
    for (const post of posts) expect(hrefs).toContain(`/writing/${post.slug}`);
  });
});

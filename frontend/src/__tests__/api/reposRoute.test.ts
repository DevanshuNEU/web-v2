import { describe, it, expect, vi } from 'vitest';

const repo = (name: string, homepage: string | null) => ({
  name, description: null, html_url: `https://github.com/x/${name}`, homepage,
  language: 'Python', stargazers_count: 0, forks_count: 0, topics: [], updated_at: '2026-10-01T00:00:00Z',
});

vi.mock('@/lib/github', () => ({
  getUserRepos: vi.fn(async () => [
    repo('callbudget', 'https://www.loom.com/share/0231954a438c4b3ab011fd21f4f41bf2'),
    repo('overhear', 'https://example.com/elsewhere'),
  ]),
  getOrgRepos: vi.fn(async () => [repo('saar', 'https://pypi.org/project/saar')]),
}));

import { GET } from '@/app/api/github/repos/route';

describe('/api/github/repos liveLabel', () => {
  it('keeps the projectMeta label when GitHub homepage is the same link', async () => {
    const data = await (await GET()).json();
    const by = (n: string) => data.find((r: { name: string }) => r.name === n);
    expect(by('callbudget').liveLabel).toBe('Walkthrough');
    expect(by('saar').liveLabel).toBe('PyPI'); // trailing slash differs, still a match
    expect(by('overhear').liveLabel).toBeUndefined();
    expect(by('overhear').homepage).toBe('https://example.com/elsewhere');
  });

  it('uses projectMeta links for entries with no public repo', async () => {
    const data = await (await GET()).json();
    const secure = data.find((r: { name: string }) => r.name === 'SecureScale');
    expect(secure.htmlUrl).toBe('');
  });
});

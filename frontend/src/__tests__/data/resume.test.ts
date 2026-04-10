import { describe, it, expect } from 'vitest';
import { RESUME } from '../../data/resume';

describe('RESUME.contact', () => {
  it('has a non-empty name', () => {
    expect(RESUME.name.trim()).not.toBe('');
  });

  it('has a non-empty title', () => {
    expect(RESUME.title.trim()).not.toBe('');
  });

  it('has a non-empty tagline', () => {
    expect(RESUME.tagline.trim()).not.toBe('');
  });

  it('contact.email is a valid email', () => {
    expect(RESUME.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('contact.phone is non-empty', () => {
    expect(RESUME.contact.phone.trim()).not.toBe('');
  });

  it('contact.location is non-empty', () => {
    expect(RESUME.contact.location.trim()).not.toBe('');
  });

  it('contact.github is non-empty', () => {
    expect(RESUME.contact.github.trim()).not.toBe('');
  });

  it('contact.linkedin is non-empty', () => {
    expect(RESUME.contact.linkedin.trim()).not.toBe('');
  });
});

describe('RESUME.summary', () => {
  it('is non-empty', () => {
    expect(RESUME.summary.trim()).not.toBe('');
  });

  it('is at least 50 characters', () => {
    expect(RESUME.summary.length).toBeGreaterThanOrEqual(50);
  });
});

describe('RESUME.experience', () => {
  it('has at least one entry', () => {
    expect(RESUME.experience.length).toBeGreaterThan(0);
  });

  it('every entry has required fields', () => {
    for (const job of RESUME.experience) {
      expect(job.company.trim(), `company empty for ${job.role}`).not.toBe('');
      expect(job.role.trim(),    `role empty at ${job.company}`).not.toBe('');
      expect(job.period.trim(),  `period empty at ${job.company}`).not.toBe('');
      expect(job.location.trim(), `location empty at ${job.company}`).not.toBe('');
    }
  });

  it('every entry has at least one bullet', () => {
    for (const job of RESUME.experience) {
      expect(job.bullets.length, `no bullets for ${job.company}`).toBeGreaterThan(0);
    }
  });

  it('all bullets are non-empty strings', () => {
    for (const job of RESUME.experience) {
      for (const bullet of job.bullets) {
        expect(bullet.trim(), `empty bullet at ${job.company}`).not.toBe('');
      }
    }
  });
});

describe('RESUME.education', () => {
  it('has at least one entry', () => {
    expect(RESUME.education.length).toBeGreaterThan(0);
  });

  it('every entry has required fields', () => {
    for (const edu of RESUME.education) {
      expect(edu.institution.trim(), `institution empty`).not.toBe('');
      expect(edu.degree.trim(),      `degree empty at ${edu.institution}`).not.toBe('');
      expect(edu.period.trim(),      `period empty at ${edu.institution}`).not.toBe('');
      expect(edu.location.trim(),    `location empty at ${edu.institution}`).not.toBe('');
      expect(edu.detail.trim(),      `detail empty at ${edu.institution}`).not.toBe('');
    }
  });
});

describe('RESUME.skills', () => {
  it('has at least one category', () => {
    expect(RESUME.skills.length).toBeGreaterThan(0);
  });

  it('every category has a non-empty name', () => {
    for (const group of RESUME.skills) {
      expect(group.category.trim()).not.toBe('');
    }
  });

  it('every category has at least one skill', () => {
    for (const group of RESUME.skills) {
      expect(group.items.length, `"${group.category}" has no skills`).toBeGreaterThan(0);
    }
  });

  it('all skill items are non-empty strings', () => {
    for (const group of RESUME.skills) {
      for (const item of group.items) {
        expect(item.trim(), `empty skill in "${group.category}"`).not.toBe('');
      }
    }
  });

  it('has no duplicate category names', () => {
    const names = RESUME.skills.map(g => g.category);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('RESUME.projects', () => {
  it('has at least one project', () => {
    expect(RESUME.projects.length).toBeGreaterThan(0);
  });

  it('every project has required fields', () => {
    for (const proj of RESUME.projects) {
      expect(proj.name.trim(),   `project name empty`).not.toBe('');
      expect(proj.tech.trim(),   `tech empty for ${proj.name}`).not.toBe('');
      expect(proj.period.trim(), `period empty for ${proj.name}`).not.toBe('');
      expect(proj.desc.trim(),   `desc empty for ${proj.name}`).not.toBe('');
      expect(proj.link.trim(),   `link empty for ${proj.name}`).not.toBe('');
    }
  });

  it('all project descriptions are at least 20 chars', () => {
    for (const proj of RESUME.projects) {
      expect(proj.desc.length, `desc too short for ${proj.name}`).toBeGreaterThanOrEqual(20);
    }
  });
});

describe('Cross-file consistency', () => {
  it('RESUME.name matches portfolio.json personalInfo.name', async () => {
    const portfolio = await import('../../data/portfolio.json');
    expect(RESUME.name).toBe(portfolio.personalInfo.name);
  });

  it('RESUME.contact.email matches portfolio.json email', async () => {
    const portfolio = await import('../../data/portfolio.json');
    expect(RESUME.contact.email).toBe(portfolio.personalInfo.email);
  });

  it('RESUME.contact.location matches portfolio.json location', async () => {
    const portfolio = await import('../../data/portfolio.json');
    expect(RESUME.contact.location).toBe(portfolio.personalInfo.location);
  });
});

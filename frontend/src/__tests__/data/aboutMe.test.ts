import { describe, it, expect } from 'vitest';
import {
  identity,
  quickIntro,
  originStory,
  whatImAbout,
  funFacts,
  lookingFor,
  currentlyMastering,
  readingList,
  lifeItems,
  portfolioTechStack,
  contactLinks,
} from '../../data/aboutMe';

describe('identity', () => {
  it('has non-empty name', () => expect(identity.name.trim()).not.toBe(''));
  it('has non-empty title', () => expect(identity.title.trim()).not.toBe(''));
  it('has non-empty location', () => expect(identity.location.trim()).not.toBe(''));
  it('has non-empty school', () => expect(identity.school.trim()).not.toBe(''));
  it('has non-empty availability', () => expect(identity.availability.trim()).not.toBe(''));
  it('has non-empty photo path', () => expect(identity.photo.trim()).not.toBe(''));
  it('photo path starts with /', () => expect(identity.photo).toMatch(/^\//));
});

describe('quickIntro', () => {
  it('has at least one paragraph', () => {
    expect(quickIntro.length).toBeGreaterThan(0);
  });

  it('all paragraphs are non-empty', () => {
    for (const para of quickIntro) {
      expect(para.trim()).not.toBe('');
    }
  });
});

describe('originStory', () => {
  it('has exactly 4 cards', () => {
    expect(originStory.length).toBe(4);
  });

  it('every card has non-empty iconName, title, and text', () => {
    for (const card of originStory) {
      expect(card.iconName.trim(), `iconName empty for "${card.title}"`).not.toBe('');
      expect(card.title.trim(),    `title empty`).not.toBe('');
      expect(card.text.trim(),     `text empty for "${card.title}"`).not.toBe('');
    }
  });

  it('all card titles are unique', () => {
    const titles = originStory.map(c => c.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('whatImAbout', () => {
  it('has at least 2 paragraphs', () => {
    expect(whatImAbout.length).toBeGreaterThanOrEqual(2);
  });

  it('all paragraphs are non-empty', () => {
    for (const para of whatImAbout) {
      expect(para.trim()).not.toBe('');
    }
  });
});

describe('funFacts', () => {
  it('has exactly 3 fun facts', () => {
    expect(funFacts.length).toBe(3);
  });

  it('every fact has non-empty iconName, label, and value', () => {
    for (const fact of funFacts) {
      expect(fact.iconName.trim(), `iconName empty for "${fact.label}"`).not.toBe('');
      expect(fact.label.trim(),    `label empty`).not.toBe('');
      expect(fact.value.trim(),    `value empty for "${fact.label}"`).not.toBe('');
    }
  });
});

describe('lookingFor', () => {
  it('has at least 2 items', () => {
    expect(lookingFor.length).toBeGreaterThanOrEqual(2);
  });

  it('all items are non-empty strings', () => {
    for (const item of lookingFor) {
      expect(item.trim()).not.toBe('');
    }
  });
});

describe('currentlyMastering', () => {
  it('has at least one item', () => {
    expect(currentlyMastering.length).toBeGreaterThan(0);
  });

  it('every item has non-empty name and detail', () => {
    for (const item of currentlyMastering) {
      expect(item.name.trim(),   `name empty`).not.toBe('');
      expect(item.detail.trim(), `detail empty for "${item.name}"`).not.toBe('');
    }
  });
});

describe('readingList', () => {
  it('has at least one item', () => {
    expect(readingList.length).toBeGreaterThan(0);
  });

  it('all items are non-empty', () => {
    for (const item of readingList) {
      expect(item.trim()).not.toBe('');
    }
  });
});

describe('lifeItems', () => {
  it('has at least 2 items', () => {
    expect(lifeItems.length).toBeGreaterThanOrEqual(2);
  });

  it('every item has non-empty iconName, title, and detail', () => {
    for (const item of lifeItems) {
      expect(item.iconName.trim(), `iconName empty for "${item.title}"`).not.toBe('');
      expect(item.title.trim(),    `title empty`).not.toBe('');
      expect(item.detail.trim(),   `detail empty for "${item.title}"`).not.toBe('');
    }
  });
});

describe('portfolioTechStack', () => {
  it('has at least one item', () => {
    expect(portfolioTechStack.length).toBeGreaterThan(0);
  });

  it('all items are non-empty', () => {
    for (const tech of portfolioTechStack) {
      expect(tech.trim()).not.toBe('');
    }
  });
});

describe('contactLinks', () => {
  it('email is a valid email address', () => {
    expect(contactLinks.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('linkedin is a non-empty URL', () => {
    expect(contactLinks.linkedin.trim()).not.toBe('');
    expect(contactLinks.linkedin).toMatch(/^https?:\/\//);
  });

  it('github is a non-empty URL', () => {
    expect(contactLinks.github.trim()).not.toBe('');
    expect(contactLinks.github).toMatch(/^https?:\/\//);
  });
});

describe('Cross-file consistency: aboutMe → portfolio.json', () => {
  it('identity.name matches portfolio.json', async () => {
    const portfolio = await import('../../data/portfolio.json');
    expect(identity.name).toBe(portfolio.personalInfo.name);
  });

  it('identity.location matches portfolio.json', async () => {
    const portfolio = await import('../../data/portfolio.json');
    expect(identity.location).toBe(portfolio.personalInfo.location);
  });

  it('contactLinks.email matches portfolio.json', async () => {
    const portfolio = await import('../../data/portfolio.json');
    expect(contactLinks.email).toBe(portfolio.personalInfo.email);
  });
});

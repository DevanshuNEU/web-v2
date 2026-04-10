import { describe, it, expect } from 'vitest';
import {
  SKILLS, CAT_COLOR, CAT_LABEL, LEVEL_LABEL, SKILL_CATEGORIES,
  SKILL_IDS, skillsForResume,
  type SkillCategory,
} from '../../data/skills';

const VALID_CATEGORIES: SkillCategory[] = ['language', 'frontend', 'backend', 'cloud', 'ai', 'tool'];

describe('SKILLS array', () => {
  it('is non-empty', () => {
    expect(SKILLS.length).toBeGreaterThan(0);
  });

  it('every skill has a non-empty id', () => {
    for (const skill of SKILLS) {
      expect(skill.id.trim(), `skill ${skill.name} has empty id`).not.toBe('');
    }
  });

  it('every skill has a non-empty name', () => {
    for (const skill of SKILLS) {
      expect(skill.name.trim(), `skill id=${skill.id} has empty name`).not.toBe('');
    }
  });

  it('every skill has a non-empty description', () => {
    for (const skill of SKILLS) {
      expect(skill.description.trim(), `skill ${skill.name} has empty description`).not.toBe('');
    }
  });

  it('every skill has a non-empty xp string', () => {
    for (const skill of SKILLS) {
      expect(skill.xp.trim(), `skill ${skill.name} has empty xp`).not.toBe('');
    }
  });

  it('all skill ids are unique', () => {
    const ids = SKILLS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all levels are integers between 1 and 5', () => {
    for (const skill of SKILLS) {
      expect(skill.level, `skill ${skill.name} level out of range`).toBeGreaterThanOrEqual(1);
      expect(skill.level, `skill ${skill.name} level out of range`).toBeLessThanOrEqual(5);
      expect(Number.isInteger(skill.level), `skill ${skill.name} level is not integer`).toBe(true);
    }
  });

  it('all categories are valid', () => {
    for (const skill of SKILLS) {
      expect(
        VALID_CATEGORIES.includes(skill.category),
        `skill ${skill.name} has invalid category: ${skill.category}`
      ).toBe(true);
    }
  });

  it('all dependency ids reference existing skills', () => {
    for (const skill of SKILLS) {
      for (const dep of skill.deps) {
        expect(
          SKILL_IDS.has(dep),
          `skill ${skill.name} has unknown dep: ${dep}`
        ).toBe(true);
      }
    }
  });

  it('no skill depends on itself', () => {
    for (const skill of SKILLS) {
      expect(
        skill.deps.includes(skill.id),
        `skill ${skill.name} depends on itself`
      ).toBe(false);
    }
  });

  it('covers all 6 categories', () => {
    const usedCategories = new Set(SKILLS.map(s => s.category));
    for (const cat of VALID_CATEGORIES) {
      expect(usedCategories.has(cat), `no skills in category: ${cat}`).toBe(true);
    }
  });
});

describe('CAT_COLOR', () => {
  it('has an entry for every category', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(CAT_COLOR[cat], `missing CAT_COLOR for ${cat}`).toBeDefined();
      expect(CAT_COLOR[cat].trim()).not.toBe('');
    }
  });

  it('all colors are valid hex strings', () => {
    for (const [cat, color] of Object.entries(CAT_COLOR)) {
      expect(color, `CAT_COLOR[${cat}] is not a hex color`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('CAT_LABEL', () => {
  it('has an entry for every category', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(CAT_LABEL[cat], `missing CAT_LABEL for ${cat}`).toBeDefined();
      expect(CAT_LABEL[cat].trim()).not.toBe('');
    }
  });
});

describe('LEVEL_LABEL', () => {
  it('has labels for levels 1-5', () => {
    for (let i = 1; i <= 5; i++) {
      expect(LEVEL_LABEL[i], `missing LEVEL_LABEL for level ${i}`).toBeDefined();
      expect(LEVEL_LABEL[i].trim()).not.toBe('');
    }
  });
});

describe('SKILL_CATEGORIES', () => {
  it('includes "all" as the first entry', () => {
    expect(SKILL_CATEGORIES[0]).toBe('all');
  });

  it('includes all 6 skill categories', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(SKILL_CATEGORIES).toContain(cat);
    }
  });
});

describe('SKILL_IDS', () => {
  it('matches the SKILLS array exactly', () => {
    expect(SKILL_IDS.size).toBe(SKILLS.length);
    for (const skill of SKILLS) {
      expect(SKILL_IDS.has(skill.id)).toBe(true);
    }
  });
});

describe('skillsForResume()', () => {
  it('returns non-empty array', () => {
    const result = skillsForResume();
    expect(result.length).toBeGreaterThan(0);
  });

  it('every group has a non-empty category name', () => {
    for (const group of skillsForResume()) {
      expect(group.category.trim()).not.toBe('');
    }
  });

  it('every group has at least one skill', () => {
    for (const group of skillsForResume()) {
      expect(group.items.length, `group "${group.category}" is empty`).toBeGreaterThan(0);
    }
  });

  it('every skill name in groups is non-empty', () => {
    for (const group of skillsForResume()) {
      for (const item of group.items) {
        expect(item.trim(), `empty skill name in "${group.category}"`).not.toBe('');
      }
    }
  });

  it('total skill count matches SKILLS array length', () => {
    const total = skillsForResume().reduce((sum, g) => sum + g.items.length, 0);
    expect(total).toBe(SKILLS.length);
  });
});

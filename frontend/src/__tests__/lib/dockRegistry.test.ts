import { describe, it, expect } from 'vitest';
import { registerDockIcon, getDockIconRect } from '@/lib/dockRegistry';

const fakeRect = (left: number): DOMRect =>
  ({ left, top: 0, width: 48, height: 48, right: left + 48, bottom: 48, x: left, y: 0, toJSON() {} } as DOMRect);

describe('dockRegistry', () => {
  it('returns null for an app with no registered icon', () => {
    expect(getDockIconRect('terminal')).toBeNull();
  });

  it('returns the live rect from the registered getter', () => {
    const unregister = registerDockIcon('terminal', () => fakeRect(100));
    expect(getDockIconRect('terminal')?.left).toBe(100);
    unregister();
    expect(getDockIconRect('terminal')).toBeNull();
  });

  it('lets the latest registration win and cleans up only its own entry', () => {
    const unregisterA = registerDockIcon('about-me', () => fakeRect(10));
    const unregisterB = registerDockIcon('about-me', () => fakeRect(20));
    expect(getDockIconRect('about-me')?.left).toBe(20);

    // A's cleanup must not remove B's registration.
    unregisterA();
    expect(getDockIconRect('about-me')?.left).toBe(20);

    unregisterB();
    expect(getDockIconRect('about-me')).toBeNull();
  });
});

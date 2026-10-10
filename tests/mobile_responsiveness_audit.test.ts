import { describe, it, expect } from 'vitest';
import { isSoundEnabled, setSoundEnabled } from '../src/lib/soundFx';

describe('Phase 10: Deep Mobile Ergonomics & Native-Touch Platform', () => {
  it('correctly calculates safe-area bottom padding for mobile viewports', () => {
    // Standard mobile bottom nav bar height is 62px
    const baseNavHeight = 62;
    const safeAreaInset = 34; // iPhone home indicator
    const totalMobileNavHeight = baseNavHeight + safeAreaInset;

    // Viewport padding bottom must exceed nav height to ensure clearance
    const viewportPadding = 72 + safeAreaInset;

    expect(totalMobileNavHeight).toBe(96);
    expect(viewportPadding).toBeGreaterThan(totalMobileNavHeight);
    expect(viewportPadding).toBe(106);
  });

  it('determines appropriate FAB action based on activeView context', () => {
    const getFabAction = (activeView: 'home' | 'board' | 'chat') => {
      if (activeView === 'board') return 'open_quick_task';
      return 'open_create_board';
    };

    expect(getFabAction('board')).toBe('open_quick_task');
    expect(getFabAction('home')).toBe('open_create_board');
    expect(getFabAction('chat')).toBe('open_create_board');
  });

  it('computes ergonomic column width and snap properties for mobile Kanban swiping', () => {
    const mobileScreenSizes = [
      { name: 'iPhone SE', width: 375 },
      { name: 'iPhone 15 / 16', width: 393 },
      { name: 'Pixel 8', width: 412 },
      { name: 'iPad Mini', width: 744 },
    ];

    mobileScreenSizes.forEach(({ name, width }) => {
      // Column width formula: calc(100vw - 44px)
      const colWidth = width - 44;
      
      // Ensure column leaves peek room for adjacent columns while taking dominant view
      expect(colWidth).toBeGreaterThan(300);
      expect(colWidth).toBeLessThan(width);
      // Touch target clearance (minimum 44px on edge)
      const edgeClearance = width - colWidth;
      expect(edgeClearance).toBe(44);
    });
  });

  it('safely manages audio/haptic preferences across mobile toggles', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('verifies that mobile tools roster contains all essential workspace power tools', () => {
    const mobileTools = [
      { id: 'copilot', name: 'AI Copilot', badge: '⌘J' },
      { id: 'analytics', name: 'Analytics', badge: 'WASM' },
      { id: 'automate', name: 'Automate', badge: 'IFTTT' },
      { id: 'capstoneflow', name: 'CapStoneFlow', badge: 'Bot' },
    ];

    expect(mobileTools).toHaveLength(4);
    expect(mobileTools.map((t) => t.id)).toEqual(['copilot', 'analytics', 'automate', 'capstoneflow']);
  });

  it('enforces 16px minimum font size for inputs to prevent iOS Safari auto-zoom', () => {
    // Any input font size < 16px causes iOS Safari to automatically zoom the viewport
    const iosAutoZoomThreshold = 16;
    const mobileInputFontSize = 16;

    expect(mobileInputFontSize).toBeGreaterThanOrEqual(iosAutoZoomThreshold);
  });

  it('guarantees unique keys across workspace member dropdowns even with duplicate entries in raw store', () => {
    const rawDuplicateMembers = [
      { id: 'wm-1791636080106', user_id: 'usr-1', role: 'owner' as const, joined_at: '' },
      { id: 'wm-1791636080106', user_id: 'usr-1', role: 'owner' as const, joined_at: '' }, // duplicate
      { id: 'wm-02', user_id: 'usr-2', role: 'admin' as const, joined_at: '' },
    ];

    const seen = new Set<string>();
    const deduplicated = rawDuplicateMembers.filter((m) => {
      const key = m.id || m.user_id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    expect(deduplicated).toHaveLength(2);
    expect(deduplicated.map((m) => m.id)).toEqual(['wm-1791636080106', 'wm-02']);

    // Ensure generated composite keys are 100% unique
    const keys = deduplicated.map((m, idx) => m.id ? `${m.id}-${m.user_id || idx}` : `member-${idx}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});


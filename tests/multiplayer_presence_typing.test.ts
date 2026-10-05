import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresenceUser } from '../src/lib/supabase/useRealtimeTickets';

describe('Phase 3: Multiplayer Presence 2.0 & Real-Time Typing Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockUsers: PresenceUser[] = [
    {
      id: 'usr-001',
      name: 'Alex Rivera',
      email: 'alex@happytf.dev',
      avatar: 'https://avatar1.url',
      role: 'Staff Lead',
      color: '#3ecf8e',
      status: 'active',
      activeItemId: 'item-101',
      activeItemTitle: 'Setup Supabase RLS policies',
      onlineAt: new Date().toISOString(),
    },
    {
      id: 'usr-002',
      name: 'Taylor Chen',
      email: 'taylor@happytf.dev',
      avatar: 'https://avatar2.url',
      role: 'Senior Frontend',
      color: '#3b82f6',
      status: 'active',
      activeItemId: 'item-102',
      activeItemTitle: 'OCC v2 Concurrency token',
      onlineAt: new Date().toISOString(),
    },
    {
      id: 'usr-003',
      name: 'Elena Rostova',
      email: 'elena@happytf.dev',
      avatar: 'https://avatar3.url',
      role: 'DevOps & SRE',
      color: '#f59e0b',
      status: 'active',
      activeItemId: null,
      onlineAt: new Date().toISOString(),
    },
  ];

  it('correctly maps active focused teammates by item ID excluding current user', () => {
    const currentUserId = 'usr-001'; // Alex Rivera is current user
    const map = new Map<string, PresenceUser>();

    mockUsers.forEach((u) => {
      if (u.activeItemId && u.id !== currentUserId) {
        map.set(u.activeItemId, u);
      }
    });

    expect(map.has('item-101')).toBe(false); // Excludes self
    expect(map.has('item-102')).toBe(true);  // Maps Taylor Chen
    expect(map.get('item-102')?.name).toBe('Taylor Chen');
    expect(map.get('item-102')?.color).toBe('#3b82f6');
  });

  it('filters active teammates with current focus for presence list', () => {
    const activeWithFocus = mockUsers.filter((u) => u.activeItemId !== null);
    expect(activeWithFocus).toHaveLength(2);

    const browsingOnly = mockUsers.filter((u) => !u.activeItemId);
    expect(browsingOnly).toHaveLength(1);
    expect(browsingOnly[0].name).toBe('Elena Rostova');
  });

  class TypingBroadcaster {
    private typers: Set<string> = new Set();
    private clearTimers: Map<string, any> = new Map();
    private debounceMs: number;

    constructor(debounceMs = 2500) {
      this.debounceMs = debounceMs;
    }

    userStartedTyping(userName: string): string[] {
      this.typers.add(userName);
      if (this.clearTimers.has(userName)) {
        clearTimeout(this.clearTimers.get(userName));
      }

      const timer = setTimeout(() => {
        this.typers.delete(userName);
        this.clearTimers.delete(userName);
      }, this.debounceMs);

      this.clearTimers.set(userName, timer);
      return Array.from(this.typers);
    }

    getActiveTypers(): string[] {
      return Array.from(this.typers);
    }
  }

  it('manages live typing indicator with automatic expiration debounce', () => {
    const broadcaster = new TypingBroadcaster(3000);

    // 1. Taylor starts typing
    broadcaster.userStartedTyping('Taylor Chen');
    expect(broadcaster.getActiveTypers()).toContain('Taylor Chen');

    // 2. Advance 1500ms (still typing)
    vi.advanceTimersByTime(1500);
    expect(broadcaster.getActiveTypers()).toContain('Taylor Chen');

    // 3. Sarah starts typing
    broadcaster.userStartedTyping('Sarah Jenkins');
    expect(broadcaster.getActiveTypers()).toEqual(['Taylor Chen', 'Sarah Jenkins']);

    // 4. Advance 1600ms (Taylor timer hits 3100ms total, clears Taylor)
    vi.advanceTimersByTime(1600);
    expect(broadcaster.getActiveTypers()).not.toContain('Taylor Chen');
    expect(broadcaster.getActiveTypers()).toContain('Sarah Jenkins');

    // 5. Advance another 1500ms (clears Sarah too)
    vi.advanceTimersByTime(1500);
    expect(broadcaster.getActiveTypers()).toHaveLength(0);
  });

  it('formats typing label for singular and plural collaborators correctly', () => {
    function formatTypingLabel(typers: string[]): string {
      if (typers.length === 0) return '';
      if (typers.length === 1) return `${typers[0]} is typing...`;
      if (typers.length === 2) return `${typers[0]} and ${typers[1]} are typing...`;
      return `${typers[0]} and ${typers.length - 1} others are typing...`;
    }

    expect(formatTypingLabel([])).toBe('');
    expect(formatTypingLabel(['Taylor Chen'])).toBe('Taylor Chen is typing...');
    expect(formatTypingLabel(['Taylor Chen', 'Sarah Jenkins'])).toBe('Taylor Chen and Sarah Jenkins are typing...');
    expect(formatTypingLabel(['Taylor', 'Sarah', 'Elena'])).toBe('Taylor and 2 others are typing...');
  });
});

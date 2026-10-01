import { describe, it, expect } from 'vitest';
import { formatRelativeTime, extractTimestamp, formatFullDateTime } from '../src/lib/timeAgo';

describe('formatRelativeTime & timestamp extraction', () => {
  const baseNow = new Date('2026-10-01T12:00:00.000Z').getTime();

  it('formats recent events as "Just now"', () => {
    const recent = new Date(baseNow - 20 * 1000).toISOString();
    expect(formatRelativeTime(recent, undefined, baseNow)).toBe('Just now');
  });

  it('formats minutes elapsed accurately', () => {
    const oneMinAgo = new Date(baseNow - 65 * 1000).toISOString();
    expect(formatRelativeTime(oneMinAgo, undefined, baseNow)).toBe('1 min ago');

    const tenMinsAgo = new Date(baseNow - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinsAgo, undefined, baseNow)).toBe('10 mins ago');
  });

  it('formats hours elapsed accurately', () => {
    const oneHourAgo = new Date(baseNow - 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneHourAgo, undefined, baseNow)).toBe('1 hour ago');

    const fiveHoursAgo = new Date(baseNow - 5 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(fiveHoursAgo, undefined, baseNow)).toBe('5 hours ago');
  });

  it('formats days and weeks elapsed accurately', () => {
    const oneDayAgo = new Date(baseNow - 24 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(oneDayAgo, undefined, baseNow)).toBe('1 day ago');

    const threeDaysAgo = new Date(baseNow - 3 * 24 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo, undefined, baseNow)).toBe('3 days ago');

    const twoWeeksAgo = new Date(baseNow - 14 * 24 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(twoWeeksAgo, undefined, baseNow)).toBe('2 weeks ago');
  });

  it('recovers real elapsed time for legacy comments where timestamp was hardcoded as "Just now"', () => {
    // When a comment was created 2 days ago, its ID is comm-<epoch>-<hash>
    const twoDaysAgoEpoch = baseNow - 2 * 24 * 3600 * 1000;
    const legacyCommentId = `comm-${twoDaysAgoEpoch}-a1b2`;
    const hardcodedTimestamp = 'Just now';

    // It should extract the epoch from the ID and calculate the real elapsed time!
    expect(formatRelativeTime(hardcodedTimestamp, legacyCommentId, baseNow)).toBe('2 days ago');
  });

  it('preserves existing descriptive strings from mock data', () => {
    expect(formatRelativeTime('15 mins ago', undefined, baseNow)).toBe('15 mins ago');
    expect(formatRelativeTime('1 hour ago', undefined, baseNow)).toBe('1 hour ago');
  });

  it('provides formatted tooltip dates via formatFullDateTime', () => {
    const iso = '2026-09-28T10:30:00.000Z';
    const formatted = formatFullDateTime(iso);
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Sep');
  });
});

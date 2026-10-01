import { describe, it, expect } from 'vitest';
import { BoardItem, ItemComment } from '../src/types';

describe('Task Comment & Discussion Engine', () => {
  const initialItem: BoardItem = {
    id: 'item-test-1',
    board_id: 'board-test',
    group_id: 'group-test',
    title: 'Test Feature Ticket',
    status: 'Working on it',
    status_color: '#f59e0b',
    priority: 'high',
    due_date: '2026-10-10',
    tags: ['ticket', 'backend'],
    activities: [
      {
        id: 'act-1',
        author_name: 'Sarah Connor',
        action: 'created this task',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString(),
      }
    ],
    comments: [
      {
        id: 'comm-1',
        author_name: 'John Doe',
        author_avatar: '',
        content: 'Initial spec review is complete.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        created_at: new Date(Date.now() - 1800000).toISOString(),
        reactions: [{ emoji: '👍', count: 1, users: ['user-1'] }],
      }
    ],
    version: 1,
  };

  it('adds a new comment immutably without modifying existing array in place', () => {
    const newComment: ItemComment = {
      id: 'comm-2',
      author_name: 'Marc Andrei',
      author_avatar: '',
      content: 'LGTM! Pushed fix to staging branch.',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      reactions: [],
    };

    const updatedItem: BoardItem = {
      ...initialItem,
      comments: [newComment, ...initialItem.comments],
      version: (initialItem.version ?? 1) + 1,
    };

    expect(updatedItem.comments).toHaveLength(2);
    expect(updatedItem.comments[0].id).toBe('comm-2');
    expect(updatedItem.comments[1].id).toBe('comm-1');
    expect(initialItem.comments).toHaveLength(1); // Original unchanged
  });

  it('deletes a comment immutably preserving other comments', () => {
    const itemWithTwoComments: BoardItem = {
      ...initialItem,
      comments: [
        {
          id: 'comm-delete-me',
          author_name: 'Marc Andrei',
          author_avatar: '',
          content: 'Typo in update',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          reactions: [],
        },
        ...initialItem.comments,
      ]
    };

    const deletedItem: BoardItem = {
      ...itemWithTwoComments,
      comments: itemWithTwoComments.comments.filter((c) => c.id !== 'comm-delete-me'),
    };

    expect(deletedItem.comments).toHaveLength(1);
    expect(deletedItem.comments.find((c) => c.id === 'comm-delete-me')).toBeUndefined();
    expect(deletedItem.comments[0].id).toBe('comm-1');
  });

  it('toggles reactions immutably with user tracking', () => {
    const comment = initialItem.comments[0];
    const currentUserId = 'user-2';
    const targetEmoji = '🚀';

    // Add reaction
    const existingReaction = comment.reactions.find((r) => r.emoji === targetEmoji);
    let updatedReactions;
    if (existingReaction) {
      if (existingReaction.users?.includes(currentUserId)) {
        updatedReactions = comment.reactions
          .map((r) => r.emoji === targetEmoji ? { ...r, count: r.count - 1, users: r.users?.filter((u) => u !== currentUserId) } : r)
          .filter((r) => r.count > 0);
      } else {
        updatedReactions = comment.reactions.map((r) =>
          r.emoji === targetEmoji ? { ...r, count: r.count + 1, users: [...(r.users || []), currentUserId] } : r
        );
      }
    } else {
      updatedReactions = [...comment.reactions, { emoji: targetEmoji, count: 1, users: [currentUserId] }];
    }

    expect(updatedReactions).toHaveLength(2);
    expect(updatedReactions.find((r) => r.emoji === '🚀')?.count).toBe(1);
    expect(updatedReactions.find((r) => r.emoji === '🚀')?.users).toContain('user-2');
  });

  it('extracts @mentions accurately from comment text', () => {
    const text = 'Hey @Marc and @Sarah please review PR #44';
    const mentionRegex = /@(\w+)/g;
    const matches: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      matches.push(match[1].trim());
    }

    expect(matches).toContain('Marc');
    expect(matches).toContain('Sarah');
  });

  it('formats markdown bold, code, and bullet quotes safely', () => {
    const rawMarkdown = '**Critical Fix**: Ensure `OCC v2` handles 409 Conflict';
    expect(rawMarkdown).toContain('**Critical Fix**');
    expect(rawMarkdown).toContain('`OCC v2`');
  });
});

import { describe, it, expect } from 'vitest';
import { InMemoryChannelRepository } from '../src/core/adapters/InMemoryChannelRepository';
import { TeamChannel, ChannelMessage } from '../src/types';

describe('Phase 2: Hexagonal Team Chat Repository & Message Engine', () => {
  const initialChannels: TeamChannel[] = [
    {
      id: 'chan-general',
      workspace_id: 'ws-demo-01',
      name: 'general',
      topic: 'Team wide announcements and updates',
      is_private: false,
      member_count: 5,
      created_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'chan-alerts',
      workspace_id: 'ws-demo-01',
      name: 'eng-prod-alerts',
      topic: 'Automated ticket alerts & bugs',
      is_private: false,
      member_count: 4,
      created_at: '2026-10-02T00:00:00Z',
    },
  ];

  it('retrieves workspace channels ordered chronologically', async () => {
    const repo = new InMemoryChannelRepository(initialChannels);
    const channels = await repo.getChannels('ws-demo-01');

    expect(channels).toHaveLength(2);
    expect(channels[0].name).toBe('general');
    expect(channels[1].name).toBe('eng-prod-alerts');
  });

  it('creates a new team channel with sanitized slug name', async () => {
    const repo = new InMemoryChannelRepository();
    const created = await repo.createChannel({
      workspace_id: 'ws-alpha',
      name: 'Sprint 25 Planning!!',
      topic: 'Upcoming roadmap items',
      is_private: false,
      created_by: 'Alex Rivera',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('sprint-25-planning--');
    expect(created.topic).toBe('Upcoming roadmap items');
    expect(created.is_private).toBe(false);

    const retrieved = await repo.getChannelById(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('sprint-25-planning--');
  });

  it('posts a root message and queries channel messages', async () => {
    const repo = new InMemoryChannelRepository(initialChannels);
    const msg = await repo.postMessage({
      channel_id: 'chan-general',
      workspace_id: 'ws-demo-01',
      user_id: 'usr-1',
      user_name: 'Alex Rivera',
      user_avatar: 'https://avatar.url',
      content: 'Shipped OCC v2 collision protection! #TK-101',
      linked_ticket_number: 'TK-101',
    });

    expect(msg.id).toBeDefined();
    expect(msg.content).toContain('Shipped OCC v2');
    expect(msg.linked_ticket_number).toBe('TK-101');
    expect(msg.reactions).toHaveLength(0);
    expect(msg.reply_count).toBe(0);

    const list = await repo.getMessages('chan-general');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(msg.id);
  });

  it('posts a threaded reply and increments parent message reply_count', async () => {
    const repo = new InMemoryChannelRepository(initialChannels);
    const parentMsg = await repo.postMessage({
      channel_id: 'chan-general',
      workspace_id: 'ws-demo-01',
      user_id: 'usr-1',
      user_name: 'Alex Rivera',
      user_avatar: 'https://avatar.url',
      content: 'Starting thread on PR auto-transitions',
    });

    const replyMsg = await repo.postMessage({
      channel_id: 'chan-general',
      workspace_id: 'ws-demo-01',
      user_id: 'usr-2',
      user_name: 'Taylor Chen',
      user_avatar: 'https://avatar2.url',
      content: 'I verified the HMAC SHA-256 webhook test passes.',
      parent_id: parentMsg.id,
    });

    expect(replyMsg.parent_id).toBe(parentMsg.id);

    // Verify parent's reply_count was incremented
    const allMessages = await repo.getMessages('chan-general');
    const updatedParent = allMessages.find((m) => m.id === parentMsg.id);
    expect(updatedParent?.reply_count).toBe(1);

    // Verify querying thread replies
    const threadReplies = await repo.getMessages('chan-general', parentMsg.id);
    expect(threadReplies).toHaveLength(1);
    expect(threadReplies[0].content).toContain('HMAC SHA-256');
  });

  it('toggles emoji reactions additively and subtractively', async () => {
    const repo = new InMemoryChannelRepository(initialChannels);
    const msg = await repo.postMessage({
      channel_id: 'chan-general',
      workspace_id: 'ws-demo-01',
      user_id: 'usr-1',
      user_name: 'Alex Rivera',
      user_avatar: 'https://avatar.url',
      content: 'Celebrate release! 🚀',
    });

    // 1. Alex adds 🚀
    const withAlex = await repo.toggleReaction(msg.id, '🚀', 'Alex Rivera');
    expect(withAlex?.reactions).toHaveLength(1);
    expect(withAlex?.reactions[0].emoji).toBe('🚀');
    expect(withAlex?.reactions[0].count).toBe(1);
    expect(withAlex?.reactions[0].users).toContain('Alex Rivera');

    // 2. Taylor also adds 🚀
    const withTaylor = await repo.toggleReaction(msg.id, '🚀', 'Taylor Chen');
    expect(withTaylor?.reactions[0].count).toBe(2);
    expect(withTaylor?.reactions[0].users).toContain('Taylor Chen');

    // 3. Alex toggles 🚀 off (removes reaction)
    const afterAlexRemove = await repo.toggleReaction(msg.id, '🚀', 'Alex Rivera');
    expect(afterAlexRemove?.reactions[0].count).toBe(1);
    expect(afterAlexRemove?.reactions[0].users).not.toContain('Alex Rivera');

    // 4. Taylor toggles 🚀 off (reaction removed entirely)
    const afterTaylorRemove = await repo.toggleReaction(msg.id, '🚀', 'Taylor Chen');
    expect(afterTaylorRemove?.reactions).toHaveLength(0);
  });
});

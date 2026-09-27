import fs from 'fs';
import path from 'path';
import { TeamChannel, ChannelMessage } from '@/types';
import { DEFAULT_AVATAR } from './avatarHelper';
import { isDeployed } from '@/lib/environment';

const DATA_DIR = path.join(process.cwd(), '.data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'channel_messages.json');

export const INITIAL_CHANNELS: TeamChannel[] = [
  {
    id: 'chan-general',
    workspace_id: 'ws-demo-01',
    name: 'general',
    topic: 'Workspace-wide announcements, team discussions, and project updates',
    is_private: false,
    member_count: 5,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'chan-eng-alerts',
    workspace_id: 'ws-demo-01',
    name: 'eng-prod-alerts',
    topic: 'Automated ticket alerts, production bug triage, and high-severity issues',
    is_private: false,
    member_count: 4,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'chan-incident-triage',
    workspace_id: 'ws-demo-01',
    name: 'incident-triage',
    topic: 'P0 / Critical incident response, SLA tracking, and live postmortems',
    is_private: false,
    member_count: 3,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'chan-product-roadmap',
    workspace_id: 'ws-demo-01',
    name: 'product-roadmap',
    topic: 'Sprint planning, customer feedback synthesis, and scope prioritization',
    is_private: false,
    member_count: 5,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const INITIAL_MESSAGES: ChannelMessage[] = [
  {
    id: 'msg-gen-1',
    channel_id: 'chan-general',
    workspace_id: 'ws-demo-01',
    user_id: 'usr-demo-001',
    user_name: 'Alex Rivera',
    user_avatar: DEFAULT_AVATAR,
    content: 'Welcome team to HappyTF Work OS! All Sprint 24 boards and realtime task flows are now live.',
    reactions: [
      { emoji: '🚀', count: 3, users: ['Alex Rivera', 'Taylor Chen', 'Sarah Jenkins'] },
      { emoji: '🎉', count: 2, users: ['Alex Rivera', 'Marcus Vance'] }
    ],
    reply_count: 1,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'msg-gen-2',
    channel_id: 'chan-general',
    workspace_id: 'ws-demo-01',
    user_id: 'usr-002',
    user_name: 'Taylor Chen',
    user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    content: 'Awesome! I am verifying ticket TK-2839 for the realtime broadcast subtasks.',
    parent_id: 'msg-gen-1',
    linked_ticket_number: 'TK-2839',
    reactions: [
      { emoji: '👍', count: 1, users: ['Alex Rivera'] }
    ],
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'msg-alerts-1',
    channel_id: 'chan-eng-alerts',
    workspace_id: 'ws-demo-01',
    user_id: 'usr-sys-bot',
    user_name: 'HappyTF Bot',
    user_avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    content: '🚨 Automated Alert: Ticket TK-2839 has been claimed by Alex Rivera. SLA countdown active (48 hours remaining).',
    linked_ticket_number: 'TK-2839',
    is_system: true,
    reactions: [
      { emoji: '👀', count: 2, users: ['Elena Rostova', 'Marcus Vance'] }
    ],
    reply_count: 0,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

let inMemoryChannels: TeamChannel[] | null = null;
let lastChannelsMtime = 0;

let inMemoryMessages: ChannelMessage[] | null = null;
let lastMessagesMtime = 0;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadChannels(): TeamChannel[] {
  try {
    ensureDir();
    if (fs.existsSync(CHANNELS_FILE)) {
      const stat = fs.statSync(CHANNELS_FILE);
      if (inMemoryChannels && stat.mtimeMs <= lastChannelsMtime) {
        return inMemoryChannels;
      }
      const raw = fs.readFileSync(CHANNELS_FILE, 'utf-8');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryChannels = parsed;
          lastChannelsMtime = stat.mtimeMs;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[serverChannelsStore] Failed to read channels file', err);
  }
  const deployedChannels: TeamChannel[] = [
    {
      id: 'chan-general',
      workspace_id: 'default',
      name: 'general',
      topic: 'Workspace discussions and updates',
      is_private: false,
      member_count: 1,
      created_at: new Date().toISOString(),
    },
  ];
  const fallback = inMemoryChannels || (isDeployed() ? deployedChannels : [...INITIAL_CHANNELS]);
  inMemoryChannels = fallback;
  saveChannels(fallback);
  return fallback;
}

export function saveChannels(channels: TeamChannel[]): void {
  try {
    ensureDir();
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2), 'utf-8');
    inMemoryChannels = channels;
  } catch (err) {
    console.warn('[serverChannelsStore] Failed to save channels file', err);
  }
}

export function loadMessages(): ChannelMessage[] {
  try {
    ensureDir();
    if (fs.existsSync(MESSAGES_FILE)) {
      const stat = fs.statSync(MESSAGES_FILE);
      if (inMemoryMessages && stat.mtimeMs <= lastMessagesMtime) {
        return inMemoryMessages;
      }
      const raw = fs.readFileSync(MESSAGES_FILE, 'utf-8');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryMessages = parsed;
          lastMessagesMtime = stat.mtimeMs;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[serverChannelsStore] Failed to read messages file', err);
  }
  const fallback = inMemoryMessages || (isDeployed() ? [] : [...INITIAL_MESSAGES]);
  inMemoryMessages = fallback;
  saveMessages(fallback);
  return fallback;
}

export function saveMessages(messages: ChannelMessage[]): void {
  try {
    ensureDir();
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
    inMemoryMessages = messages;
  } catch (err) {
    console.warn('[serverChannelsStore] Failed to save messages file', err);
  }
}

export function getServerChannels(workspaceId?: string): TeamChannel[] {
  const all = loadChannels();
  if (workspaceId) {
    return all.filter((c) => c.workspace_id === workspaceId);
  }
  return all;
}

export function addServerChannel(channel: TeamChannel): TeamChannel {
  const all = loadChannels();
  const exists = all.find((c) => c.id === channel.id || (c.workspace_id === channel.workspace_id && c.name.toLowerCase() === channel.name.toLowerCase()));
  if (exists) return exists;
  const updated = [...all, channel];
  saveChannels(updated);
  return channel;
}

export function getServerMessages(channelId: string, parentId?: string | null): ChannelMessage[] {
  const all = loadMessages();
  if (parentId !== undefined) {
    return all.filter((m) => m.channel_id === channelId && (parentId ? m.parent_id === parentId : !m.parent_id));
  }
  return all.filter((m) => m.channel_id === channelId);
}

export function addServerMessage(msg: ChannelMessage): ChannelMessage {
  const all = loadMessages();
  let updated = [...all, msg];

  // If this is a thread reply, increment reply_count on the root message
  if (msg.parent_id) {
    updated = updated.map((m) => {
      if (m.id === msg.parent_id) {
        return {
          ...m,
          reply_count: (m.reply_count || 0) + 1,
        };
      }
      return m;
    });
  }

  saveMessages(updated);
  return msg;
}

export function toggleServerMessageReaction(messageId: string, emoji: string, userName: string): ChannelMessage | null {
  const all = loadMessages();
  let target: ChannelMessage | null = null;

  const updated = all.map((msg) => {
    if (msg.id !== messageId) return msg;

    const existingReactions = msg.reactions || [];
    const found = existingReactions.find((r) => r.emoji === emoji);
    let nextReactions;

    if (found) {
      if (found.users.includes(userName)) {
        nextReactions = existingReactions
          .map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== userName) }
              : r
          )
          .filter((r) => r.count > 0);
      } else {
        nextReactions = existingReactions.map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, users: [...r.users, userName] }
            : r
        );
      }
    } else {
      nextReactions = [...existingReactions, { emoji, count: 1, users: [userName] }];
    }

    target = {
      ...msg,
      reactions: nextReactions,
      updated_at: new Date().toISOString(),
    };
    return target;
  });

  if (target) {
    saveMessages(updated);
  }
  return target;
}

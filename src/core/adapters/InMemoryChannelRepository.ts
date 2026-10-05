import { TeamChannel, ChannelMessage } from '@/types';
import { IChannelRepository, CreateChannelInput, PostMessageInput } from '../ports/IChannelRepository';

export class InMemoryChannelRepository implements IChannelRepository {
  private channels: Map<string, TeamChannel> = new Map();
  private messages: Map<string, ChannelMessage> = new Map();

  constructor(initialChannels: TeamChannel[] = [], initialMessages: ChannelMessage[] = []) {
    initialChannels.forEach((c) => this.channels.set(c.id, { ...c }));
    initialMessages.forEach((m) => this.messages.set(m.id, { ...m }));
  }

  async getChannels(workspaceId: string): Promise<TeamChannel[]> {
    return Array.from(this.channels.values())
      .filter((c) => c.workspace_id === workspaceId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async getChannelById(channelId: string): Promise<TeamChannel | null> {
    const channel = this.channels.get(channelId);
    return channel ? { ...channel } : null;
  }

  async createChannel(input: CreateChannelInput): Promise<TeamChannel> {
    const cleanName = input.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newChan: TeamChannel = {
      id: `chan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: input.workspace_id,
      name: cleanName,
      topic: input.topic || '',
      is_private: Boolean(input.is_private),
      member_count: 1,
      created_by: input.created_by || 'usr-default',
      created_at: new Date().toISOString(),
    };
    this.channels.set(newChan.id, newChan);
    return { ...newChan };
  }

  async getMessages(channelId: string, parentId?: string | null): Promise<ChannelMessage[]> {
    return Array.from(this.messages.values())
      .filter((m) => {
        if (m.channel_id !== channelId) return false;
        if (parentId !== undefined) {
          return m.parent_id === parentId;
        }
        return true;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async postMessage(input: PostMessageInput): Promise<ChannelMessage> {
    const newMsg: ChannelMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channel_id: input.channel_id,
      workspace_id: input.workspace_id,
      user_id: input.user_id,
      user_name: input.user_name,
      user_avatar: input.user_avatar,
      content: input.content.trim(),
      parent_id: input.parent_id || null,
      linked_ticket_number: input.linked_ticket_number || null,
      reactions: [],
      reply_count: 0,
      is_system: Boolean(input.is_system),
      created_at: new Date().toISOString(),
    };

    this.messages.set(newMsg.id, newMsg);

    // If message is a thread reply, increment parent's reply_count
    if (newMsg.parent_id && this.messages.has(newMsg.parent_id)) {
      const parent = this.messages.get(newMsg.parent_id)!;
      parent.reply_count = (parent.reply_count || 0) + 1;
      this.messages.set(parent.id, { ...parent });
    }

    return { ...newMsg };
  }

  async toggleReaction(
    messageId: string,
    emoji: string,
    userName: string
  ): Promise<ChannelMessage | null> {
    const msg = this.messages.get(messageId);
    if (!msg) return null;

    const existingReaction = msg.reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      if (existingReaction.users.includes(userName)) {
        // Remove reaction
        existingReaction.users = existingReaction.users.filter((u) => u !== userName);
        existingReaction.count -= 1;
        if (existingReaction.count <= 0) {
          msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        // Add user to reaction
        existingReaction.users.push(userName);
        existingReaction.count += 1;
      }
    } else {
      // Create new reaction
      msg.reactions.push({
        emoji,
        count: 1,
        users: [userName],
      });
    }

    this.messages.set(messageId, { ...msg });
    return { ...msg };
  }
}

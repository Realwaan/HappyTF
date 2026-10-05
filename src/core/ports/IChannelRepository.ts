import { TeamChannel, ChannelMessage } from '@/types';

export interface CreateChannelInput {
  workspace_id: string;
  name: string;
  topic?: string;
  is_private?: boolean;
  created_by?: string;
}

export interface PostMessageInput {
  channel_id: string;
  workspace_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  parent_id?: string | null;
  linked_ticket_number?: string | null;
  is_system?: boolean;
}

export interface IChannelRepository {
  getChannels(workspaceId: string): Promise<TeamChannel[]>;
  getChannelById(channelId: string): Promise<TeamChannel | null>;
  createChannel(input: CreateChannelInput): Promise<TeamChannel>;
  getMessages(channelId: string, parentId?: string | null): Promise<ChannelMessage[]>;
  postMessage(input: PostMessageInput): Promise<ChannelMessage>;
  toggleReaction(messageId: string, emoji: string, userName: string): Promise<ChannelMessage | null>;
}

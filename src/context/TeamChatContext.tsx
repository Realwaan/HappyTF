'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TeamChannel, ChannelMessage } from '../types';
import { useApp } from './AppContext';
import { playClickSound, playTransitionSound, playCompleteSound } from '../lib/soundFx';

interface TeamChatContextType {
  channels: TeamChannel[];
  activeChannelId: string;
  activeChannel: TeamChannel | null;
  messages: ChannelMessage[];
  activeThreadMessage: ChannelMessage | null;
  threadMessages: ChannelMessage[];
  isLoading: boolean;
  typingUsers: string[];
  broadcastTyping: (userName?: string) => void;
  setActiveChannelId: (id: string) => void;
  sendMessage: (content: string, parentId?: string | null, linkedTicketNumber?: string | null) => Promise<boolean>;
  createChannel: (name: string, topic?: string, isPrivate?: boolean) => Promise<TeamChannel | null>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  openThread: (message: ChannelMessage) => void;
  closeThread: () => void;
  refreshMessages: () => Promise<void>;
}

const TeamChatContext = createContext<TeamChatContextType | undefined>(undefined);

export const TeamChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentWorkspace, currentUser } = useApp();
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [activeChannelId, setActiveChannelIdState] = useState<string>('chan-general');
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [activeThreadMessage, setActiveThreadMessage] = useState<ChannelMessage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const wsId = currentWorkspace?.id || 'ws-demo-01';

  // 1. Fetch channels for workspace
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels?workspace_id=${wsId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          // Set initial channel if not set or not matching
          if (!data.channels.some((c: TeamChannel) => c.id === activeChannelId)) {
            setActiveChannelIdState(data.channels[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('[TeamChatContext] Channels fetch fallback', err);
    }
  }, [wsId, activeChannelId]);

  // 2. Fetch messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/channels/${activeChannelId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.warn('[TeamChatContext] Messages fetch error', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeChannelId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Presence & Typing indicator simulation for collaborative channels
  useEffect(() => {
    if (typeof window === 'undefined' || !activeChannelId) return;
    const typers = ['Taylor Chen', 'Sarah Jenkins', 'Elena Rostova'];
    const timer = setTimeout(() => {
      const chosen = typers[Math.floor(Math.random() * typers.length)];
      setTypingUsers([chosen]);
      const clearTimer = setTimeout(() => {
        setTypingUsers([]);
      }, 3500);
      return () => clearTimeout(clearTimer);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeChannelId]);

  const broadcastTyping = useCallback((userName?: string) => {
    // Local typing action hook
  }, []);

  const activeChannel = useMemo(() => {
    return channels.find((c) => c.id === activeChannelId) || null;
  }, [channels, activeChannelId]);

  const threadMessages = useMemo(() => {
    if (!activeThreadMessage) return [];
    return messages.filter((m) => m.parent_id === activeThreadMessage.id);
  }, [messages, activeThreadMessage]);

  const setActiveChannelId = useCallback((id: string) => {
    setActiveChannelIdState(id);
    setActiveThreadMessage(null);
  }, []);

  const openThread = useCallback((msg: ChannelMessage) => {
    setActiveThreadMessage(msg);
  }, []);

  const closeThread = useCallback(() => {
    setActiveThreadMessage(null);
  }, []);

  // 3. Send message with optimistic update
  const sendMessage = useCallback(
    async (content: string, parentId?: string | null, linkedTicketNumber?: string | null): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !activeChannelId) return false;

      const currentUserName = currentUser?.full_name || 'Team Member';
      const currentUserAvatar = currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      const tempId = `msg-temp-${Date.now()}`;
      const optimisticMsg: ChannelMessage = {
        id: tempId,
        channel_id: activeChannelId,
        workspace_id: wsId,
        user_id: currentUser?.id || 'usr-local',
        user_name: currentUserName,
        user_avatar: currentUserAvatar,
        content: trimmed,
        parent_id: parentId || null,
        linked_ticket_number: linkedTicketNumber || null,
        reactions: [],
        reply_count: 0,
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setMessages((prev) => [...prev, optimisticMsg]);
      playClickSound();

      try {
        const res = await fetch(`/api/channels/${activeChannelId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: wsId,
            user_id: currentUser?.id,
            user_name: currentUserName,
            user_avatar: currentUserAvatar,
            content: trimmed,
            parent_id: parentId || null,
            linked_ticket_number: linkedTicketNumber || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.message) {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
            playCompleteSound();
            return true;
          }
        }
      } catch (err) {
        console.error('[TeamChatContext] Send message error', err);
      }

      return true;
    },
    [activeChannelId, wsId, currentUser]
  );

  // 4. Create channel
  const createChannel = useCallback(
    async (name: string, topic?: string, isPrivate?: boolean): Promise<TeamChannel | null> => {
      if (!name.trim()) return null;
      try {
        const res = await fetch('/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: wsId,
            name,
            topic: topic || '',
            is_private: Boolean(isPrivate),
            created_by: currentUser?.full_name || 'Team Member',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.channel) {
            setChannels((prev) => [...prev, data.channel]);
            setActiveChannelIdState(data.channel.id);
            playCompleteSound();
            return data.channel;
          }
        }
      } catch (err) {
        console.error('[TeamChatContext] Create channel error', err);
      }
      return null;
    },
    [wsId, currentUser]
  );

  // 5. Toggle reaction
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const currentUserName = currentUser?.full_name || 'Team Member';

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = [...(msg.reactions || [])];
          const existing = reactions.find((r) => r.emoji === emoji);

          if (existing) {
            if (existing.users.includes(currentUserName)) {
              existing.users = existing.users.filter((u) => u !== currentUserName);
              existing.count -= 1;
              if (existing.count <= 0) {
                return {
                  ...msg,
                  reactions: reactions.filter((r) => r.emoji !== emoji),
                };
              }
            } else {
              existing.users.push(currentUserName);
              existing.count += 1;
            }
            return { ...msg, reactions };
          } else {
            return {
              ...msg,
              reactions: [...reactions, { emoji, count: 1, users: [currentUserName] }],
            };
          }
        })
      );

      playTransitionSound();
    },
    [currentUser]
  );

  const value = useMemo(
    () => ({
      channels,
      activeChannelId,
      activeChannel,
      messages: messages.filter((m) => !m.parent_id), // root messages in channel feed
      activeThreadMessage,
      threadMessages,
      isLoading,
      typingUsers,
      broadcastTyping,
      setActiveChannelId,
      sendMessage,
      createChannel,
      toggleReaction,
      openThread,
      closeThread,
      refreshMessages: fetchMessages,
    }),
    [
      channels,
      activeChannelId,
      activeChannel,
      messages,
      activeThreadMessage,
      threadMessages,
      isLoading,
      typingUsers,
      broadcastTyping,
      setActiveChannelId,
      sendMessage,
      createChannel,
      toggleReaction,
      openThread,
      closeThread,
      fetchMessages,
    ]
  );

  return <TeamChatContext.Provider value={value}>{children}</TeamChatContext.Provider>;
};

export function useTeamChat(): TeamChatContextType {
  const context = useContext(TeamChatContext);
  if (!context) {
    throw new Error('useTeamChat must be used within a TeamChatProvider');
  }
  return context;
}

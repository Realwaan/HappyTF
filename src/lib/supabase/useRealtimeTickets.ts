'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from './client';
import { BoardItem, UserProfile } from '@/types';

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  color: string;
  status: 'active' | 'idle';
  activeBoardId?: string | null;
  activeItemId?: string | null;
  activeItemTitle?: string | null;
  onlineAt: string;
  isSimulated?: boolean;
}

export interface CollaboratorNotification {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userColor: string;
  action: 'join' | 'leave' | 'view' | 'claim' | 'status_change';
  message: string;
  timestamp: string;
}

export const USER_COLORS: Record<string, string> = {
  'usr-demo-001': '#3ecf8e', // Emerald
  'usr-002': '#3b82f6',      // Blue
  'usr-003': '#ec4899',      // Pink
  'usr-004': '#8b5cf6',      // Purple
  'usr-005': '#f59e0b',      // Amber
  'usr-006': '#06b6d4',      // Cyan
};

export function getUserColor(userId: string): string {
  if (USER_COLORS[userId]) return USER_COLORS[userId];
  const palette = ['#3ecf8e', '#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981', '#6366f1'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export const SIMULATED_TEAMMATES: PresenceUser[] = [
  {
    id: 'usr-002',
    name: 'Taylor Chen',
    email: 'taylor.chen@happytf.dev',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'Senior Frontend Engineer',
    color: '#3b82f6',
    status: 'active',
    onlineAt: new Date().toISOString(),
    isSimulated: true,
  },
  {
    id: 'usr-003',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@happytf.dev',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'UX Research Lead',
    color: '#ec4899',
    status: 'active',
    onlineAt: new Date().toISOString(),
    isSimulated: true,
  },
  {
    id: 'usr-004',
    name: 'Marcus Vance',
    email: 'marcus.vance@happytf.dev',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'VP Product Strategy',
    color: '#8b5cf6',
    status: 'active',
    onlineAt: new Date().toISOString(),
    isSimulated: true,
  },
  {
    id: 'usr-005',
    name: 'Elena Rostova',
    email: 'elena.rostova@happytf.dev',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'Staff DevOps & SRE',
    color: '#f59e0b',
    status: 'active',
    onlineAt: new Date().toISOString(),
    isSimulated: true,
  },
];

interface UseRealtimeTicketsProps {
  workspaceId: string | null;
  boardId: string | null;
  currentUser?: UserProfile | null;
  activeItemId?: string | null;
  activeItemTitle?: string | null;
  onTicketInsert?: (ticket: BoardItem) => void;
  onTicketUpdate?: (ticket: BoardItem) => void;
  onTicketDelete?: (ticketId: string) => void;
}

export function useRealtimeTickets({
  workspaceId,
  boardId,
  currentUser,
  activeItemId,
  activeItemTitle,
  onTicketInsert,
  onTicketUpdate,
  onTicketDelete,
}: UseRealtimeTicketsProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [notifications, setNotifications] = useState<CollaboratorNotification[]>([]);
  const [simulatedUsers, setSimulatedUsers] = useState<PresenceUser[]>([]);

  // Unique session ID to distinguish tabs even if same user is logged in
  const sessionIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? `${currentUser?.id || 'usr'}-${Math.random().toString(36).substring(2, 8)}`
      : 'srv-session'
  );

  const channelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Construct current user's presence payload
  const currentPresence: PresenceUser = {
    id: currentUser?.id || 'usr-demo-001',
    name: currentUser?.full_name || 'Alex Rivera',
    email: currentUser?.email || 'alex.rivera@happytf.dev',
    avatar: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: currentUser?.job_role || 'Lead Product Architect',
    color: getUserColor(currentUser?.id || 'usr-demo-001'),
    status: 'active',
    activeBoardId: boardId,
    activeItemId: activeItemId || null,
    activeItemTitle: activeItemTitle || null,
    onlineAt: new Date().toISOString(),
  };

  const addNotification = useCallback((notif: Omit<CollaboratorNotification, 'id' | 'timestamp'>) => {
    const newNotif: CollaboratorNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: 'Just now',
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
    }, 4500);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Broadcast an action to all connected users
  const broadcastAction = useCallback(
    (action: 'join' | 'leave' | 'view' | 'claim' | 'status_change', message: string, metadata?: any) => {
      const payload = {
        sessionId: sessionIdRef.current,
        user: currentPresence,
        action,
        message,
        metadata,
        timestamp: new Date().toISOString(),
      };

      // 1. Send via Supabase Realtime Broadcast if connected
      if (channelRef.current && isConnected) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'collaborator_action',
            payload,
          });
        } catch {}
      }

      // 2. Send via browser BroadcastChannel (cross-tab local sync)
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'COLLABORATOR_ACTION',
            payload,
          });
        } catch {}
      }
    },
    [currentPresence, isConnected]
  );

  // Simulate a teammate joining
  const simulateCollaboratorJoin = useCallback(
    (teammate: PresenceUser) => {
      setSimulatedUsers((prev) => {
        if (prev.some((u) => u.id === teammate.id)) return prev;
        return [...prev, { ...teammate, onlineAt: new Date().toISOString(), isSimulated: true }];
      });

      addNotification({
        userId: teammate.id,
        userName: teammate.name,
        userAvatar: teammate.avatar,
        userColor: teammate.color,
        action: 'join',
        message: `${teammate.name} (${teammate.role}) joined the board`,
      });
    },
    [addNotification]
  );

  // Simulate a teammate leaving
  const simulateCollaboratorLeave = useCallback(
    (userId: string) => {
      setSimulatedUsers((prev) => {
        const leaving = prev.find((u) => u.id === userId);
        if (leaving) {
          addNotification({
            userId: leaving.id,
            userName: leaving.name,
            userAvatar: leaving.avatar,
            userColor: leaving.color,
            action: 'leave',
            message: `${leaving.name} left the board`,
          });
        }
        return prev.filter((u) => u.id !== userId);
      });
    },
    [addNotification]
  );

  // Main Realtime Effect (Supabase + BroadcastChannel)
  useEffect(() => {
    if (!boardId) return;

    let crossTabUsers: Record<string, PresenceUser> = {};

    // -------------------------------------------------------------
    // 1. Cross-Tab Browser BroadcastChannel (Instant Local Multi-Tab)
    // -------------------------------------------------------------
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`happytf_presence_${boardId}`);
        broadcastChannelRef.current = bc;

        bc.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (!payload) return;

          if (payload.sessionId === sessionIdRef.current) return; // Ignore self

          if (type === 'PRESENCE_ANNOUNCE' || type === 'PRESENCE_HEARTBEAT') {
            crossTabUsers[payload.sessionId] = payload.user;
            syncAllOnlineUsers();

            if (type === 'PRESENCE_ANNOUNCE') {
              addNotification({
                userId: payload.user.id,
                userName: payload.user.name,
                userAvatar: payload.user.avatar,
                userColor: payload.user.color,
                action: 'join',
                message: `${payload.user.name} joined via another tab`,
              });
              // Respond so the new tab knows about us
              bc?.postMessage({
                type: 'PRESENCE_HEARTBEAT',
                payload: {
                  sessionId: sessionIdRef.current,
                  user: currentPresence,
                },
              });
            }
          } else if (type === 'PRESENCE_LEAVE') {
            const leaving = crossTabUsers[payload.sessionId];
            if (leaving) {
              addNotification({
                userId: leaving.id,
                userName: leaving.name,
                userAvatar: leaving.avatar,
                userColor: leaving.color,
                action: 'leave',
                message: `${leaving.name} left the board`,
              });
              delete crossTabUsers[payload.sessionId];
              syncAllOnlineUsers();
            }
          } else if (type === 'COLLABORATOR_ACTION') {
            addNotification({
              userId: payload.user.id,
              userName: payload.user.name,
              userAvatar: payload.user.avatar,
              userColor: payload.user.color,
              action: payload.action,
              message: payload.message,
            });
          }
        };

        // Announce presence to other tabs
        bc.postMessage({
          type: 'PRESENCE_ANNOUNCE',
          payload: {
            sessionId: sessionIdRef.current,
            user: currentPresence,
          },
        });
      } catch (err) {
        console.warn('BroadcastChannel presence fallback unavailable', err);
      }
    }

    // Helper to merge all user sources: Current User + Cross-tab users + Supabase presence users + Simulated users
    let supabasePresenceList: PresenceUser[] = [];

    const syncAllOnlineUsers = () => {
      const mergedMap = new Map<string, PresenceUser>();

      // 1. Current user
      mergedMap.set(currentPresence.id, currentPresence);

      // 2. Cross tab users
      Object.values(crossTabUsers).forEach((u) => {
        mergedMap.set(u.id, u);
      });

      // 3. Supabase presence users
      supabasePresenceList.forEach((u) => {
        if (u.id) mergedMap.set(u.id, u);
      });

      // 4. Simulated users
      simulatedUsers.forEach((u) => {
        mergedMap.set(u.id, u);
      });

      setOnlineUsers(Array.from(mergedMap.values()));
    };

    // Initial sync
    syncAllOnlineUsers();

    // -------------------------------------------------------------
    // 2. Supabase Realtime Channel (Global Multi-Device WebSockets)
    // -------------------------------------------------------------
    if (isSupabaseConfigured() && workspaceId && boardId) {
      try {
        const supabase = createClient();
        const channelName = `realtime:board:${boardId}`;

        const channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: sessionIdRef.current,
            },
          },
        });
        channelRef.current = channel;

        // Presence Listeners
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const list: PresenceUser[] = [];
            Object.values(state).forEach((entries: any) => {
              if (Array.isArray(entries)) {
                entries.forEach((entry: any) => {
                  if (entry.id && entry.id !== currentPresence.id) {
                    list.push(entry);
                  }
                });
              }
            });
            supabasePresenceList = list;
            syncAllOnlineUsers();
            setLastSyncTime(new Date());
          })
          .on('presence', { event: 'join' }, ({ newPresences }: any) => {
            if (Array.isArray(newPresences)) {
              newPresences.forEach((p: PresenceUser) => {
                if (p.id && p.id !== currentPresence.id) {
                  addNotification({
                    userId: p.id,
                    userName: p.name || 'Collaborator',
                    userAvatar: p.avatar || '',
                    userColor: p.color || '#3ecf8e',
                    action: 'join',
                    message: `${p.name || 'A teammate'} joined the board`,
                  });
                }
              });
            }
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
            if (Array.isArray(leftPresences)) {
              leftPresences.forEach((p: PresenceUser) => {
                if (p.id && p.id !== currentPresence.id) {
                  addNotification({
                    userId: p.id,
                    userName: p.name || 'Collaborator',
                    userAvatar: p.avatar || '',
                    userColor: p.color || '#3ecf8e',
                    action: 'leave',
                    message: `${p.name || 'A teammate'} left the board`,
                  });
                }
              });
            }
          })
          .on('broadcast', { event: 'collaborator_action' }, ({ payload }: any) => {
            if (payload && payload.sessionId !== sessionIdRef.current) {
              addNotification({
                userId: payload.user?.id || 'usr',
                userName: payload.user?.name || 'Collaborator',
                userAvatar: payload.user?.avatar || '',
                userColor: payload.user?.color || '#3ecf8e',
                action: payload.action,
                message: payload.message,
              });
            }
          })
          // Postgres Changes for Tickets
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'tickets',
              filter: `board_id=eq.${boardId}`,
            },
            (payload) => {
              setLastSyncTime(new Date());
              if (onTicketInsert && payload.new) {
                onTicketInsert(payload.new as unknown as BoardItem);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tickets',
              filter: `board_id=eq.${boardId}`,
            },
            (payload) => {
              setLastSyncTime(new Date());
              if (onTicketUpdate && payload.new) {
                onTicketUpdate(payload.new as unknown as BoardItem);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'tickets',
              filter: `board_id=eq.${boardId}`,
            },
            (payload) => {
              setLastSyncTime(new Date());
              if (onTicketDelete && payload.old) {
                onTicketDelete(payload.old.id);
              }
            }
          )
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setLastSyncTime(new Date());
              // Track current presence
              try {
                await channel.track(currentPresence);
              } catch (trackErr) {
                console.warn('Presence track error:', trackErr);
              }
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setIsConnected(false);
            }
          });
      } catch (err) {
        console.warn('Supabase Realtime setup warning:', err);
      }
    } else {
      // Local fallback mode: connected locally via BroadcastChannel
      setIsConnected(true);
      setLastSyncTime(new Date());
    }

    return () => {
      // Announce leave via BroadcastChannel
      if (bc) {
        try {
          bc.postMessage({
            type: 'PRESENCE_LEAVE',
            payload: {
              sessionId: sessionIdRef.current,
            },
          });
          bc.close();
        } catch {}
      }

      // Untrack and unsubscribe Supabase channel
      if (channelRef.current) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channelRef.current);
        } catch {}
      }
    };
  }, [
    workspaceId,
    boardId,
    currentUser?.id,
    currentUser?.full_name,
    simulatedUsers,
    onTicketInsert,
    onTicketUpdate,
    onTicketDelete,
    addNotification,
  ]);

  return {
    isConnected,
    lastSyncTime,
    onlineUsers,
    activeUserCount: onlineUsers.length,
    notifications,
    dismissNotification,
    broadcastAction,
    simulateCollaboratorJoin,
    simulateCollaboratorLeave,
    simulatedUsers,
    currentPresence,
  };
}

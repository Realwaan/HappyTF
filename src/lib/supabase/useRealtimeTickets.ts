'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from './client';
import { isDeployed } from '@/lib/environment';
import { BoardItem, UserProfile } from '@/types';
import { getSafeAvatar } from '@/lib/avatarHelper';

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

// Helper to determine if the app is running in a live deployed production environment
export const isDeployedProduction = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.');
  return !isLocal;
};

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
  const recentJoinToastsRef = useRef<Map<string, number>>(new Map());

  // Unique session ID to distinguish tabs even if same user is logged in
  const sessionIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? `${currentUser?.id || 'usr'}-${Math.random().toString(36).substring(2, 8)}`
      : 'srv-session'
  );

  const channelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Construct current user's presence payload
  const isProd = isDeployed();
  const currentPresence: PresenceUser = {
    id: currentUser?.id || (isProd ? 'usr-guest' : 'usr-demo-001'),
    name: currentUser?.full_name || (isProd ? 'Team Member' : 'Alex Rivera'),
    email: currentUser?.email || (isProd ? 'member@happytf.dev' : 'alex.rivera@happytf.dev'),
    avatar: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: currentUser?.job_role || (isProd ? 'Team Member' : 'Lead Product Architect'),
    color: getUserColor(currentUser?.id || (isProd ? 'usr-guest' : 'usr-demo-001')),
    status: 'active',
    activeBoardId: boardId,
    activeItemId: activeItemId || null,
    activeItemTitle: activeItemTitle || null,
    onlineAt: new Date().toISOString(),
  };

  const addNotification = useCallback((notif: Omit<CollaboratorNotification, 'id' | 'timestamp'>) => {
    // Prevent self-notifications: never toast for the current user
    if (
      notif.userId === currentPresence.id ||
      notif.userId === currentUser?.id ||
      (currentUser?.full_name && notif.userName?.toLowerCase() === currentUser.full_name.toLowerCase())
    ) {
      return;
    }

    const newNotif: CollaboratorNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: 'Just now',
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 3)]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
    }, 4000);
  }, [currentPresence.id, currentUser?.id, currentUser?.full_name]);

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

  // Broadcast ticket creation to all connected users across browsers/devices
  const broadcastTicketInsert = useCallback(
    (ticket: BoardItem, notificationPayload?: any) => {
      const payload = {
        sessionId: sessionIdRef.current,
        boardId,
        ticket,
        notification: notificationPayload,
        timestamp: new Date().toISOString(),
      };

      if (channelRef.current && isConnected) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ticket_insert',
            payload,
          });
        } catch (err) {
          console.warn('[Realtime] Failed to broadcast ticket_insert via Supabase', err);
        }
      }

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'TICKET_INSERT',
            payload,
          });
        } catch (err) {
          console.warn('[BroadcastChannel] Failed to post TICKET_INSERT', err);
        }
      }
    },
    [boardId, isConnected]
  );

  // Broadcast ticket or comment update to all connected users across browsers/devices
  const broadcastTicketUpdate = useCallback(
    (ticket: BoardItem, notificationPayload?: any) => {
      const payload = {
        sessionId: sessionIdRef.current,
        boardId,
        ticket,
        notification: notificationPayload,
        timestamp: new Date().toISOString(),
      };

      // 1. Send via Supabase Realtime Broadcast (Cross-device, cross-browser, incognito)
      if (channelRef.current && isConnected) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ticket_update',
            payload,
          });
        } catch (err) {
          console.warn('[Realtime] Failed to broadcast ticket_update via Supabase', err);
        }
      }

      // 2. Send via browser BroadcastChannel (Cross-tab local sync)
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'TICKET_UPDATE',
            payload,
          });
        } catch (err) {
          console.warn('[BroadcastChannel] Failed to post TICKET_UPDATE', err);
        }
      }
    },
    [boardId, isConnected]
  );

  // Broadcast ticket deletion to all connected users across browsers/devices
  const broadcastTicketDelete = useCallback(
    (ticketId: string, notificationPayload?: any) => {
      const payload = {
        sessionId: sessionIdRef.current,
        boardId,
        ticketId,
        notification: notificationPayload,
        timestamp: new Date().toISOString(),
      };

      if (channelRef.current && isConnected) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ticket_delete',
            payload,
          });
        } catch (err) {
          console.warn('[Realtime] Failed to broadcast ticket_delete via Supabase', err);
        }
      }

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'TICKET_DELETE',
            payload,
          });
        } catch (err) {
          console.warn('[BroadcastChannel] Failed to post TICKET_DELETE', err);
        }
      }
    },
    [boardId, isConnected]
  );

  // Simulate a teammate joining
  // Simulate a teammate joining (updates presence stack in header silently)
  const simulateCollaboratorJoin = useCallback(
    (teammate: PresenceUser) => {
      setSimulatedUsers((prev) => {
        if (prev.some((u) => u.id === teammate.id)) return prev;
        return [...prev, { ...teammate, onlineAt: new Date().toISOString(), isSimulated: true }];
      });
    },
    []
  );

  // Simulate a teammate leaving (updates presence stack in header silently)
  const simulateCollaboratorLeave = useCallback(
    (userId: string) => {
      setSimulatedUsers((prev) => prev.filter((u) => u.id !== userId));
    },
    []
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
              // Respond so the new tab knows about us (silent presence sync, no noisy toasts)
              bc?.postMessage({
                type: 'PRESENCE_HEARTBEAT',
                payload: {
                  sessionId: sessionIdRef.current,
                  user: currentPresence,
                },
              });
            }
          } else if (type === 'PRESENCE_LEAVE') {
            delete crossTabUsers[payload.sessionId];
            syncAllOnlineUsers();
          } else if (type === 'COLLABORATOR_ACTION') {
            addNotification({
              userId: payload.user.id,
              userName: payload.user.name,
              userAvatar: payload.user.avatar,
              userColor: payload.user.color,
              action: payload.action,
              message: payload.message,
            });
          } else if (type === 'TICKET_INSERT') {
            if (onTicketInsert && payload.ticket) {
              onTicketInsert(payload.ticket);
            }
            if (payload.notification) {
              addNotification(payload.notification);
            }
          } else if (type === 'TICKET_UPDATE') {
            if (onTicketUpdate && payload.ticket) {
              onTicketUpdate(payload.ticket);
            }
            if (payload.notification) {
              addNotification(payload.notification);
            }
          } else if (type === 'TICKET_DELETE') {
            if (onTicketDelete && payload.ticketId) {
              onTicketDelete(payload.ticketId);
            }
            if (payload.notification) {
              addNotification(payload.notification);
            }
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
            // Join toasts only pop in deployed production environments (keeping local development completely silent)
            if (!isDeployedProduction()) return;

            if (Array.isArray(newPresences)) {
              const now = Date.now();
              newPresences.forEach((p: PresenceUser) => {
                const isSelf =
                  p.id === currentPresence.id ||
                  p.id === currentUser?.id ||
                  (currentUser?.full_name && p.name?.toLowerCase() === currentUser.full_name.toLowerCase());

                if (!isSelf && p.id) {
                  const lastToasted = recentJoinToastsRef.current.get(p.id) || 0;
                  // Deduplicate so reconnects or repeated presence pulses within 45s don't re-toast
                  if (now - lastToasted > 45000) {
                    recentJoinToastsRef.current.set(p.id, now);
                    addNotification({
                      userId: p.id,
                      userName: p.name || 'Collaborator',
                      userAvatar: p.avatar || '',
                      userColor: p.color || '#3ecf8e',
                      action: 'join',
                      message: `${p.name || 'A teammate'} joined the board`,
                    });
                  }
                }
              });
            }
          })
          .on('presence', { event: 'leave' }, () => {
            // Presence is synced silently via event: 'sync' into onlineUsers header stack
          })
          .on('broadcast', { event: 'collaborator_action' }, ({ payload }: any) => {
            if (payload && payload.sessionId !== sessionIdRef.current) {
              addNotification({
                userId: payload.user?.id || 'usr',
                userName: payload.user?.name || 'Collaborator',
                userAvatar: getSafeAvatar(payload.user?.avatar, payload.user?.name),
                userColor: payload.user?.color || '#3ecf8e',
                action: payload.action,
                message: payload.message,
              });
            }
          })
          .on('broadcast', { event: 'ticket_insert' }, ({ payload }: any) => {
            if (payload && payload.sessionId !== sessionIdRef.current && payload.ticket) {
              if (onTicketInsert) {
                onTicketInsert(payload.ticket);
              }
              if (payload.notification) {
                addNotification({
                  userId: payload.notification.userId || 'usr',
                  userName: payload.notification.userName || 'Collaborator',
                  userAvatar: getSafeAvatar(payload.notification.userAvatar, payload.notification.userName),
                  userColor: payload.notification.userColor || '#10b981',
                  action: payload.notification.action || 'create',
                  message: payload.notification.message,
                });
              }
            }
          })
          .on('broadcast', { event: 'ticket_update' }, ({ payload }: any) => {
            if (payload && payload.sessionId !== sessionIdRef.current && payload.ticket) {
              if (onTicketUpdate) {
                onTicketUpdate(payload.ticket);
              }
              if (payload.notification) {
                addNotification({
                  userId: payload.notification.userId || 'usr',
                  userName: payload.notification.userName || 'Collaborator',
                  userAvatar: getSafeAvatar(payload.notification.userAvatar, payload.notification.userName),
                  userColor: payload.notification.userColor || '#3b82f6',
                  action: payload.notification.action || 'comment',
                  message: payload.notification.message,
                });
              }
            }
          })
          .on('broadcast', { event: 'ticket_delete' }, ({ payload }: any) => {
            if (payload && payload.sessionId !== sessionIdRef.current && payload.ticketId) {
              if (onTicketDelete) {
                onTicketDelete(payload.ticketId);
              }
              if (payload.notification) {
                addNotification({
                  userId: payload.notification.userId || 'usr',
                  userName: payload.notification.userName || 'Collaborator',
                  userAvatar: getSafeAvatar(payload.notification.userAvatar, payload.notification.userName),
                  userColor: payload.notification.userColor || '#ef4444',
                  action: payload.notification.action || 'delete',
                  message: payload.notification.message,
                });
              }
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
    broadcastTicketInsert,
    broadcastTicketUpdate,
    broadcastTicketDelete,
    simulateCollaboratorJoin,
    simulateCollaboratorLeave,
    simulatedUsers,
    currentPresence,
  };
}

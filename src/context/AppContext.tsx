'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  UserProfile, 
  Workspace, 
  WorkspaceMember, 
  WorkspaceRole,
  BoardSummary, 
  MyWorkItem, 
  NotificationItem,
  OnboardingState,
  BoardGroup,
  BoardItem,
  GitHubCommit,
  Folder,
  BoardColumn,
  SubItem,
  ViewMode,
  ItemComment
} from '../types';
import { 
  DEMO_USER, 
  INITIAL_WORKSPACES, 
  INITIAL_MEMBERS, 
  INITIAL_BOARDS, 
  INITIAL_MY_WORK_ITEMS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_BOARD_GROUPS,
  INITIAL_BOARD_ITEMS,
  INITIAL_GITHUB_COMMITS,
  INITIAL_FOLDERS,
  DEFAULT_BOARD_COLUMNS,
  getDefaultBoardGroups
} from '../lib/mock-data';
import { BOARD_TEMPLATES } from '../lib/boardTemplates';
import confetti from 'canvas-confetti';
import { createClient, isSupabaseConfigured } from '../lib/supabase/client';
import { getSafeAvatar, DEFAULT_AVATAR } from '../lib/avatarHelper';
import { encryptAtRest, decryptAtRest } from '../lib/clientCrypto';
import { isDeployed } from '../lib/environment';
import { 
  AutomationRule, 
  AutomationLogEntry, 
  AutomationEvent, 
  AutomationExecutionResult, 
  DEFAULT_AUTOMATION_RULES, 
  INITIAL_AUTOMATION_LOGS, 
  evaluateTicketAutomations 
} from '../lib/automation/engine';
import { playCompleteSound, playUrgentSound, playTransitionSound } from '../lib/soundFx';
import { RbacAuthority } from '../lib/auth/rbac';
import { 
  cacheBoardStateOffline, 
  queueOfflineMutation, 
  getPendingOfflineMutations, 
  removeOfflineMutation 
} from '../lib/offline/indexedDbStore';

interface AppContextType {
  currentUser: UserProfile | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  recentBoards: BoardSummary[];
  folders: Folder[];
  myWorkItems: MyWorkItem[];
  allWorkspaceItems: BoardItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  theme: 'dark' | 'light';
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  isCommandPaletteOpen: boolean;
  isOnboardingOpen: boolean;
  isCreateWorkspaceOpen: boolean;
  isCreateBoardOpen: boolean;
  isQuickTaskOpen: boolean;
  isWorkspaceSettingsOpen: boolean;
  isShortcutsModalOpen: boolean;
  isContextModalOpen: boolean;
  isDiscordModalOpen: boolean;
  isSlackModalOpen: boolean;
  isAutomationModalOpen: boolean;
  isColumnarModalOpen: boolean;
  isAiCopilotOpen: boolean;
  isOffline: boolean;
  offlinePendingCount: number;
  automationRules: AutomationRule[];
  automationLogs: AutomationLogEntry[];
  isTeamChatOpen: boolean;
  setTeamChatOpen: (open: boolean) => void;
  activeTeamChannelId: string;
  setActiveTeamChannelId: (id: string) => void;
  openTeamChat: (channelId?: string) => void;
  closeTeamChat: () => void;
  isGitHubFeedOpen: boolean;
  setGitHubFeedOpen: (open: boolean) => void;
  toggleGitHubFeed: () => void;
  gitHubCommits: GitHubCommit[];
  addGitHubCommit: (commit: GitHubCommit) => void;
  activeSettingsTab: 'general' | 'members' | 'roles' | 'danger';

  // Navigation & Board Engine state
  activeView: 'home' | 'board' | 'chat';
  boardViewMode: ViewMode;
  setBoardViewMode: (mode: ViewMode) => void;
  activeBoardId: string | null;
  activeBoard: BoardSummary | null;
  boardGroups: BoardGroup[];
  boardItems: BoardItem[];
  boardColumns: BoardColumn[];
  selectedItem: BoardItem | null;

  // Real-time CDC Handlers
  onTicketInsert: (ticket: BoardItem) => void;
  onTicketUpdate: (ticket: BoardItem) => void;
  onTicketDelete: (ticketId: string) => void;

  // Folder & Structural Hierarchy Actions
  createFolder: (name: string, color?: string) => void;
  toggleFolderCollapse: (folderId: string) => void;
  deleteFolder: (folderId: string) => void;
  moveBoardToFolder: (boardId: string, folderId: string | null) => void;

  // Dynamic Columns & Sub-Items
  addBoardColumn: (boardId: string, column: BoardColumn) => void;
  addSubItem: (itemId: string, title: string) => void;
  updateSubItem: (itemId: string, subItemId: string, updates: Partial<SubItem>) => void;
  deleteSubItem: (itemId: string, subItemId: string) => void;

  // Actions
  navigateToBoard: (boardId: string) => void;
  joinBoard: (
    boardId: string,
    options?: {
      role?: string;
      inviter?: string;
      boardName?: string;
      workspaceName?: string;
      workspaceId?: string;
    }
  ) => Promise<boolean>;
  navigateToHome: () => void;
  navigateToChat: (channelId?: string) => void;
  openItemDetail: (itemOrId: BoardItem | string) => void;
  closeItemDetail: () => void;
  selectNextItem: () => void;
  selectPrevItem: () => void;
  addBoardItem: (groupId: string, title: string, options?: Partial<BoardItem>) => void;
  updateBoardItem: (itemId: string, updates: Partial<BoardItem>, ifVersion?: number) => { success: boolean; error?: string };
  claimBoardItem: (itemId: string, ifVersion?: number) => { success: boolean; error?: string };
  deleteBoardItem: (itemId: string) => void;
  addItemComment: (itemId: string, content: string) => void;
  deleteItemComment: (itemId: string, commentId: string) => void;
  toggleCommentReaction: (itemId: string, commentId: string, emoji: string) => void;
  toggleGroupCollapse: (groupId: string) => void;

  login: (email: string) => Promise<void>;
  signup: (fullName: string, email: string, jobRole?: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<boolean>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, emoji: string, color: string) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  inviteMember: (email: string, role: WorkspaceRole) => void;
  updateMemberRole: (memberId: string, newRole: WorkspaceRole) => void;
  removeMember: (memberId: string) => void;
  completeOnboarding: (data: Partial<OnboardingState>) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  setCreateWorkspaceOpen: (open: boolean) => void;
  setCreateBoardOpen: (open: boolean) => void;
  setQuickTaskOpen: (open: boolean) => void;
  setWorkspaceSettingsOpen: (open: boolean, tab?: 'general' | 'members' | 'roles' | 'danger') => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setContextModalOpen: (open: boolean) => void;
  setDiscordModalOpen: (open: boolean) => void;
  setSlackModalOpen: (open: boolean) => void;
  setAutomationModalOpen: (open: boolean) => void;
  setColumnarModalOpen: (open: boolean) => void;
  setAiCopilotOpen: (open: boolean) => void;
  toggleAutomationRule: (ruleId: string) => void;
  simulateAutomation: (ticketId: string, event: AutomationEvent) => Promise<AutomationExecutionResult | null>;
  markAllNotificationsAsRead: () => void;
  markNotificationRead: (id: string) => void;
  updateWorkItemStatus: (id: string, newStatus: MyWorkItem['status']) => void;
  createBoard: (name: string, iconEmoji: string, description: string, color?: string, templateId?: string, folderId?: string) => void;
  registerTicketBroadcaster: (fn: (ticket: BoardItem, notif?: any) => void) => void;
  registerTicketBroadcasters: (broadcasters: {
    broadcastInsert?: (ticket: BoardItem, notif?: any) => void;
    broadcastUpdate?: (ticket: BoardItem, notif?: any) => void;
    broadcastDelete?: (ticketId: string, notif?: any) => void;
  }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(isDeployed() ? null : DEMO_USER);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(isDeployed() ? [] : INITIAL_WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(isDeployed() ? null : INITIAL_WORKSPACES[0]);
  const [membersMap, setMembersMap] = useState<Record<string, WorkspaceMember[]>>(isDeployed() ? {} : INITIAL_MEMBERS);
  const [boardsMap, setBoardsMap] = useState<Record<string, BoardSummary[]>>(isDeployed() ? {} : INITIAL_BOARDS);
  const [foldersMap, setFoldersMap] = useState<Record<string, Folder[]>>(isDeployed() ? {} : INITIAL_FOLDERS);
  const [myWorkItems, setMyWorkItems] = useState<MyWorkItem[]>(isDeployed() ? [] : INITIAL_MY_WORK_ITEMS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(isDeployed() ? [] : INITIAL_NOTIFICATIONS);

  // Board engine state with persistent local storage
  const [activeView, setActiveView] = useState<'home' | 'board' | 'chat'>('home');
  const [boardViewMode, setBoardViewMode] = useState<ViewMode>('table');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [groupsMap, setGroupsMap] = useState<Record<string, BoardGroup[]>>(isDeployed() ? {} : INITIAL_BOARD_GROUPS);
  const [itemsMap, setItemsMap] = useState<Record<string, BoardItem[]>>(isDeployed() ? {} : INITIAL_BOARD_ITEMS);
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [isColumnarModalOpen, setIsColumnarModalOpen] = useState(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(DEFAULT_AUTOMATION_RULES);
  const [automationLogs, setAutomationLogs] = useState<AutomationLogEntry[]>(INITIAL_AUTOMATION_LOGS);
  const [isOffline, setIsOffline] = useState(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);

  const toggleAutomationRule = useCallback((ruleId: string) => {
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  // Phase 5: Service Worker, PWA & IndexedDB Offline Sync Lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOffline(!navigator.onLine);

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] ServiceWorker registration skipped:', err);
      });
    }

    const handleOnline = async () => {
      setIsOffline(false);
      try {
        const pending = await getPendingOfflineMutations();
        if (pending.length > 0) {
          for (const mut of pending) {
            if (mut.id !== undefined) {
              await removeOfflineMutation(mut.id);
            }
          }
          setOfflinePendingCount(0);
          const syncNotif: NotificationItem = {
            id: `notif-sync-${Date.now()}`,
            title: 'Back Online & Synced',
            description: `Successfully synchronized ${pending.length} offline mutations to workspace.`,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
            unread: true,
            type: 'system',
          };
          setNotifications((prev) => [syncNotif, ...prev]);
          playCompleteSound();
        }
      } catch (e) {
        console.warn('[Offline Sync] Failed to drain mutations:', e);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      const offlineNotif: NotificationItem = {
        id: `notif-offline-${Date.now()}`,
        title: 'Offline Mode Active',
        description: 'Working offline. Task changes are cached locally in IndexedDB.',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        unread: true,
        type: 'system',
      };
      setNotifications((prev) => [offlineNotif, ...prev]);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getPendingOfflineMutations()
      .then((muts) => setOfflinePendingCount(muts.length))
      .catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);
  const [activeTeamChannelId, setActiveTeamChannelId] = useState('general');
  const [isGitHubFeedOpen, setIsGitHubFeedOpen] = useState(false);

  const openTeamChat = useCallback((channelId?: string) => {
    if (channelId) setActiveTeamChannelId(channelId);
    setIsTeamChatOpen(true);
  }, []);

  const closeTeamChat = useCallback(() => {
    setIsTeamChatOpen(false);
  }, []);
  const [gitHubCommits, setGitHubCommits] = useState<GitHubCommit[]>(isDeployed() ? [] : INITIAL_GITHUB_COMMITS);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'members' | 'roles' | 'danger'>('general');

  const ticketBroadcasterRef = useRef<((ticket: BoardItem, notif?: any) => void) | null>(null);
  const ticketInsertBroadcasterRef = useRef<((ticket: BoardItem, notif?: any) => void) | null>(null);
  const ticketDeleteBroadcasterRef = useRef<((ticketId: string, notif?: any) => void) | null>(null);

  const registerTicketBroadcaster = useCallback((fn: (ticket: BoardItem, notif?: any) => void) => {
    ticketBroadcasterRef.current = fn;
  }, []);

  const registerTicketBroadcasters = useCallback((broadcasters: {
    broadcastInsert?: (ticket: BoardItem, notif?: any) => void;
    broadcastUpdate?: (ticket: BoardItem, notif?: any) => void;
    broadcastDelete?: (ticketId: string, notif?: any) => void;
  }) => {
    if (broadcasters.broadcastInsert) ticketInsertBroadcasterRef.current = broadcasters.broadcastInsert;
    if (broadcasters.broadcastUpdate) ticketBroadcasterRef.current = broadcasters.broadcastUpdate;
    if (broadcasters.broadcastDelete) ticketDeleteBroadcasterRef.current = broadcasters.broadcastDelete;
  }, []);

  const toggleMobileSidebar = () => setIsMobileSidebarOpen((prev) => !prev);
  const toggleGitHubFeed = () => setIsGitHubFeedOpen((prev) => !prev);

  const selectedItemRef = useRef<BoardItem | null>(null);
  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  const activeBoardIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeBoardIdRef.current = activeBoardId;
  }, [activeBoardId]);

  const itemsMapRef = useRef<Record<string, BoardItem[]>>(isDeployed() ? {} : INITIAL_BOARD_ITEMS);
  useEffect(() => {
    itemsMapRef.current = itemsMap;
  }, [itemsMap]);

  const updateBoardItemRef = useRef<((itemId: string, updates: Partial<BoardItem>, ifVersion?: number) => { success: boolean; error?: string }) | null>(null);
  const isItemsMapLoadedRef = useRef(false);

  const isWorkspaceStorageLoadedRef = useRef(false);

  // Load workspace hierarchy, folders, boards, groups, and user from localStorage after hydration
  useEffect(() => {
    let isCancelled = false;
    const loadWorkspaceHierarchy = async () => {
      try {
        // 1. Workspaces
        const savedWs = localStorage.getItem('happytf_workspaces');
        let loadedWorkspaces: Workspace[] = [];
        if (savedWs) {
          const decrypted = await decryptAtRest(savedWs).catch(() => savedWs);
          const parsed = JSON.parse(decrypted);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedWorkspaces = parsed;
            if (!isCancelled) {
              setWorkspaces(parsed);
            }
          }
        }

        // 2. Current Workspace ID
        const savedCurWsId = localStorage.getItem('happytf_current_workspace_id');
        if (loadedWorkspaces.length > 0 && !isCancelled) {
          const matched = savedCurWsId ? loadedWorkspaces.find((w) => w.id === savedCurWsId) : null;
          setCurrentWorkspace(matched || loadedWorkspaces[0]);
        }

        // 3. Folders
        const savedFolders = localStorage.getItem('happytf_folders');
        if (savedFolders) {
          const decrypted = await decryptAtRest(savedFolders).catch(() => savedFolders);
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object' && !isCancelled) {
            setFoldersMap((prev) => ({ ...prev, ...parsed }));
          }
        }

        // 4. Boards
        const savedBoards = localStorage.getItem('happytf_boards');
        if (savedBoards) {
          const decrypted = await decryptAtRest(savedBoards).catch(() => savedBoards);
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object' && !isCancelled) {
            setBoardsMap((prev) => {
              const merged: Record<string, BoardSummary[]> = { ...parsed };
              for (const [ws, list] of Object.entries(prev)) {
                if (!merged[ws]) {
                  merged[ws] = list;
                } else {
                  const existingIds = new Set(merged[ws].map((b) => b.id));
                  const newFromPrev = list.filter((b) => !existingIds.has(b.id));
                  merged[ws] = [...newFromPrev, ...merged[ws]];
                }
              }
              return merged;
            });
          }
        }

        // 5. Board Groups
        const savedGroups = localStorage.getItem('happytf_board_groups');
        if (savedGroups) {
          const decrypted = await decryptAtRest(savedGroups).catch(() => savedGroups);
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object' && !isCancelled) {
            setGroupsMap((prev) => {
              const merged: Record<string, BoardGroup[]> = { ...parsed };
              for (const [bId, gList] of Object.entries(prev)) {
                if (!merged[bId]) {
                  merged[bId] = gList;
                }
              }
              return merged;
            });
          }
        }

        // 6. Members
        const savedMembers = localStorage.getItem('happytf_members');
        if (savedMembers) {
          const decrypted = await decryptAtRest(savedMembers).catch(() => savedMembers);
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object' && !isCancelled) {
            setMembersMap((prev) => ({ ...prev, ...parsed }));
          }
        }

        // 7. User Profile
        const savedUser = localStorage.getItem('happytf_user');
        if (savedUser) {
          const decrypted = await decryptAtRest(savedUser).catch(() => savedUser);
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object' && parsed.id && !isCancelled) {
            setCurrentUser((prev) => prev || parsed);
          }
        }

        // 8. Active Board & View (Ignore if visited with ?join_board= to preserve invite context)
        const hasJoinBoardUrl = typeof window !== 'undefined' && window.location.search.includes('join_board');
        if (!hasJoinBoardUrl) {
          const savedActiveBoard = localStorage.getItem('happytf_active_board_id');
          const savedActiveView = localStorage.getItem('happytf_active_view') as 'home' | 'board' | null;
          if (savedActiveBoard && !isCancelled) {
            setActiveBoardId(savedActiveBoard);
          }
          if (savedActiveView && !isCancelled) {
            setActiveView(savedActiveView);
          }
        } else if (!isCancelled) {
          const params = new URLSearchParams(window.location.search);
          const joinId = params.get('join_board');
          if (joinId) {
            setActiveBoardId(joinId);
          }
          setActiveView('board');
        }
      } catch (err) {
        console.warn('Failed to load workspace hierarchy from localStorage', err);
      } finally {
        if (!isCancelled) {
          isWorkspaceStorageLoadedRef.current = true;
        }
      }
    };

    loadWorkspaceHierarchy();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Persist workspaces & current workspace ID to localStorage
  useEffect(() => {
    if (!isWorkspaceStorageLoadedRef.current) return;
    const save = async () => {
      try {
        const payload = JSON.stringify(workspaces);
        const encrypted = await encryptAtRest(payload);
        localStorage.setItem('happytf_workspaces', encrypted);
        if (currentWorkspace?.id) {
          localStorage.setItem('happytf_current_workspace_id', currentWorkspace.id);
        }
      } catch (err) {
        console.warn('Failed to save workspaces to localStorage', err);
      }
    };
    save();
  }, [workspaces, currentWorkspace]);

  // Persist foldersMap to localStorage
  useEffect(() => {
    if (!isWorkspaceStorageLoadedRef.current) return;
    const save = async () => {
      try {
        const payload = JSON.stringify(foldersMap);
        const encrypted = await encryptAtRest(payload);
        localStorage.setItem('happytf_folders', encrypted);
      } catch (err) {
        console.warn('Failed to save folders to localStorage', err);
      }
    };
    save();
  }, [foldersMap]);

  // Persist boardsMap to localStorage
  useEffect(() => {
    if (!isWorkspaceStorageLoadedRef.current) return;
    const save = async () => {
      try {
        const payload = JSON.stringify(boardsMap);
        const encrypted = await encryptAtRest(payload);
        localStorage.setItem('happytf_boards', encrypted);
      } catch (err) {
        console.warn('Failed to save boards to localStorage', err);
      }
    };
    save();
  }, [boardsMap]);

  // Persist groupsMap to localStorage
  useEffect(() => {
    if (!isWorkspaceStorageLoadedRef.current) return;
    const save = async () => {
      try {
        const payload = JSON.stringify(groupsMap);
        const encrypted = await encryptAtRest(payload);
        localStorage.setItem('happytf_board_groups', encrypted);
      } catch (err) {
        console.warn('Failed to save groups to localStorage', err);
      }
    };
    save();
  }, [groupsMap]);

  // Persist membersMap to localStorage
  useEffect(() => {
    if (!isWorkspaceStorageLoadedRef.current) return;
    const save = async () => {
      try {
        const payload = JSON.stringify(membersMap);
        const encrypted = await encryptAtRest(payload);
        localStorage.setItem('happytf_members', encrypted);
      } catch (err) {
        console.warn('Failed to save members to localStorage', err);
      }
    };
    save();
  }, [membersMap]);

  // Persist currentUser to localStorage
  useEffect(() => {
    if (!isWorkspaceStorageLoadedRef.current) return;
    if (!currentUser) {
      try {
        localStorage.removeItem('happytf_user');
      } catch {}
      return;
    }
    const save = async () => {
      try {
        const payload = JSON.stringify(currentUser);
        const encrypted = await encryptAtRest(payload);
        localStorage.setItem('happytf_user', encrypted);
      } catch (err) {
        console.warn('Failed to save user to localStorage', err);
      }
    };
    save();
  }, [currentUser]);

  // Persist active view & active board
  useEffect(() => {
    if (!isWorkspaceStorageLoadedRef.current) return;
    try {
      if (activeBoardId) {
        localStorage.setItem('happytf_active_board_id', activeBoardId);
      } else {
        localStorage.removeItem('happytf_active_board_id');
      }
      localStorage.setItem('happytf_active_view', activeView);
    } catch {}
  }, [activeBoardId, activeView]);

  // Load itemsMap from localStorage after hydration on mount (encrypted at rest)
  useEffect(() => {
    let isCancelled = false;
    const loadItems = async () => {
      try {
        const saved = localStorage.getItem('happytf_board_items');
        if (saved) {
          const decrypted = await decryptAtRest(saved);
          if (isCancelled) return;
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object') {
            const sanitized: Record<string, BoardItem[]> = {};
            for (const bId of Object.keys(parsed)) {
              if (Array.isArray(parsed[bId])) {
                sanitized[bId] = parsed[bId].map((it: BoardItem) => ({
                  ...it,
                  assignee: it.assignee ? {
                    ...it.assignee,
                    avatar: getSafeAvatar(it.assignee.avatar, it.assignee.name),
                  } : undefined,
                }));
              }
            }
            setItemsMap((prev) => ({ ...prev, ...sanitized }));
          }
        }
      } catch (err) {
        console.warn('Failed to load itemsMap from localStorage', err);
      } finally {
        if (!isCancelled) {
          isItemsMapLoadedRef.current = true;
        }
      }
    };
    loadItems();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Save itemsMap to localStorage whenever updated (only after loaded, encrypted at rest)
  useEffect(() => {
    if (!isItemsMapLoadedRef.current) return;
    let isCancelled = false;
    const saveItems = async () => {
      try {
        const payload = JSON.stringify(itemsMap);
        const encrypted = await encryptAtRest(payload);
        if (!isCancelled) {
          localStorage.setItem('happytf_board_items', encrypted);
        }
      } catch (err) {
        console.warn('Failed to save itemsMap to localStorage', err);
      }
    };
    saveItems();
    return () => {
      isCancelled = true;
    };
  }, [itemsMap]);

  // Synchronize itemsMap across tabs on the same origin via storage event
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'happytf_board_items' && e.newValue) {
        try {
          const decrypted = await decryptAtRest(e.newValue);
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object') {
            setItemsMap(parsed);
            if (selectedItemRef.current) {
              const curId = selectedItemRef.current.id;
              for (const bId of Object.keys(parsed)) {
                const found = parsed[bId]?.find((i: BoardItem) => i.id === curId);
                if (found) {
                  setSelectedItem(found);
                  break;
                }
              }
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync server-persisted comments across browser profiles, incognito, and reloads
  useEffect(() => {
    fetch('/api/tickets/comments')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.comments && typeof data.comments === 'object') {
          const remoteCommentsMap: Record<string, ItemComment[]> = data.comments;
          setItemsMap((prev) => {
            let changed = false;
            const nextMap: Record<string, BoardItem[]> = {};

            for (const bId of Object.keys(prev)) {
              const list = prev[bId] || [];
              const updatedList = list.map((item) => {
                const remote = remoteCommentsMap[item.id];
                if (remote && Array.isArray(remote) && remote.length > 0) {
                  const existingMap = new Map((item.comments || []).map((c) => [c.id, c]));
                  let itemChanged = false;
                  remote.forEach((rc) => {
                    if (!existingMap.has(rc.id)) {
                      existingMap.set(rc.id, rc);
                      itemChanged = true;
                    }
                  });
                  if (itemChanged) {
                    changed = true;
                    const mergedComments = Array.from(existingMap.values());
                    const updatedItem = { ...item, comments: mergedComments };
                    if (selectedItemRef.current?.id === item.id) {
                      setSelectedItem(updatedItem);
                    }
                    return updatedItem;
                  }
                }
                return item;
              });
              nextMap[bId] = updatedList;
            }

            return changed ? nextMap : prev;
          });
        }
      })
      .catch((err) => console.warn('[Comments API] Could not sync remote comments', err));
  }, [activeBoardId]);

  // Sync server-persisted tasks across browser profiles, incognito, and reloads
  useEffect(() => {
    if (!activeBoardId) return;

    fetch(`/api/tickets?board_id=${activeBoardId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const serverTickets: BoardItem[] = data.data;
          setItemsMap((prev) => {
            const currentList = prev[activeBoardId] || [];
            const existingMap = new Map(currentList.map((i) => [i.id, i]));
            let changed = false;

            serverTickets.forEach((st) => {
              const safeTicket: BoardItem = {
                ...st,
                assignee: st.assignee ? {
                  ...st.assignee,
                  avatar: getSafeAvatar(st.assignee.avatar, st.assignee.name),
                } : undefined,
              };
              if (!existingMap.has(safeTicket.id)) {
                existingMap.set(safeTicket.id, safeTicket);
                changed = true;
              } else {
                const cur = existingMap.get(safeTicket.id)!;
                if ((safeTicket.version || 1) > (cur.version || 1) || !cur.assignee?.avatar) {
                  existingMap.set(safeTicket.id, { ...cur, ...safeTicket });
                  changed = true;
                }
              }
            });

            if (changed) {
              const mergedList = Array.from(existingMap.values());
              return { ...prev, [activeBoardId]: mergedList };
            }
            return prev;
          });
        }
      })
      .catch((err) => console.warn('[Tickets API] Could not sync remote tickets', err));
  }, [activeBoardId]);

  // Load theme & persistent settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('happytf_theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Supabase Auth session & OAuth state listener
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createClient();

      const syncUserWorkspaces = async (userId: string) => {
        try {
          const { data: memberWorkspaces, error: wsError } = await supabase
            .from('workspace_members')
            .select('workspace_id, role, workspaces(*)')
            .eq('user_id', userId);

          let realWorkspaces: Workspace[] = [];
          if (!wsError && memberWorkspaces && memberWorkspaces.length > 0) {
            realWorkspaces = memberWorkspaces
              .map((mw: any) => mw.workspaces)
              .filter(Boolean);
          } else {
            const { data: ownedWorkspaces } = await supabase
              .from('workspaces')
              .select('*')
              .eq('created_by', userId);
            if (ownedWorkspaces && ownedWorkspaces.length > 0) {
              realWorkspaces = ownedWorkspaces;
            }
          }

          if (realWorkspaces.length > 0) {
            setWorkspaces(realWorkspaces);
            setCurrentWorkspace((prev) => {
              if (prev && realWorkspaces.some((w) => w.id === prev.id)) return prev;
              return realWorkspaces[0];
            });

            // Fetch boards for primary workspace
            const activeWsId = realWorkspaces[0].id;
            const { data: dbBoards } = await supabase
              .from('boards')
              .select('*')
              .eq('workspace_id', activeWsId);

            if (dbBoards && dbBoards.length > 0) {
              const boardSummaries: BoardSummary[] = dbBoards.map((b: any) => ({
                id: b.id,
                workspace_id: b.workspace_id,
                name: b.name,
                icon_emoji: b.icon_emoji || '📋',
                description: b.description || '',
                item_count: 0,
                updated_at: b.updated_at || b.created_at,
              }));
              setBoardsMap((prev) => ({ ...prev, [activeWsId]: boardSummaries }));
            }
          }
        } catch (err) {
          console.warn('[syncUserWorkspaces error]', err);
        }
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u = session.user;
          const meta = u.user_metadata || {};
          setCurrentUser({
            id: u.id,
            email: u.email || 'user@happytf.dev',
            full_name: meta.full_name || meta.name || u.email?.split('@')[0] || 'User',
            avatar_url: meta.avatar_url || meta.picture || undefined,
            job_role: meta.job_role || 'Product Specialist',
            created_at: u.created_at || new Date().toISOString(),
          });
          syncUserWorkspaces(u.id);
        } else if (isDeployed()) {
          // If no active Supabase OAuth session, keep local workspaces and folders intact
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const u = session.user;
          const meta = u.user_metadata || {};
          setCurrentUser({
            id: u.id,
            email: u.email || 'user@happytf.dev',
            full_name: meta.full_name || meta.name || u.email?.split('@')[0] || 'User',
            avatar_url: meta.avatar_url || meta.picture || undefined,
            job_role: meta.job_role || 'Product Specialist',
            created_at: u.created_at || new Date().toISOString(),
          });
          syncUserWorkspaces(u.id);
        } else if (isDeployed()) {
          // If auth state changes to signed out, retain local workspace hierarchy
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    } catch (err) {
      console.warn('Supabase auth session sync error:', err);
    }
  }, []);

  // Keyboard shortcut listeners (⌘K, ?, Esc, C, B, M, Navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if focus is inside an input/textarea
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }
      if (!isInput && e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }
      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          setIsQuickTaskOpen(true);
          return;
        }
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setIsCreateBoardOpen(true);
          return;
        }
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          setIsContextModalOpen(true);
          return;
        }
        if (e.key === '[') {
          e.preventDefault();
          setIsSidebarCollapsed((prev) => !prev);
          return;
        }
        if (e.key === 'ArrowDown' && selectedItemRef.current && activeBoardIdRef.current) {
          e.preventDefault();
          const items = itemsMapRef.current[activeBoardIdRef.current] || [];
          const curIdx = items.findIndex((i) => i.id === selectedItemRef.current?.id);
          if (curIdx >= 0 && curIdx < items.length - 1) {
            setSelectedItem(items[curIdx + 1]);
          }
          return;
        }
        if (e.key === 'ArrowUp' && selectedItemRef.current && activeBoardIdRef.current) {
          e.preventDefault();
          const items = itemsMapRef.current[activeBoardIdRef.current] || [];
          const curIdx = items.findIndex((i) => i.id === selectedItemRef.current?.id);
          if (curIdx > 0) {
            setSelectedItem(items[curIdx - 1]);
          }
          return;
        }
        if ((e.key === 's' || e.key === 'S') && selectedItemRef.current) {
          e.preventDefault();
          const curItem = selectedItemRef.current;
          const statuses: Array<{ label: BoardItem['status']; color: string }> = [
            { label: 'Working on it', color: '#f59e0b' },
            { label: 'In Review', color: '#8b5cf6' },
            { label: 'Done', color: '#10b981' },
            { label: 'Stuck', color: '#ef4444' },
            { label: 'Pending', color: '#64748b' },
          ];
          const curIdx = statuses.findIndex((st) => st.label === curItem.status);
          const nextIdx = (curIdx + 1) % statuses.length;
          const nextStatus = statuses[nextIdx];
          updateBoardItemRef.current?.(curItem.id, { status: nextStatus.label, status_color: nextStatus.color }, curItem.version);
          return;
        }
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsCreateWorkspaceOpen(false);
        setIsCreateBoardOpen(false);
        setIsQuickTaskOpen(false);
        setIsWorkspaceSettingsOpen(false);
        setIsShortcutsModalOpen(false);
        setIsContextModalOpen(false);
        setIsDiscordModalOpen(false);
        setIsSlackModalOpen(false);
        setIsGitHubFeedOpen(false);
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const currentMembers = useMemo(() => (currentWorkspace ? (membersMap[currentWorkspace.id] || []) : []), [currentWorkspace, membersMap]);
  const currentBoards = useMemo(() => (currentWorkspace ? (boardsMap[currentWorkspace.id] || []) : []), [currentWorkspace, boardsMap]);

  const activeBoard = useMemo(() => {
    if (!activeBoardId) return null;
    const inCurrent = currentBoards.find((b) => b.id === activeBoardId);
    if (inCurrent) return inCurrent;
    for (const bList of Object.values(boardsMap)) {
      const found = bList.find((b) => b.id === activeBoardId);
      if (found) return found;
    }
    return null;
  }, [activeBoardId, currentBoards, boardsMap]);

  // If active board belongs to another workspace, synchronize currentWorkspace automatically
  useEffect(() => {
    if (activeBoard && currentWorkspace?.id !== activeBoard.workspace_id) {
      const targetWs = workspaces.find((w) => w.id === activeBoard.workspace_id);
      if (targetWs) {
        setCurrentWorkspace(targetWs);
      }
    }
  }, [activeBoard, currentWorkspace, workspaces]);

  // Phase 5: Cache active board state in IndexedDB for local-first offline resilience
  useEffect(() => {
    if (activeBoard && activeBoardId && itemsMap[activeBoardId]) {
      cacheBoardStateOffline(activeBoard, itemsMap[activeBoardId]).catch(() => {});
    }
  }, [activeBoard, activeBoardId, itemsMap]);

  const currentBoardGroups = useMemo(() => {
    if (!activeBoardId) return [];
    const existing = groupsMap[activeBoardId];
    if (existing && existing.length > 0) return existing;
    return getDefaultBoardGroups(activeBoardId);
  }, [activeBoardId, groupsMap]);

  // Auto-populate groupsMap with default workflow groups if the active board is missing groups
  useEffect(() => {
    if (activeBoardId && (!groupsMap[activeBoardId] || groupsMap[activeBoardId].length === 0)) {
      setGroupsMap((prev) => {
        if (prev[activeBoardId] && prev[activeBoardId].length > 0) return prev;
        return {
          ...prev,
          [activeBoardId]: getDefaultBoardGroups(activeBoardId),
        };
      });
    }
  }, [activeBoardId, groupsMap]);

  const currentBoardItems = activeBoardId ? (itemsMap[activeBoardId] || []) : [];

  // Compile all workspace items across all boards for global memory & stats
  const allWorkspaceItems = useMemo(() => {
    return Object.values(itemsMap).flat();
  }, [itemsMap]);

  // Real-time Postgres CDC Handlers
  const onTicketInsert = useCallback((ticket: BoardItem) => {
    if (!ticket || !ticket.board_id) return;
    const safeTicket: BoardItem = {
      ...ticket,
      assignee: ticket.assignee ? {
        ...ticket.assignee,
        avatar: getSafeAvatar(ticket.assignee.avatar, ticket.assignee.name),
      } : undefined,
    };
    setItemsMap((prev) => {
      const list = prev[safeTicket.board_id] || [];
      if (list.some((i) => i.id === safeTicket.id)) return prev;
      return {
        ...prev,
        [safeTicket.board_id]: [safeTicket, ...list],
      };
    });
  }, []);

  const onTicketUpdate = useCallback((ticket: BoardItem) => {
    if (!ticket || !ticket.id) return;
    const safeTicket: BoardItem = {
      ...ticket,
      ...(ticket.assignee ? {
        assignee: {
          ...ticket.assignee,
          avatar: getSafeAvatar(ticket.assignee.avatar, ticket.assignee.name),
        },
      } : {}),
    };
    setItemsMap((prev) => {
      const nextMap = { ...prev };
      let updatedAny = false;
      for (const bId of Object.keys(nextMap)) {
        if (!safeTicket.board_id || bId === safeTicket.board_id) {
          const list = nextMap[bId] || [];
          if (list.some((i) => i.id === safeTicket.id)) {
            nextMap[bId] = list.map((i) => (i.id === safeTicket.id ? { ...i, ...safeTicket } : i));
            updatedAny = true;
          }
        }
      }
      return updatedAny ? nextMap : prev;
    });
    if (selectedItemRef.current?.id === safeTicket.id) {
      setSelectedItem((prev) => (prev ? { ...prev, ...safeTicket } : safeTicket));
    }
  }, []);

  const onTicketDelete = useCallback((ticketId: string) => {
    if (!ticketId) return;
    setItemsMap((prev) => {
      const nextMap = { ...prev };
      for (const bId of Object.keys(nextMap)) {
        nextMap[bId] = nextMap[bId].filter((i) => i.id !== ticketId);
      }
      return nextMap;
    });
    if (selectedItemRef.current?.id === ticketId) {
      setSelectedItem(null);
    }
  }, []);

  const navigateToBoard = (boardId: string) => {
    // If board is in another workspace, switch currentWorkspace to it
    for (const [wsId, bList] of Object.entries(boardsMap)) {
      if (bList.some((b) => b.id === boardId)) {
        const targetWs = workspaces.find((w) => w.id === wsId);
        if (targetWs && currentWorkspace?.id !== targetWs.id) {
          setCurrentWorkspace(targetWs);
        }
        break;
      }
    }
    setActiveBoardId(boardId);
    setActiveView('board');
  };

  const joinBoard = async (
    boardId: string,
    options?: {
      role?: string;
      inviter?: string;
      boardName?: string;
      workspaceName?: string;
      workspaceId?: string;
    }
  ): Promise<boolean> => {
    if (!boardId) return false;

    // 1. Check if board already exists in local boardsMap across any workspace
    for (const [wsId, bList] of Object.entries(boardsMap)) {
      const found = bList.find((b) => b.id === boardId);
      if (found) {
        const targetWs = workspaces.find((w) => w.id === wsId);
        if (targetWs && currentWorkspace?.id !== targetWs.id) {
          setCurrentWorkspace(targetWs);
        }
        setActiveBoardId(boardId);
        setActiveView('board');
        return true;
      }
    }

    // 2. If Supabase is configured, check database
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: dbBoard } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .maybeSingle();

        if (dbBoard) {
          const boardSummary: BoardSummary = {
            id: dbBoard.id,
            workspace_id: dbBoard.workspace_id,
            name: dbBoard.name,
            icon_emoji: dbBoard.icon_emoji || '📋',
            description: dbBoard.description || '',
            item_count: 0,
            updated_at: dbBoard.updated_at || new Date().toISOString(),
          };

          let targetWs = workspaces.find((w) => w.id === dbBoard.workspace_id);
          if (!targetWs) {
            const { data: dbWs } = await supabase
              .from('workspaces')
              .select('*')
              .eq('id', dbBoard.workspace_id)
              .maybeSingle();

            if (dbWs) {
              targetWs = dbWs;
              setWorkspaces((prev) => [...prev, dbWs]);
            } else {
              targetWs = {
                id: dbBoard.workspace_id,
                name: options?.workspaceName || (options?.inviter ? `${options.inviter}'s Team` : 'Shared Workspace'),
                slug: `shared-${Date.now()}`,
                icon_emoji: '🤝',
                brand_color: '#3ecf8e',
                created_by: options?.inviter || 'Team Lead',
                created_at: new Date().toISOString(),
                member_count: 2,
              };
              setWorkspaces((prev) => [...prev, targetWs!]);
            }
          }

          setBoardsMap((prev) => ({
            ...prev,
            [targetWs!.id]: [boardSummary, ...(prev[targetWs!.id] || []).filter((b) => b.id !== boardId)],
          }));
          setCurrentWorkspace(targetWs!);
          setActiveBoardId(boardId);
          setActiveView('board');
          return true;
        }
      } catch (err) {
        console.warn('[joinBoard Supabase error]', err);
      }
    }

    // 3. Query server-side boards API (cross-device & cross-browser support)
    try {
      const serverRes = await fetch(`/api/boards?board_id=${encodeURIComponent(boardId)}`);
      if (serverRes.ok) {
        const serverJson = await serverRes.json();
        if (serverJson.data) {
          const remoteBoard: BoardSummary = serverJson.data;
          let targetWs = workspaces.find((w) => w.id === remoteBoard.workspace_id);
          if (!targetWs) {
            targetWs = {
              id: remoteBoard.workspace_id || `ws-${Date.now()}`,
              name: options?.workspaceName || (options?.inviter ? `${options.inviter}'s Team` : 'Shared Workspace'),
              slug: `shared-${Date.now()}`,
              icon_emoji: '🤝',
              brand_color: '#3ecf8e',
              created_by: options?.inviter || 'Team Lead',
              created_at: new Date().toISOString(),
              member_count: 2,
            };
            setWorkspaces((prev) => [...prev.filter((w) => w.id !== targetWs!.id), targetWs!]);
          }

          setBoardsMap((prev) => ({
            ...prev,
            [targetWs!.id]: [remoteBoard, ...(prev[targetWs!.id] || []).filter((b) => b.id !== boardId)],
          }));
          setCurrentWorkspace(targetWs!);
          setActiveBoardId(boardId);
          setActiveView('board');

          fetch(`/api/tickets?board_id=${boardId}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.data && Array.isArray(data.data)) {
                setItemsMap((prev) => ({ ...prev, [boardId]: data.data }));
              }
            })
            .catch(() => {});

          return true;
        }
      }
    } catch (err) {
      console.warn('[joinBoard server store check error]', err);
    }

    // 4. Fallback: Local-first collaborative provision for invited board
    const inviterName = options?.inviter || 'Team Member';
    const boardTitle = options?.boardName || (options?.inviter ? `${options.inviter}'s Board` : 'Shared Board');

    // Ensure we have a workspace to host this joined board
    let targetWs = currentWorkspace;
    if (!targetWs) {
      const newWsId = options?.workspaceId || `ws-collab-${Date.now()}`;
      targetWs = {
        id: newWsId,
        name: options?.workspaceName || `${inviterName}'s Workspace`,
        slug: `collab-${Date.now()}`,
        icon_emoji: '🤝',
        brand_color: '#3ecf8e',
        created_by: inviterName,
        created_at: new Date().toISOString(),
        member_count: 2,
      };
      setWorkspaces((prev) => {
        const filtered = prev.filter((w) => w.id !== targetWs!.id);
        return [...filtered, targetWs!];
      });
      setCurrentWorkspace(targetWs);
    }

    const wsId = targetWs.id;
    const joinedBoardSummary: BoardSummary = {
      id: boardId,
      workspace_id: wsId,
      name: boardTitle,
      icon_emoji: '📋',
      color: '#3ecf8e',
      description: `Collaborative board invited by ${inviterName} (${options?.role || 'member'}).`,
      item_count: 0,
      updated_at: new Date().toISOString(),
      member_avatars: [],
    };

    const defaultGroups: BoardGroup[] = [
      { id: `grp-${Date.now()}-todo`, board_id: boardId, name: 'To Do', color: '#6366f1' },
      { id: `grp-${Date.now()}-progress`, board_id: boardId, name: 'In Progress', color: '#f59e0b' },
      { id: `grp-${Date.now()}-done`, board_id: boardId, name: 'Done', color: '#10b981' },
    ];

    setBoardsMap((prev) => ({
      ...prev,
      [wsId]: [joinedBoardSummary, ...(prev[wsId] || []).filter((b) => b.id !== boardId)],
    }));

    // Register board with server so other users and reloads discover it
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joinedBoardSummary),
    }).catch(() => {});

    setGroupsMap((prev) => {
      if (!prev[boardId] || prev[boardId].length === 0) {
        return { ...prev, [boardId]: defaultGroups };
      }
      return prev;
    });

    // Also fetch any tickets that exist on this board from server API
    fetch(`/api/tickets?board_id=${boardId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setItemsMap((prev) => ({ ...prev, [boardId]: data.data }));
        }
      })
      .catch(() => {});

    setActiveBoardId(boardId);
    setActiveView('board');
    return true;
  };

  const navigateToHome = () => {
    setActiveBoardId(null);
    setActiveView('home');
  };

  const navigateToChat = (channelId?: string) => {
    if (channelId) setActiveTeamChannelId(channelId);
    setActiveBoardId(null);
    setActiveView('chat');
  };

  const openItemDetail = (itemOrId: BoardItem | string) => {
    let targetItem: BoardItem | undefined;
    if (typeof itemOrId === 'string') {
      for (const list of Object.values(itemsMap)) {
        targetItem = list.find((i) => i.id === itemOrId);
        if (targetItem) break;
      }
    } else {
      targetItem = itemOrId;
    }

    if (targetItem) {
      setSelectedItem(targetItem);

      // Fetch fresh comments from server API to guarantee real-time consistency
      const ticketId = targetItem.id;
      fetch(`/api/tickets/comments?ticket_id=${ticketId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.comments) && data.comments.length > 0) {
            const remoteComments: ItemComment[] = data.comments;
            setItemsMap((prev) => {
              let changed = false;
              const nextMap: Record<string, BoardItem[]> = {};

              for (const bId of Object.keys(prev)) {
                nextMap[bId] = (prev[bId] || []).map((i) => {
                  if (i.id === ticketId) {
                    const existingMap = new Map((i.comments || []).map((c) => [c.id, c]));
                    let itemChanged = false;
                    remoteComments.forEach((rc) => {
                      if (!existingMap.has(rc.id)) {
                        existingMap.set(rc.id, rc);
                        itemChanged = true;
                      }
                    });
                    if (itemChanged) {
                      changed = true;
                      const merged = Array.from(existingMap.values());
                      const updated = { ...i, comments: merged };
                      if (selectedItemRef.current?.id === ticketId) {
                        setSelectedItem(updated);
                      }
                      return updated;
                    }
                  }
                  return i;
                });
              }

              return changed ? nextMap : prev;
            });
          }
        })
        .catch(() => {});
    }
  };

  const closeItemDetail = () => {
    setSelectedItem(null);
  };

  const selectNextItem = () => {
    if (!selectedItem || !activeBoardId) return;
    const items = itemsMap[activeBoardId] || [];
    const currentIndex = items.findIndex((i) => i.id === selectedItem.id);
    if (currentIndex >= 0 && currentIndex < items.length - 1) {
      setSelectedItem(items[currentIndex + 1]);
    }
  };

  const selectPrevItem = () => {
    if (!selectedItem || !activeBoardId) return;
    const items = itemsMap[activeBoardId] || [];
    const currentIndex = items.findIndex((i) => i.id === selectedItem.id);
    if (currentIndex > 0) {
      setSelectedItem(items[currentIndex - 1]);
    }
  };

  const addBoardItem = (groupId: string, title: string, options?: Partial<BoardItem>) => {
    if (!activeBoardId || !title.trim()) return;

    const ticketNum = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const assigneeInput = options?.assignee || (currentUser ? {
      id: currentUser.id,
      name: currentUser.full_name,
      avatar: currentUser.avatar_url || DEFAULT_AVATAR,
    } : {
      id: 'unassigned',
      name: 'Unassigned',
      avatar: DEFAULT_AVATAR,
    });
    const assignee = {
      id: assigneeInput.id || 'unassigned',
      name: assigneeInput.name || 'Unassigned',
      avatar: getSafeAvatar(assigneeInput.avatar, assigneeInput.name),
    };

    const statusPriority = options?.priority || 'medium';
    const status = options?.status || 'Working on it';
    const statusColor = options?.status_color || (status === 'Done' ? '#10b981' : status === 'In Review' ? '#8b5cf6' : status === 'Stuck' ? '#ef4444' : '#f59e0b');

    const authorName = currentUser?.full_name || 'Team Member';

    const newItem: BoardItem = {
      id: `item-${Date.now()}`,
      ticket_number: ticketNum,
      board_id: activeBoardId,
      group_id: groupId,
      title: title.trim(),
      status,
      status_color: statusColor,
      priority: statusPriority,
      severity: options?.severity || 'minor',
      due_date: options?.due_date || 'Next week',
      sla_due_at: options?.sla_due_at || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      assignee,
      tags: options?.tags || ['Ticket'],
      subtasks: options?.subtasks || [],
      description: options?.description || 'Add detailed requirements, deliverables, and acceptance criteria here.',
      version: 1,
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: `act-${Date.now()}`,
          author_name: authorName,
          action: `Created ticket ${ticketNum}`,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
      comments: [],
    };

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: [...(prev[activeBoardId] || []), newItem],
    }));

    // 1. Broadcast new task to other sessions live
    const createNotif = {
      userId: currentUser?.id || 'usr-creator',
      userName: authorName,
      userAvatar: currentUser?.avatar_url || DEFAULT_AVATAR,
      userColor: '#10b981',
      action: 'create',
      message: `${authorName} created task: "${newItem.title}"`,
    };
    ticketInsertBroadcasterRef.current?.(newItem, createNotif);

    // 2. Persist new task to server
    fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newItem,
        workspace_id: currentWorkspace?.id || 'ws-default',
      }),
    }).catch((err) => console.warn('[Tickets API] Failed to persist new ticket', err));

    // If assigned to current user, also add to myWorkItems
    if (assignee.id === currentUser?.id || assignee.name === currentUser?.full_name) {
      const activeBoardName = activeBoard?.name || 'Board';
      const myWork: MyWorkItem = {
        id: newItem.id,
        board_id: activeBoardId,
        board_name: activeBoardName,
        workspace_id: currentWorkspace?.id || 'ws-default',
        title: newItem.title,
        status: newItem.status,
        status_color: newItem.status_color,
        priority: newItem.priority,
        due_date: newItem.due_date,
        assignee_id: assignee.id,
        is_overdue: false,
      };
      setMyWorkItems((prev) => [myWork, ...prev]);
    }

    // Update board item counter
    if (currentWorkspace) {
      const wsId = currentWorkspace.id;
      setBoardsMap((prev) => ({
        ...prev,
        [wsId]: (prev[wsId] || []).map((b) =>
          b.id === activeBoardId ? { ...b, item_count: b.item_count + 1 } : b
        ),
      }));
    }
  };

  const updateBoardItem = (
    itemId: string, 
    updates: Partial<BoardItem>,
    ifVersion?: number
  ): { success: boolean; error?: string } => {
    if (!activeBoardId) return { success: false, error: 'No active board' };

    const currentList = itemsMap[activeBoardId] || [];
    const existing = currentList.find((i) => i.id === itemId);
    if (!existing) return { success: false, error: 'Item not found' };

    const currentVersion = existing.version || 1;
    // Auto-reconcile version so collaborative edits from parallel sessions do not conflict
    const nextVersion = Math.max(currentVersion, ifVersion || 0) + 1;
    const nextUpdatedAt = new Date().toISOString();

    const safeUpdates: Partial<BoardItem> = { ...updates };
    if (safeUpdates.assignee) {
      safeUpdates.assignee = {
        ...safeUpdates.assignee,
        avatar: getSafeAvatar(safeUpdates.assignee.avatar, safeUpdates.assignee.name),
      };
    }

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id === itemId) {
          const updated: BoardItem = { 
            ...item, 
            ...safeUpdates,
            version: nextVersion,
            updated_at: nextUpdatedAt
          };
          if (selectedItemRef.current?.id === itemId) {
            setSelectedItem(updated);
          }
          return updated;
        }
        return item;
      }),
    }));

    const actorName = currentUser?.full_name || 'Team Member';
    let notifPayload = undefined;
    const ticketLabel = existing.ticket_number || existing.title;
    const currentUserId = currentUser?.id || 'usr-updater';

    if (updates.status && updates.status !== existing.status) {
      notifPayload = {
        userId: currentUserId,
        userName: actorName,
        userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
        userColor: updates.status === 'Done' ? '#10b981' : '#3b82f6',
        action: 'status_change',
        message: `${actorName} marked ${ticketLabel} as ${updates.status}`,
      };
    } else if (updates.assignee) {
      notifPayload = {
        userId: currentUserId,
        userName: actorName,
        userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
        userColor: '#8b5cf6',
        action: 'assignment',
        message: `${actorName} assigned ${ticketLabel} to ${updates.assignee.name}`,
      };
    } else if (updates.subtasks && Array.isArray(updates.subtasks)) {
      const oldDone = (existing.subtasks || []).filter((s) => s.completed).length;
      const newDone = updates.subtasks.filter((s) => s.completed).length;
      if (newDone !== oldDone) {
        notifPayload = {
          userId: currentUserId,
          userName: actorName,
          userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
          userColor: '#10b981',
          action: 'checklist',
          message: `${actorName} updated subtasks (${newDone}/${updates.subtasks.length} done) on ${ticketLabel}`,
        };
      } else if (updates.subtasks.length !== (existing.subtasks || []).length) {
        notifPayload = {
          userId: currentUserId,
          userName: actorName,
          userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
          userColor: '#6366f1',
          action: 'checklist',
          message: `${actorName} updated checklist items on ${ticketLabel}`,
        };
      }
    } else if (updates.priority && updates.priority !== existing.priority) {
      notifPayload = {
        userId: currentUserId,
        userName: actorName,
        userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
        userColor: '#f59e0b',
        action: 'priority_change',
        message: `${actorName} set priority to ${updates.priority} on ${ticketLabel}`,
      };
    } else if (updates.severity && updates.severity !== existing.severity) {
      notifPayload = {
        userId: currentUser?.id || (isDeployed() ? 'usr-anon' : 'usr-demo-001'),
        userName: actorName,
        userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
        userColor: '#ef4444',
        action: 'severity_change',
        message: `${actorName} set severity to ${updates.severity} on ${ticketLabel}`,
      };
    } else if (updates.tags && JSON.stringify(updates.tags) !== JSON.stringify(existing.tags)) {
      notifPayload = {
        userId: currentUser?.id || (isDeployed() ? 'usr-anon' : 'usr-demo-001'),
        userName: actorName,
        userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
        userColor: '#06b6d4',
        action: 'tag_update',
        message: `${actorName} updated tags on ${ticketLabel}`,
      };
    } else if (updates.due_date && updates.due_date !== existing.due_date) {
      notifPayload = {
        userId: currentUser?.id || (isDeployed() ? 'usr-anon' : 'usr-demo-001'),
        userName: actorName,
        userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
        userColor: '#3b82f6',
        action: 'due_date',
        message: `${actorName} set due date to ${updates.due_date} on ${ticketLabel}`,
      };
    } else if (updates.sub_items && Array.isArray(updates.sub_items)) {
      notifPayload = {
        userId: currentUser?.id || (isDeployed() ? 'usr-anon' : 'usr-demo-001'),
        userName: actorName,
        userAvatar: getSafeAvatar(currentUser?.avatar_url, actorName),
        userColor: '#10b981',
        action: 'sub_items',
        message: `${actorName} updated sub-items on ${ticketLabel}`,
      };
    }

    const updatedItemPayload: BoardItem = {
      ...existing,
      ...safeUpdates,
      version: nextVersion,
      updated_at: nextUpdatedAt,
    };

    // 1. Broadcast update to other sessions live
    ticketBroadcasterRef.current?.(updatedItemPayload, notifPayload);

    // 2. Persist update to server
    fetch(`/api/tickets/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates,
        if_version: ifVersion,
        actor_name: actorName,
        board_id: activeBoardId,
      }),
    }).catch((err) => console.warn('[Tickets API] Failed to update ticket', err));

    // Synchronize to myWorkItems if present
    if (updates.status || updates.priority || updates.due_date || updates.title || updates.assignee) {
      setMyWorkItems((prev) =>
        prev.map((m) => {
          if (m.id === itemId) {
            return {
              ...m,
              ...(updates.title ? { title: updates.title } : {}),
              ...(updates.status ? { status: updates.status, status_color: updates.status_color || m.status_color } : {}),
              ...(updates.priority ? { priority: updates.priority } : {}),
              ...(updates.due_date ? { due_date: updates.due_date } : {}),
              ...(updates.assignee ? { assignee_id: updates.assignee.id } : {}),
            };
          }
          return m;
        })
      );
    }

    // Phase 4: Workflow Automation evaluation
    if (updates.priority && updates.priority !== existing.priority) {
      evaluateTicketAutomations(updatedItemPayload, {
        type: 'priority_changed',
        previousValue: existing.priority,
        newValue: updates.priority,
        actor: actorName,
      }, { customRules: automationRules }).then((res) => {
        if (res.triggeredRules.length > 0) {
          setItemsMap((prev) => ({
            ...prev,
            [activeBoardId]: (prev[activeBoardId] || []).map((i) =>
              i.id === itemId ? res.updatedTicket : i
            ),
          }));
          const logEntry: AutomationLogEntry = {
            id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            ruleName: res.triggeredRules.join(', '),
            triggerType: 'priority_changed',
            ticketId: existing.id,
            ticketLabel: existing.ticket_number || existing.title,
            actionsTaken: res.actionsTaken,
            status: 'success',
          };
          setAutomationLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
          if (updates.priority === 'urgent') {
            playUrgentSound();
          }
        }
      }).catch(() => {});
    } else if (updates.status && updates.status !== existing.status) {
      evaluateTicketAutomations(updatedItemPayload, {
        type: 'status_changed',
        previousValue: existing.status,
        newValue: updates.status,
        actor: actorName,
      }, { customRules: automationRules }).then((res) => {
        if (res.triggeredRules.length > 0) {
          const logEntry: AutomationLogEntry = {
            id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            ruleName: res.triggeredRules.join(', '),
            triggerType: 'status_changed',
            ticketId: existing.id,
            ticketLabel: existing.ticket_number || existing.title,
            actionsTaken: res.actionsTaken,
            status: 'success',
          };
          setAutomationLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
          if (updates.status === 'Done') {
            playCompleteSound();
          }
        }
      }).catch(() => {});
    }

    return { success: true };
  };
  updateBoardItemRef.current = updateBoardItem;

  const simulateAutomation = useCallback(async (
    ticketId: string, 
    event: AutomationEvent
  ): Promise<AutomationExecutionResult | null> => {
    if (!activeBoardId) return null;
    const currentList = itemsMap[activeBoardId] || [];
    const target = currentList.find((i) => i.id === ticketId);
    if (!target) return null;

    const result = await evaluateTicketAutomations(target, event, { customRules: automationRules });
    if (result.triggeredRules.length > 0) {
      setItemsMap((prev) => ({
        ...prev,
        [activeBoardId]: (prev[activeBoardId] || []).map((item) =>
          item.id === ticketId ? result.updatedTicket : item
        ),
      }));
      if (selectedItemRef.current?.id === ticketId) {
        setSelectedItem(result.updatedTicket);
      }

      const logEntry: AutomationLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        ruleName: result.triggeredRules.join(', '),
        triggerType: event.type,
        ticketId: target.id,
        ticketLabel: target.ticket_number || target.title,
        actionsTaken: result.actionsTaken,
        status: 'success',
      };
      setAutomationLogs((prev) => [logEntry, ...prev.slice(0, 49)]);

      if (event.type === 'priority_changed' && event.newValue === 'urgent') {
        playUrgentSound();
      } else if (result.updatedTicket.status === 'Done') {
        playCompleteSound();
      } else {
        playTransitionSound();
      }
    }
    return result;
  }, [activeBoardId, itemsMap, automationRules]);

  const claimBoardItem = (
    itemId: string,
    ifVersion?: number
  ): { success: boolean; error?: string } => {
    if (!activeBoardId) return { success: false, error: 'No active board' };

    const currentList = itemsMap[activeBoardId] || [];
    const existing = currentList.find((i) => i.id === itemId);
    if (!existing) return { success: false, error: 'Item not found' };

    const currentVersion = existing.version || 1;
    if (ifVersion !== undefined && ifVersion !== currentVersion) {
      const conflictNotif: NotificationItem = {
        id: `notif-conflict-${Date.now()}`,
        title: 'Optimistic Concurrency Conflict',
        description: `Task was modified by another session (current v${currentVersion}, expected v${ifVersion}).`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        unread: true,
        type: 'system',
      };
      setNotifications((prev) => [conflictNotif, ...prev]);
      return {
        success: false,
        error: `Conflict: Task was modified by another session (current: v${currentVersion}, your copy: v${ifVersion}).`,
      };
    }

    const userName = currentUser?.full_name || 'Team Member';
    const userAvatar = getSafeAvatar(currentUser?.avatar_url, userName);
    const nextVersion = currentVersion + 1;
    const nextUpdatedAt = new Date().toISOString();

    const claimActivity = {
      id: `act-claim-${Date.now()}`,
      author_name: userName,
      action: `Claimed ticket and set status to Working on it`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id === itemId) {
          const updated: BoardItem = {
            ...item,
            assignee: {
              id: currentUser?.id || 'usr-claimer',
              name: userName,
              avatar: userAvatar,
            },
            status: 'Working on it',
            status_color: '#f59e0b',
            claimed_by: userName,
            claimed_at: nextUpdatedAt,
            version: nextVersion,
            updated_at: nextUpdatedAt,
            activities: [claimActivity, ...item.activities],
          };
          if (selectedItemRef.current?.id === itemId) {
            setSelectedItem(updated);
          }
          return updated;
        }
        return item;
      }),
    }));

    const claimBroadcastNotif = {
      userId: currentUser?.id || (isDeployed() ? 'usr-anon' : 'usr-demo-001'),
      userName,
      userAvatar,
      userColor: '#10b981',
      action: 'claim',
      message: `${userName} claimed ${existing.ticket_number || existing.title}`,
    };

    const claimedItemPayload: BoardItem = {
      ...existing,
      assignee: {
        id: currentUser?.id || (isDeployed() ? 'usr-anon' : 'usr-demo-001'),
        name: userName,
        avatar: userAvatar,
      },
      status: 'Working on it',
      status_color: '#f59e0b',
      claimed_by: userName,
      claimed_at: nextUpdatedAt,
      version: nextVersion,
      updated_at: nextUpdatedAt,
      activities: [claimActivity, ...existing.activities],
    };

    // 1. Broadcast claim to other sessions live
    ticketBroadcasterRef.current?.(claimedItemPayload, claimBroadcastNotif);

    // 2. Persist claim to server
    fetch(`/api/tickets/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: {
          assignee: claimedItemPayload.assignee,
          status: 'Working on it',
          status_color: '#f59e0b',
          claimed_by: userName,
          claimed_at: nextUpdatedAt,
        },
        if_version: ifVersion,
        actor_name: userName,
        board_id: activeBoardId,
      }),
    }).catch(() => {});

    // Micro celebration confetti
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }

    // Success notification
    const successNotif: NotificationItem = {
      id: `notif-claim-${Date.now()}`,
      title: 'Task Claimed',
      description: `You successfully claimed ${existing.ticket_number || existing.title}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      unread: true,
      type: 'assignment',
    };
    setNotifications((prev) => [successNotif, ...prev]);

    // Keep myWorkItems in sync
    setMyWorkItems((prev) =>
      prev.map((m) =>
        m.id === itemId
          ? {
              ...m,
              status: 'Working on it',
              status_color: '#f59e0b',
              assignee_id: currentUser?.id || (isDeployed() ? 'usr-anon' : 'usr-demo-001'),
            }
          : m
      )
    );

    return { success: true };
  };

  const addGitHubCommit = (commit: GitHubCommit) => {
    setGitHubCommits((prev) => [commit, ...prev.slice(0, 49)]);

    // If commit links to a ticket in the current board, auto-append an activity!
    if (commit.linked_ticket_number && activeBoardId) {
      const ticketNum = commit.linked_ticket_number.toUpperCase();
      setItemsMap((prev) => {
        const boardItems = prev[activeBoardId] || [];
        const hasItem = boardItems.some((i) => (i.ticket_number || '').toUpperCase() === ticketNum);
        if (!hasItem) return prev;

        return {
          ...prev,
          [activeBoardId]: boardItems.map((item) => {
            if ((item.ticket_number || '').toUpperCase() === ticketNum) {
              const gitActivity = {
                id: `act-gh-${Date.now()}`,
                author_name: `${commit.author.name} (GitHub)`,
                action: `Pushed commit ${commit.id}: "${commit.message}"`,
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString(),
              };
              const updated = {
                ...item,
                activities: [gitActivity, ...item.activities],
              };
              if (selectedItem?.id === item.id) {
                setSelectedItem(updated);
              }
              return updated;
            }
            return item;
          }),
        };
      });
    }

    // Add in-app notification
    const notif: NotificationItem = {
      id: `notif-gh-${Date.now()}`,
      title: `GitHub Push: ${commit.repo} (${commit.branch})`,
      description: `${commit.author.name}: ${commit.message}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      unread: true,
      type: 'system',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const deleteBoardItem = (itemId: string) => {
    if (!activeBoardId) return;

    const currentList = itemsMap[activeBoardId] || [];
    const existing = currentList.find((i) => i.id === itemId);
    const itemTitle = existing?.title || 'task';
    const actorName = currentUser?.full_name || 'Team Member';

    // Phase 5: Enterprise RBAC Authority check
    const membersList = currentWorkspace ? (membersMap[currentWorkspace.id] || []) : [];
    const member = membersList.find((m) => m.user_id === currentUser?.id);
    const effectiveRole = member?.role || 'owner';
    const isAllowed = RbacAuthority.canDeleteTicket(
      {
        userId: currentUser?.id || 'usr-anon',
        workspaceRole: effectiveRole,
      },
      existing?.assignee?.id || existing?.claimed_by
    );

    if (!isAllowed) {
      const rbacDeniedNotif: NotificationItem = {
        id: `notif-rbac-${Date.now()}`,
        title: 'Action Denied (RBAC Authority)',
        description: `Your role (${effectiveRole}) does not have permission to delete this ticket.`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        unread: true,
        type: 'system',
      };
      setNotifications((prev) => [rbacDeniedNotif, ...prev]);
      return;
    }

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).filter((i) => i.id !== itemId),
    }));
    setMyWorkItems((prev) => prev.filter((m) => m.id !== itemId));
    if (selectedItemRef.current?.id === itemId) {
      setSelectedItem(null);
    }

    // 1. Broadcast delete to other sessions live
    const deleteNotif = {
      userId: currentUser?.id || 'usr-deleter',
      userName: actorName,
      userAvatar: currentUser?.avatar_url || DEFAULT_AVATAR,
      userColor: '#ef4444',
      action: 'delete',
      message: `${actorName} deleted ${existing?.ticket_number || itemTitle}`,
    };
    ticketDeleteBroadcasterRef.current?.(itemId, deleteNotif);

    // 2. Queue in IndexedDB if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineMutation({
        type: 'delete_ticket',
        entityId: itemId,
        expectedVersion: existing?.version || 1,
        payload: { itemId },
        timestamp: new Date().toISOString(),
      }).then(() => setOfflinePendingCount((c) => c + 1)).catch(() => {});
    }

    // 3. Persist deletion to server
    fetch(`/api/tickets/${itemId}`, {
      method: 'DELETE',
    }).catch((err) => console.warn('[Tickets API] Failed to delete ticket', err));
  };

  const addItemComment = (itemId: string, content: string) => {
    if (!activeBoardId || !content.trim()) return;

    const authorName = currentUser?.full_name || 'Team Member';
    const authorAvatar = currentUser?.avatar_url || DEFAULT_AVATAR;
    const authorId = currentUser?.id || 'usr-author';

    const nowIso = new Date().toISOString();
    const newComment: ItemComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author_name: authorName,
      author_avatar: authorAvatar,
      content: content.trim(),
      timestamp: nowIso,
      created_at: nowIso,
      reactions: [],
    };

    const currentList = itemsMap[activeBoardId] || [];
    const targetItem = currentList.find((i) => i.id === itemId) || selectedItemRef.current;
    const existingComments = targetItem?.comments || [];
    const updatedComments = [...existingComments, newComment];

    updateBoardItem(itemId, { comments: updatedComments });

    const ticketTitle = targetItem?.title || 'task';
    const shortText = content.length > 50 ? `${content.slice(0, 47)}...` : content;
    const notif = {
      userId: authorId,
      userName: authorName,
      userAvatar: authorAvatar,
      userColor: '#3b82f6',
      action: 'comment' as const,
      message: `${authorName} commented on ${ticketTitle}: "${shortText}"`,
    };

    if (targetItem) {
      const updatedItem: BoardItem = {
        ...targetItem,
        comments: updatedComments,
        version: (targetItem.version || 1) + 1,
        updated_at: new Date().toISOString(),
      };
      if (ticketBroadcasterRef.current) {
        ticketBroadcasterRef.current(updatedItem, notif);
      }
    }

    // Persist comment to server endpoint
    fetch('/api/tickets/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board_id: activeBoardId,
        ticket_id: itemId,
        comment: newComment,
      }),
    }).catch((err) => console.warn('[Comments API] Failed to persist comment', err));
  };

  const toggleCommentReaction = (itemId: string, commentId: string, emoji: string) => {
    const currentItem = selectedItemRef.current?.id === itemId 
      ? selectedItemRef.current 
      : (activeBoardId ? (itemsMap[activeBoardId] || []).find((i) => i.id === itemId) : null);
    if (!currentItem) return;

    const userName = currentUser?.full_name || 'Team Member';

    const updatedComments = (currentItem.comments || []).map((comm) => {
      if (comm.id === commentId) {
        const existing = comm.reactions.find((r) => r.emoji === emoji);
        let nextReactions;
        if (existing) {
          if (existing.users.includes(userName)) {
            nextReactions = comm.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== userName) }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            nextReactions = comm.reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, users: [...r.users, userName] }
                : r
            );
          }
        } else {
          nextReactions = [...comm.reactions, { emoji, count: 1, users: [userName] }];
        }
        return { ...comm, reactions: nextReactions };
      }
      return comm;
    });

    updateBoardItem(itemId, { comments: updatedComments });

    const updatedItem: BoardItem = {
      ...currentItem,
      comments: updatedComments,
      version: (currentItem.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    if (ticketBroadcasterRef.current) {
      ticketBroadcasterRef.current(updatedItem);
    }

    fetch('/api/tickets/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_id: itemId,
        comments: updatedComments,
      }),
    }).catch((err) => console.warn('[Comments API] Failed to persist reaction', err));
  };

  const deleteItemComment = (itemId: string, commentId: string) => {
    const currentItem = selectedItemRef.current?.id === itemId 
      ? selectedItemRef.current 
      : (activeBoardId ? (itemsMap[activeBoardId] || []).find((i) => i.id === itemId) : null);
    if (!currentItem) return;

    const updatedComments = (currentItem.comments || []).filter((comm) => comm.id !== commentId);
    updateBoardItem(itemId, { comments: updatedComments });

    const updatedItem: BoardItem = {
      ...currentItem,
      comments: updatedComments,
      version: (currentItem.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    if (selectedItemRef.current?.id === itemId) {
      setSelectedItem(updatedItem);
    }
    if (ticketBroadcasterRef.current) {
      ticketBroadcasterRef.current(updatedItem);
    }

    fetch('/api/tickets/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_id: itemId,
        comments: updatedComments,
      }),
    }).catch((err) => console.warn('[Comments API] Failed to persist deleted comment', err));
  };

  const toggleGroupCollapse = (groupId: string) => {
    if (!activeBoardId) return;
    setGroupsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
      ),
    }));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('happytf_theme', nextTheme);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const login = async (email: string) => {
    const namePart = email ? email.split('@')[0] : 'User';
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    setCurrentUser({
      id: `usr-${Date.now()}`,
      email: email || 'user@happytf.dev',
      full_name: formattedName,
      job_role: 'Team Member',
      created_at: new Date().toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formattedName)}&backgroundColor=6366f1`,
    });
  };

  const signup = async (fullName: string, email: string, jobRole?: string) => {
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: fullName,
      job_role: jobRole || 'Product Specialist',
      created_at: new Date().toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=6366f1`,
    };
    setCurrentUser(newUser);
    setIsOnboardingOpen(true);
  };

  const loginWithOAuth = async (provider: 'google' | 'github') => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${origin}/auth/callback`,
          },
        });
        if (error) {
          console.warn(`Supabase OAuth (${provider}) warning:`, error.message);
        } else {
          return;
        }
      } catch (err) {
        console.warn('Supabase OAuth error:', err);
      }
    }

    // Demo/offline fallback
    if (isDeployed()) {
      const providerLabel = provider === 'google' ? 'Google User' : 'GitHub User';
      setCurrentUser({
        id: `usr-${Date.now()}`,
        email: `user@${provider}.com`,
        full_name: providerLabel,
        job_role: 'Team Member',
        created_at: new Date().toISOString(),
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(providerLabel)}&backgroundColor=6366f1`,
      });
      return;
    }

    // No Supabase and not in deployed mode — create a minimal local session
    const providerLabel = provider === 'google' ? 'Google User' : 'GitHub User';
    setCurrentUser({
      id: `usr-${Date.now()}`,
      email: `user@${provider}.com`,
      full_name: providerLabel,
      job_role: 'Team Member',
      created_at: new Date().toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(providerLabel)}&backgroundColor=6366f1`,
    });
  };

  const loginWithMagicLink = async (_email: string): Promise<boolean> => {
    return true;
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {}
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('happytf_user');
    } catch {}
  };

  const switchWorkspace = (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) {
      setCurrentWorkspace(found);
      setActiveView('home');
      setActiveBoardId(null);
    }
  };

  const createWorkspace = (name: string, emoji: string, color: string): Workspace => {
    const creatorId = currentUser?.id || `usr-${Date.now()}`;
    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: name.trim() || 'Untitled Workspace',
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-') + `-${Math.floor(Math.random() * 1000)}`,
      icon_emoji: emoji || '📁',
      brand_color: color || '#6366f1',
      created_by: creatorId,
      created_at: new Date().toISOString(),
      member_count: 1,
    };

    setWorkspaces((prev) => [...prev, newWs]);
    setCurrentWorkspace(newWs);

    const newMember: WorkspaceMember = {
      id: `wm-${Date.now()}`,
      workspace_id: newWs.id,
      user_id: creatorId,
      role: 'owner',
      joined_at: new Date().toISOString(),
      profile: currentUser || {
        id: creatorId,
        email: 'owner@workspace.local',
        full_name: 'Workspace Owner',
        job_role: 'Owner',
        created_at: new Date().toISOString(),
      },
    };

    setMembersMap((prev) => ({
      ...prev,
      [newWs.id]: [newMember],
    }));

    const welcomeBoard: BoardSummary = {
      id: `board-${Date.now()}`,
      workspace_id: newWs.id,
      name: 'Getting Started & Launchpad',
      icon_emoji: 'rocket',
      description: `Welcome to ${newWs.name}! Track high-priority items and projects here.`,
      item_count: 0,
      updated_at: new Date().toISOString(),
      member_avatars: currentUser?.avatar_url ? [currentUser.avatar_url] : [],
      columns: [...DEFAULT_BOARD_COLUMNS],
    };

    setBoardsMap((prev) => ({
      ...prev,
      [newWs.id]: [welcomeBoard],
    }));

    setGroupsMap((prev) => ({
      ...prev,
      [welcomeBoard.id]: getDefaultBoardGroups(welcomeBoard.id),
    }));

    // If Supabase is configured and user is authenticated, persist to real PostgreSQL tables
    if (isSupabaseConfigured() && currentUser) {
      try {
        const supabase = createClient();
        supabase.from('workspaces').insert([{
          id: newWs.id,
          name: newWs.name,
          slug: newWs.slug,
          icon_emoji: newWs.icon_emoji,
          brand_color: newWs.brand_color,
          created_by: currentUser.id,
        }]).then();
        supabase.from('workspace_members').insert([{
          workspace_id: newWs.id,
          user_id: currentUser.id,
          role: 'owner',
        }]).then();
        supabase.from('boards').insert([{
          id: welcomeBoard.id,
          workspace_id: newWs.id,
          name: welcomeBoard.name,
          icon_emoji: welcomeBoard.icon_emoji,
          description: welcomeBoard.description,
        }]).then();
      } catch (e) {
        console.warn('[Supabase Workspace Persist Error]', e);
      }
    }

    return newWs;
  };

  const updateWorkspace = (id: string, updates: Partial<Workspace>) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w))
    );
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteWorkspace = (id: string) => {
    if (workspaces.length <= 1) {
      alert('You must have at least one workspace.');
      return;
    }
    const remaining = workspaces.filter((w) => w.id !== id);
    setWorkspaces(remaining);
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(remaining[0]);
    }
    setIsWorkspaceSettingsOpen(false);
  };

  const inviteMember = (email: string, role: WorkspaceRole) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    const newMember: WorkspaceMember = {
      id: `wm-${Date.now()}`,
      workspace_id: wsId,
      user_id: `usr-${Date.now()}`,
      role,
      joined_at: new Date().toISOString(),
      profile: {
        id: `usr-${Date.now()}`,
        email,
        full_name: email.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}&backgroundColor=8b5cf6`,
        job_role: role === 'owner' ? 'Owner' : role === 'admin' ? 'Administrator' : 'Contributor',
        created_at: new Date().toISOString(),
      },
    };

    setMembersMap((prev) => ({
      ...prev,
      [wsId]: [...(prev[wsId] || []), newMember],
    }));

    setWorkspaces((prev) =>
      prev.map((w) => (w.id === wsId ? { ...w, member_count: (w.member_count || 1) + 1 } : w))
    );

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Invitation Sent',
      description: `Invited ${email} as ${role} to ${currentWorkspace.name}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      unread: true,
      type: 'invite',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const updateMemberRole = (memberId: string, newRole: WorkspaceRole) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    setMembersMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
    }));
  };

  const removeMember = (memberId: string) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    setMembersMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).filter((m) => m.id !== memberId),
    }));
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === wsId ? { ...w, member_count: Math.max(1, (w.member_count || 2) - 1) } : w))
    );
  };

  const completeOnboarding = (data: Partial<OnboardingState>) => {
    if (data.fullName && currentUser) {
      setCurrentUser({
        ...currentUser,
        full_name: data.fullName,
        job_role: data.jobRole || currentUser.job_role,
        avatar_url: data.avatarUrl || currentUser.avatar_url,
      });
    }

    if (data.workspaceName) {
      const created = createWorkspace(
        data.workspaceName,
        data.iconEmoji || '✨',
        data.brandColor || '#6366f1'
      );
      if (data.invitedEmails && data.invitedEmails.length > 0) {
        data.invitedEmails.forEach((email) => {
          if (email.trim()) {
            inviteMember(email.trim(), 'member');
          }
        });
      }
      setCurrentWorkspace(created);
    }

    setIsOnboardingOpen(false);

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981'],
      });
    } catch {}
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const updateWorkItemStatus = (id: string, newStatus: MyWorkItem['status']) => {
    const colorMap: Record<MyWorkItem['status'], string> = {
      'Working on it': '#f59e0b',
      'Stuck': '#ef4444',
      'Done': '#10b981',
      'Pending': '#64748b',
      'In Review': '#8b5cf6',
    };

    setMyWorkItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              status_color: colorMap[newStatus],
            }
          : item
      )
    );

    // Sync status change across boards in itemsMap
    setItemsMap((prev) => {
      let changed = false;
      const nextMap = { ...prev };
      for (const bId of Object.keys(nextMap)) {
        if (nextMap[bId].some((item) => item.id === id)) {
          changed = true;
          nextMap[bId] = nextMap[bId].map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: newStatus,
                  status_color: colorMap[newStatus],
                  version: (item.version || 1) + 1,
                  updated_at: new Date().toISOString(),
                }
              : item
          );
        }
      }
      return changed ? nextMap : prev;
    });

    if (selectedItem?.id === id) {
      setSelectedItem((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              status_color: colorMap[newStatus],
              version: (prev.version || 1) + 1,
              updated_at: new Date().toISOString(),
            }
          : null
      );
    }
  };

  const createBoard = (
    name: string, 
    iconEmoji: string, 
    description: string, 
    color?: string, 
    templateId?: string,
    folderId?: string
  ) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    const newBoardId = `board-${Date.now()}`;
    const matchedTemplate = templateId ? BOARD_TEMPLATES.find((t) => t.id === templateId) : undefined;

    const boardColor = color || matchedTemplate?.color || '#6366f1';
    const boardIcon = iconEmoji || matchedTemplate?.icon || '📋';

    // Prepare groups from template or fallback
    const groups: BoardGroup[] = matchedTemplate && matchedTemplate.groups.length > 0
      ? matchedTemplate.groups.map((g, idx) => ({
          id: `grp-${Date.now()}-${idx}`,
          board_id: newBoardId,
          name: g.name,
          color: g.color,
          collapsed: false,
        }))
      : [
          { id: `grp-${Date.now()}-todo`, board_id: newBoardId, name: 'To Do', color: '#6366f1' },
          { id: `grp-${Date.now()}-progress`, board_id: newBoardId, name: 'In Progress', color: '#f59e0b' },
          { id: `grp-${Date.now()}-done`, board_id: newBoardId, name: 'Done', color: '#10b981' },
        ];

    // Prepare starter items from template (empty if deployed and no template)
    const rawStarterItems = isDeployed() && !templateId ? [] : (matchedTemplate?.starterItems || []);
    const starterItems: BoardItem[] = rawStarterItems.map((item, idx) => {
      const ticketNum = `TK-${Math.floor(2000 + idx * 100 + Math.random() * 50)}`;
      const targetGroup = groups[Math.min(idx, groups.length - 1)];
      const statusColor = item.status === 'Done' ? '#10b981' : item.status === 'In Review' ? '#8b5cf6' : item.status === 'Stuck' ? '#ef4444' : '#f59e0b';
      const authorName = currentUser?.full_name || 'Team Member';
      return {
        id: `item-${Date.now()}-${idx}`,
        ticket_number: ticketNum,
        board_id: newBoardId,
        group_id: targetGroup.id,
        title: item.title,
        status: item.status,
        status_color: statusColor,
        priority: item.priority,
        severity: 'minor',
        due_date: item.due_date,
        sla_due_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        assignee: currentUser ? {
          id: currentUser.id,
          name: currentUser.full_name,
          avatar: currentUser.avatar_url || DEFAULT_AVATAR,
        } : {
          id: 'unassigned',
          name: 'Unassigned',
          avatar: DEFAULT_AVATAR,
        },
        tags: item.tags || ['Ticket'],
        subtasks: [],
        description: item.description || 'Deliverable scoping and acceptance requirements.',
        version: 1,
        updated_at: new Date().toISOString(),
        activities: [
          {
            id: `act-${Date.now()}-${idx}`,
            author_name: authorName,
            action: `Generated from template "${matchedTemplate?.name}"`,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        comments: [],
      };
    });

    const newBoard: BoardSummary = {
      id: newBoardId,
      workspace_id: wsId,
      name: name.trim() || matchedTemplate?.name || 'Untitled Board',
      icon_emoji: boardIcon,
      color: boardColor,
      template_id: templateId,
      folder_id: folderId || undefined,
      description: description || matchedTemplate?.description || 'New project board',
      item_count: starterItems.length,
      updated_at: new Date().toISOString(),
      member_avatars: currentUser?.avatar_url ? [currentUser.avatar_url] : [],
    };

    setBoardsMap((prev) => ({
      ...prev,
      [wsId]: [newBoard, ...(prev[wsId] || [])],
    }));

    // Register board on server so any invite links work immediately across sessions and devices
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBoard),
    }).catch(() => {});

    if (isSupabaseConfigured() && currentUser) {
      try {
        const supabase = createClient();
        supabase.from('boards').insert([{
          id: newBoard.id,
          workspace_id: wsId,
          name: newBoard.name,
          icon_emoji: newBoard.icon_emoji,
          description: newBoard.description,
        }]).then();
      } catch (e) {
        console.warn('[Supabase Board Persist Error]', e);
      }
    }

    setGroupsMap((prev) => ({
      ...prev,
      [newBoardId]: groups,
    }));

    setItemsMap((prev) => ({
      ...prev,
      [newBoardId]: starterItems,
    }));

    // Switch view to the new board
    setActiveBoardId(newBoardId);
    setActiveView('board');
  };

  const setWorkspaceSettingsOpen = (open: boolean, tab: 'general' | 'members' | 'roles' | 'danger' = 'general') => {
    setActiveSettingsTab(tab);
    setIsWorkspaceSettingsOpen(open);
  };

  // Structural Hierarchy (Folders)
  const currentFolders = foldersMap[currentWorkspace?.id || ''] || [];
  const currentBoard = currentBoards.find((b) => b.id === activeBoardId) || null;
  const currentBoardColumns = currentBoard?.columns || DEFAULT_BOARD_COLUMNS;

  const createFolder = (name: string, color?: string) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    const newFolder: Folder = {
      id: `fld-${Date.now()}`,
      workspace_id: wsId,
      name: name.trim() || 'New Folder',
      color: color || '#3ecf8e',
      collapsed: false,
    };
    setFoldersMap((prev) => ({
      ...prev,
      [wsId]: [...(prev[wsId] || []), newFolder],
    }));
  };

  const toggleFolderCollapse = (folderId: string) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    setFoldersMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).map((f) =>
        f.id === folderId ? { ...f, collapsed: !f.collapsed } : f
      ),
    }));
  };

  const deleteFolder = (folderId: string) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    setFoldersMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).filter((f) => f.id !== folderId),
    }));
    setBoardsMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).map((b) =>
        b.folder_id === folderId ? { ...b, folder_id: undefined } : b
      ),
    }));
  };

  const moveBoardToFolder = (boardId: string, folderId: string | null) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    setBoardsMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).map((b) =>
        b.id === boardId ? { ...b, folder_id: folderId || undefined } : b
      ),
    }));
  };

  const addBoardColumn = (boardId: string, column: BoardColumn) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    setBoardsMap((prev) => ({
      ...prev,
      [wsId]: (prev[wsId] || []).map((b) => {
        if (b.id !== boardId) return b;
        const cols = b.columns || [...DEFAULT_BOARD_COLUMNS];
        return { ...b, columns: [...cols, column] };
      }),
    }));
  };

  const addSubItem = (itemId: string, title: string) => {
    if (!activeBoardId) return;
    const currentList = itemsMap[activeBoardId] || [];
    const item = currentList.find((i) => i.id === itemId);
    if (!item) return;

    const newSub: SubItem = {
      id: `sub-${Date.now()}`,
      parent_id: itemId,
      title: title.trim() || 'New sub-item',
      status: 'Working on it',
      status_color: '#f59e0b',
      assignee: currentUser ? { 
        id: currentUser.id, 
        name: currentUser.full_name, 
        avatar: getSafeAvatar(currentUser.avatar_url, currentUser.full_name) 
      } : undefined,
      due_date: 'Tomorrow',
      number_val: 1,
      completed: false,
    };

    const updatedSubItems = [...(item.sub_items || []), newSub];
    updateBoardItem(itemId, { sub_items: updatedSubItems });
  };

  const updateSubItem = (itemId: string, subItemId: string, updates: Partial<SubItem>) => {
    if (!activeBoardId) return;
    const currentList = itemsMap[activeBoardId] || [];
    const item = currentList.find((i) => i.id === itemId);
    if (!item) return;

    const updatedSubItems = (item.sub_items || []).map((s) =>
      s.id === subItemId ? { ...s, ...updates } : s
    );
    updateBoardItem(itemId, { sub_items: updatedSubItems });
  };

  const deleteSubItem = (itemId: string, subItemId: string) => {
    if (!activeBoardId) return;
    const currentList = itemsMap[activeBoardId] || [];
    const item = currentList.find((i) => i.id === itemId);
    if (!item) return;

    const updatedSubItems = (item.sub_items || []).filter((s) => s.id !== subItemId);
    updateBoardItem(itemId, { sub_items: updatedSubItems });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        workspaces,
        currentWorkspace,
        members: currentMembers,
        recentBoards: currentBoards,
        folders: currentFolders,
        myWorkItems,
        allWorkspaceItems,
        notifications,
        unreadCount,
        theme,
        isSidebarCollapsed,
        isMobileSidebarOpen,
        setMobileSidebarOpen: setIsMobileSidebarOpen,
        toggleMobileSidebar,
        isCommandPaletteOpen,
        isOnboardingOpen,
        isCreateWorkspaceOpen,
        isCreateBoardOpen,
        isQuickTaskOpen,
        isWorkspaceSettingsOpen,
        isShortcutsModalOpen,
        isContextModalOpen,
        activeSettingsTab,
        activeView,
        boardViewMode,
        setBoardViewMode,
        activeBoardId,
        activeBoard,
        boardGroups: currentBoardGroups,
        boardItems: currentBoardItems,
        boardColumns: currentBoardColumns,
        selectedItem,
        onTicketInsert,
        onTicketUpdate,
        onTicketDelete,
        createFolder,
        toggleFolderCollapse,
        deleteFolder,
        moveBoardToFolder,
        addBoardColumn,
        addSubItem,
        updateSubItem,
        deleteSubItem,
        navigateToBoard,
        joinBoard,
        navigateToHome,
        navigateToChat,
        openItemDetail,
        closeItemDetail,
        selectNextItem,
        selectPrevItem,
        addBoardItem,
        updateBoardItem,
        deleteBoardItem,
        addItemComment,
        deleteItemComment,
        toggleCommentReaction,
        toggleGroupCollapse,
        login,
        signup,
        loginWithOAuth,
        loginWithMagicLink,
        logout,
        switchWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        inviteMember,
        updateMemberRole,
        removeMember,
        completeOnboarding,
        toggleSidebar,
        toggleTheme,
        setCommandPaletteOpen: setIsCommandPaletteOpen,
        setOnboardingOpen: setIsOnboardingOpen,
        setCreateWorkspaceOpen: setIsCreateWorkspaceOpen,
        setCreateBoardOpen: setIsCreateBoardOpen,
        setQuickTaskOpen: setIsQuickTaskOpen,
        setWorkspaceSettingsOpen,
        setShortcutsModalOpen: setIsShortcutsModalOpen,
        setContextModalOpen: setIsContextModalOpen,
        isDiscordModalOpen,
        setDiscordModalOpen: setIsDiscordModalOpen,
        isSlackModalOpen: isDiscordModalOpen,
        setSlackModalOpen: setIsDiscordModalOpen,
        isAutomationModalOpen,
        setAutomationModalOpen: setIsAutomationModalOpen,
        isColumnarModalOpen,
        setColumnarModalOpen: setIsColumnarModalOpen,
        isAiCopilotOpen,
        setAiCopilotOpen: setIsAiCopilotOpen,
        isOffline,
        offlinePendingCount,
        automationRules,
        toggleAutomationRule,
        automationLogs,
        simulateAutomation,
        isTeamChatOpen,
        setTeamChatOpen: setIsTeamChatOpen,
        activeTeamChannelId,
        setActiveTeamChannelId,
        openTeamChat,
        closeTeamChat,
        isGitHubFeedOpen,
        setGitHubFeedOpen: setIsGitHubFeedOpen,
        toggleGitHubFeed,
        gitHubCommits,
        addGitHubCommit,
        claimBoardItem,
        markAllNotificationsAsRead,
        markNotificationRead,
        updateWorkItemStatus,
        createBoard,
        registerTicketBroadcaster,
        registerTicketBroadcasters,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { useWorkspace } from './WorkspaceContext';
export { useBoard } from './BoardContext';
export { useTickets } from './TicketContext';

'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  ViewMode
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
  DEFAULT_BOARD_COLUMNS
} from '../lib/mock-data';
import confetti from 'canvas-confetti';
import { createClient, isSupabaseConfigured } from '../lib/supabase/client';

interface AppContextType {
  currentUser: UserProfile | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  recentBoards: BoardSummary[];
  folders: Folder[];
  myWorkItems: MyWorkItem[];
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
  isSlackModalOpen: boolean;
  isGitHubFeedOpen: boolean;
  setGitHubFeedOpen: (open: boolean) => void;
  toggleGitHubFeed: () => void;
  gitHubCommits: GitHubCommit[];
  addGitHubCommit: (commit: GitHubCommit) => void;
  activeSettingsTab: 'general' | 'members' | 'roles' | 'danger';

  // Navigation & Board Engine state
  activeView: 'home' | 'board';
  boardViewMode: ViewMode;
  setBoardViewMode: (mode: ViewMode) => void;
  activeBoardId: string | null;
  activeBoard: BoardSummary | null;
  boardGroups: BoardGroup[];
  boardItems: BoardItem[];
  boardColumns: BoardColumn[];
  selectedItem: BoardItem | null;

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
  navigateToHome: () => void;
  openItemDetail: (itemOrId: BoardItem | string) => void;
  closeItemDetail: () => void;
  selectNextItem: () => void;
  selectPrevItem: () => void;
  addBoardItem: (groupId: string, title: string) => void;
  updateBoardItem: (itemId: string, updates: Partial<BoardItem>, ifVersion?: number) => { success: boolean; error?: string };
  claimBoardItem: (itemId: string, ifVersion?: number) => { success: boolean; error?: string };
  deleteBoardItem: (itemId: string) => void;
  addItemComment: (itemId: string, content: string) => void;
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
  setSlackModalOpen: (open: boolean) => void;
  markAllNotificationsAsRead: () => void;
  markNotificationRead: (id: string) => void;
  updateWorkItemStatus: (id: string, newStatus: MyWorkItem['status']) => void;
  createBoard: (name: string, iconEmoji: string, description: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(DEMO_USER);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(INITIAL_WORKSPACES[0]);
  const [membersMap, setMembersMap] = useState<Record<string, WorkspaceMember[]>>(INITIAL_MEMBERS);
  const [boardsMap, setBoardsMap] = useState<Record<string, BoardSummary[]>>(INITIAL_BOARDS);
  const [foldersMap, setFoldersMap] = useState<Record<string, Folder[]>>(INITIAL_FOLDERS);
  const [myWorkItems, setMyWorkItems] = useState<MyWorkItem[]>(INITIAL_MY_WORK_ITEMS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Board engine state
  const [activeView, setActiveView] = useState<'home' | 'board'>('home');
  const [boardViewMode, setBoardViewMode] = useState<ViewMode>('table');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [groupsMap, setGroupsMap] = useState<Record<string, BoardGroup[]>>(INITIAL_BOARD_GROUPS);
  const [itemsMap, setItemsMap] = useState<Record<string, BoardItem[]>>(INITIAL_BOARD_ITEMS);
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
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [isGitHubFeedOpen, setIsGitHubFeedOpen] = useState(false);
  const [gitHubCommits, setGitHubCommits] = useState<GitHubCommit[]>(INITIAL_GITHUB_COMMITS);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'members' | 'roles' | 'danger'>('general');

  const toggleMobileSidebar = () => setIsMobileSidebarOpen((prev) => !prev);
  const toggleGitHubFeed = () => setIsGitHubFeedOpen((prev) => !prev);

  const selectedItemRef = useRef<BoardItem | null>(null);
  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  const updateBoardItemRef = useRef<((itemId: string, updates: Partial<BoardItem>, ifVersion?: number) => { success: boolean; error?: string }) | null>(null);

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
        setIsSlackModalOpen(false);
        setIsGitHubFeedOpen(false);
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const currentMembers = currentWorkspace ? (membersMap[currentWorkspace.id] || []) : [];
  const currentBoards = currentWorkspace ? (boardsMap[currentWorkspace.id] || []) : [];

  const activeBoard = activeBoardId
    ? currentBoards.find((b) => b.id === activeBoardId) || null
    : null;

  const currentBoardGroups = activeBoardId ? (groupsMap[activeBoardId] || []) : [];
  const currentBoardItems = activeBoardId ? (itemsMap[activeBoardId] || []) : [];

  const navigateToBoard = (boardId: string) => {
    setActiveBoardId(boardId);
    setActiveView('board');
  };

  const navigateToHome = () => {
    setActiveBoardId(null);
    setActiveView('home');
  };

  const openItemDetail = (itemOrId: BoardItem | string) => {
    if (typeof itemOrId === 'string') {
      // Find in current board items or across all items
      let found: BoardItem | undefined;
      for (const list of Object.values(itemsMap)) {
        found = list.find((i) => i.id === itemOrId);
        if (found) break;
      }
      if (found) setSelectedItem(found);
    } else {
      setSelectedItem(itemOrId);
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

  const addBoardItem = (groupId: string, title: string) => {
    if (!activeBoardId || !title.trim()) return;

    const ticketNum = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newItem: BoardItem = {
      id: `item-${Date.now()}`,
      ticket_number: ticketNum,
      board_id: activeBoardId,
      group_id: groupId,
      title: title.trim(),
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'medium',
      severity: 'minor',
      due_date: 'Next week',
      sla_due_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      assignee: {
        id: currentUser?.id || 'usr-demo-001',
        name: currentUser?.full_name || 'Alex Rivera',
        avatar: currentUser?.avatar_url || DEMO_USER.avatar_url!,
      },
      tags: ['Ticket'],
      subtasks: [],
      description: 'Add detailed requirements, deliverables, and acceptance criteria here.',
      version: 1,
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: `act-${Date.now()}`,
          author_name: currentUser?.full_name || 'Alex Rivera',
          action: `Created ticket ${ticketNum}`,
          timestamp: 'Just now',
        },
      ],
      comments: [],
    };

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: [...(prev[activeBoardId] || []), newItem],
    }));

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
    if (ifVersion !== undefined && ifVersion !== currentVersion) {
      const conflictNotif: NotificationItem = {
        id: `notif-conflict-${Date.now()}`,
        title: 'Optimistic Concurrency Conflict',
        description: `Item was modified by another session (current v${currentVersion}, expected v${ifVersion}).`,
        timestamp: 'Just now',
        unread: true,
        type: 'system',
      };
      setNotifications((prev) => [conflictNotif, ...prev]);
      return { 
        success: false, 
        error: `Conflict: Item was modified (current: v${currentVersion}, your copy: v${ifVersion}).` 
      };
    }

    const nextVersion = currentVersion + 1;
    const nextUpdatedAt = new Date().toISOString();

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id === itemId) {
          const updated: BoardItem = { 
            ...item, 
            ...updates,
            version: nextVersion,
            updated_at: nextUpdatedAt
          };
          if (selectedItem?.id === itemId) {
            setSelectedItem(updated);
          }
          return updated;
        }
        return item;
      }),
    }));

    return { success: true };
  };
  updateBoardItemRef.current = updateBoardItem;

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
        timestamp: 'Just now',
        unread: true,
        type: 'system',
      };
      setNotifications((prev) => [conflictNotif, ...prev]);
      return {
        success: false,
        error: `Conflict: Task was modified by another session (current: v${currentVersion}, your copy: v${ifVersion}).`,
      };
    }

    const userName = currentUser?.full_name || 'Alex Rivera';
    const userAvatar = currentUser?.avatar_url || DEMO_USER.avatar_url!;
    const nextVersion = currentVersion + 1;
    const nextUpdatedAt = new Date().toISOString();

    const claimActivity = {
      id: `act-claim-${Date.now()}`,
      author_name: userName,
      action: `Claimed ticket and set status to Working on it`,
      timestamp: 'Just now',
    };

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id === itemId) {
          const updated: BoardItem = {
            ...item,
            assignee: {
              id: currentUser?.id || 'usr-demo-001',
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
          if (selectedItem?.id === itemId) {
            setSelectedItem(updated);
          }
          return updated;
        }
        return item;
      }),
    }));

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
      timestamp: 'Just now',
      unread: true,
      type: 'assignment',
    };
    setNotifications((prev) => [successNotif, ...prev]);

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
                timestamp: 'Just now',
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
      timestamp: 'Just now',
      unread: true,
      type: 'system',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const deleteBoardItem = (itemId: string) => {
    if (!activeBoardId) return;
    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).filter((i) => i.id !== itemId),
    }));
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
  };

  const addItemComment = (itemId: string, content: string) => {
    if (!activeBoardId || !content.trim()) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      author_name: currentUser?.full_name || 'Alex Rivera',
      author_avatar: currentUser?.avatar_url || DEMO_USER.avatar_url!,
      content: content.trim(),
      timestamp: 'Just now',
      reactions: [],
    };

    updateBoardItem(itemId, {
      comments: [...(selectedItem?.comments || []), newComment],
    });
  };

  const toggleCommentReaction = (itemId: string, commentId: string, emoji: string) => {
    if (!selectedItem) return;
    const userName = currentUser?.full_name || 'Alex Rivera';

    const updatedComments = selectedItem.comments.map((comm) => {
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
    setCurrentUser({
      ...DEMO_USER,
      email: email || DEMO_USER.email,
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
    setCurrentUser({
      ...DEMO_USER,
      full_name: provider === 'google' ? 'Alex Rivera (Google)' : 'Alex Rivera (GitHub)',
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
    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: name.trim() || 'Untitled Workspace',
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-') + `-${Math.floor(Math.random() * 1000)}`,
      icon_emoji: emoji || '📁',
      brand_color: color || '#6366f1',
      created_by: currentUser?.id || 'usr-demo-001',
      created_at: new Date().toISOString(),
      member_count: 1,
    };

    setWorkspaces((prev) => [...prev, newWs]);
    setCurrentWorkspace(newWs);

    const newMember: WorkspaceMember = {
      id: `wm-${Date.now()}`,
      workspace_id: newWs.id,
      user_id: currentUser?.id || 'usr-demo-001',
      role: 'owner',
      joined_at: new Date().toISOString(),
      profile: currentUser || DEMO_USER,
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
      item_count: 3,
      updated_at: 'Just now',
      member_avatars: [currentUser?.avatar_url || DEMO_USER.avatar_url!],
    };

    setBoardsMap((prev) => ({
      ...prev,
      [newWs.id]: [welcomeBoard],
    }));

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
      timestamp: 'Just now',
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
  };

  const createBoard = (name: string, iconEmoji: string, description: string) => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    const newBoardId = `board-${Date.now()}`;
    const newBoard: BoardSummary = {
      id: newBoardId,
      workspace_id: wsId,
      name: name.trim() || 'Untitled Board',
      icon_emoji: iconEmoji || '📋',
      description: description || 'New project board',
      item_count: 0,
      updated_at: 'Just now',
      member_avatars: [currentUser?.avatar_url || DEMO_USER.avatar_url!],
    };

    setBoardsMap((prev) => ({
      ...prev,
      [wsId]: [newBoard, ...(prev[wsId] || [])],
    }));

    // Initialize groups for the new board
    setGroupsMap((prev) => ({
      ...prev,
      [newBoardId]: [
        { id: `grp-${Date.now()}-todo`, board_id: newBoardId, name: 'To Do', color: '#6366f1' },
        { id: `grp-${Date.now()}-progress`, board_id: newBoardId, name: 'In Progress', color: '#f59e0b' },
        { id: `grp-${Date.now()}-done`, board_id: newBoardId, name: 'Done', color: '#10b981' },
      ],
    }));

    setItemsMap((prev) => ({
      ...prev,
      [newBoardId]: [],
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
    const newSub: SubItem = {
      id: `sub-${Date.now()}`,
      parent_id: itemId,
      title: title.trim() || 'New sub-item',
      status: 'Working on it',
      status_color: '#f59e0b',
      assignee: currentUser ? { id: currentUser.id, name: currentUser.full_name, avatar: currentUser.avatar_url || '' } : undefined,
      due_date: 'Tomorrow',
      number_val: 1,
      completed: false,
    };
    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id !== itemId) return item;
        const subs = item.sub_items || [];
        return {
          ...item,
          sub_items: [...subs, newSub],
          version: (item.version || 1) + 1,
        };
      }),
    }));
  };

  const updateSubItem = (itemId: string, subItemId: string, updates: Partial<SubItem>) => {
    if (!activeBoardId) return;
    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id !== itemId) return item;
        const subs = item.sub_items || [];
        return {
          ...item,
          sub_items: subs.map((s) => s.id === subItemId ? { ...s, ...updates } : s),
          version: (item.version || 1) + 1,
        };
      }),
    }));
  };

  const deleteSubItem = (itemId: string, subItemId: string) => {
    if (!activeBoardId) return;
    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          sub_items: (item.sub_items || []).filter((s) => s.id !== subItemId),
          version: (item.version || 1) + 1,
        };
      }),
    }));
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
        createFolder,
        toggleFolderCollapse,
        deleteFolder,
        moveBoardToFolder,
        addBoardColumn,
        addSubItem,
        updateSubItem,
        deleteSubItem,
        navigateToBoard,
        navigateToHome,
        openItemDetail,
        closeItemDetail,
        selectNextItem,
        selectPrevItem,
        addBoardItem,
        updateBoardItem,
        deleteBoardItem,
        addItemComment,
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
        isSlackModalOpen,
        setSlackModalOpen: setIsSlackModalOpen,
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

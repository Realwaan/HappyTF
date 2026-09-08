'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  BoardItem
} from '../types';
import { 
  DEMO_USER, 
  INITIAL_WORKSPACES, 
  INITIAL_MEMBERS, 
  INITIAL_BOARDS, 
  INITIAL_MY_WORK_ITEMS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_BOARD_GROUPS,
  INITIAL_BOARD_ITEMS
} from '../lib/mock-data';
import confetti from 'canvas-confetti';

interface AppContextType {
  currentUser: UserProfile | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  recentBoards: BoardSummary[];
  myWorkItems: MyWorkItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  theme: 'dark' | 'light';
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  isOnboardingOpen: boolean;
  isCreateWorkspaceOpen: boolean;
  isWorkspaceSettingsOpen: boolean;
  isShortcutsModalOpen: boolean;
  activeSettingsTab: 'general' | 'members' | 'roles' | 'danger';

  // Navigation & Board Engine state
  activeView: 'home' | 'board';
  activeBoardId: string | null;
  activeBoard: BoardSummary | null;
  boardGroups: BoardGroup[];
  boardItems: BoardItem[];
  selectedItem: BoardItem | null;

  // Actions
  navigateToBoard: (boardId: string) => void;
  navigateToHome: () => void;
  openItemDetail: (itemOrId: BoardItem | string) => void;
  closeItemDetail: () => void;
  selectNextItem: () => void;
  selectPrevItem: () => void;
  addBoardItem: (groupId: string, title: string) => void;
  updateBoardItem: (itemId: string, updates: Partial<BoardItem>) => void;
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
  setWorkspaceSettingsOpen: (open: boolean, tab?: 'general' | 'members' | 'roles' | 'danger') => void;
  setShortcutsModalOpen: (open: boolean) => void;
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
  const [myWorkItems, setMyWorkItems] = useState<MyWorkItem[]>(INITIAL_MY_WORK_ITEMS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Board engine state
  const [activeView, setActiveView] = useState<'home' | 'board'>('home');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [groupsMap, setGroupsMap] = useState<Record<string, BoardGroup[]>>(INITIAL_BOARD_GROUPS);
  const [itemsMap, setItemsMap] = useState<Record<string, BoardItem[]>>(INITIAL_BOARD_ITEMS);
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'members' | 'roles' | 'danger'>('general');

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

  // Keyboard shortcut listeners (⌘K, ?, Esc, Navigation)
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
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsCreateWorkspaceOpen(false);
        setIsWorkspaceSettingsOpen(false);
        setIsShortcutsModalOpen(false);
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

    const newItem: BoardItem = {
      id: `item-${Date.now()}`,
      board_id: activeBoardId,
      group_id: groupId,
      title: title.trim(),
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'medium',
      due_date: 'Next week',
      assignee: {
        id: currentUser?.id || 'usr-demo-001',
        name: currentUser?.full_name || 'Alex Rivera',
        avatar: currentUser?.avatar_url || DEMO_USER.avatar_url!,
      },
      tags: ['New Task'],
      description: 'Add detailed requirements, deliverables, and acceptance criteria here.',
      activities: [
        {
          id: `act-${Date.now()}`,
          author_name: currentUser?.full_name || 'Alex Rivera',
          action: 'Created item',
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

  const updateBoardItem = (itemId: string, updates: Partial<BoardItem>) => {
    if (!activeBoardId) return;

    setItemsMap((prev) => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates };
          if (selectedItem?.id === itemId) {
            setSelectedItem(updated);
          }
          return updated;
        }
        return item;
      }),
    }));
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
    setCurrentUser({
      ...DEMO_USER,
      full_name: provider === 'google' ? 'Alex Rivera (Google)' : 'Alex Rivera (GitHub)',
    });
  };

  const loginWithMagicLink = async (_email: string): Promise<boolean> => {
    return true;
  };

  const logout = () => {
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
      icon_emoji: '🚀',
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        workspaces,
        currentWorkspace,
        members: currentMembers,
        recentBoards: currentBoards,
        myWorkItems,
        notifications,
        unreadCount,
        theme,
        isSidebarCollapsed,
        isCommandPaletteOpen,
        isOnboardingOpen,
        isCreateWorkspaceOpen,
        isWorkspaceSettingsOpen,
        isShortcutsModalOpen,
        activeSettingsTab,
        activeView,
        activeBoardId,
        activeBoard,
        boardGroups: currentBoardGroups,
        boardItems: currentBoardItems,
        selectedItem,
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
        setWorkspaceSettingsOpen,
        setShortcutsModalOpen: setIsShortcutsModalOpen,
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

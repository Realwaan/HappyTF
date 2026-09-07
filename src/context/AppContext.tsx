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
  OnboardingState 
} from '../types';
import { 
  DEMO_USER, 
  INITIAL_WORKSPACES, 
  INITIAL_MEMBERS, 
  INITIAL_BOARDS, 
  INITIAL_MY_WORK_ITEMS, 
  INITIAL_NOTIFICATIONS 
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
  activeSettingsTab: 'general' | 'members' | 'roles' | 'danger';

  // Actions
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
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

  // Keyboard shortcut for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsCreateWorkspaceOpen(false);
        setIsWorkspaceSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const currentMembers = currentWorkspace ? (membersMap[currentWorkspace.id] || []) : [];
  const currentBoards = currentWorkspace ? (boardsMap[currentWorkspace.id] || []) : [];

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
    // Demo login handler
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
    // Trigger onboarding wizard for new signups
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

    // Add current user as owner
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

    // Initialize with a welcome board
    const welcomeBoard: BoardSummary = {
      id: `board-${Date.now()}`,
      workspace_id: newWs.id,
      name: 'Getting Started & Launchpad',
      icon_emoji: '🚀',
      description: `Welcome to ${newWs.name}! Track high-priority items and projects here.`,
      item_count: 5,
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

    // Update workspace member count
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === wsId ? { ...w, member_count: (w.member_count || 1) + 1 } : w))
    );

    // Create activity notification
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

    // Delightful celebration confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981'],
      });
    } catch {
      // safe fallback
    }
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
      'Pending': '#6b7280',
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
    const newBoard: BoardSummary = {
      id: `board-${Date.now()}`,
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
        activeSettingsTab,
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

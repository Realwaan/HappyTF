'use client';

/**
 * Workspace Domain Context & Hook
 * Hexagonal State Slice for Multi-tenant Workspaces & Team Membership
 */

import { useApp } from './AppContext';

export function useWorkspace() {
  const app = useApp();

  return {
    currentUser: app.currentUser,
    workspaces: app.workspaces,
    currentWorkspace: app.currentWorkspace,
    members: app.members,
    activeSettingsTab: app.activeSettingsTab,
    isWorkspaceSettingsOpen: app.isWorkspaceSettingsOpen,
    isCreateWorkspaceOpen: app.isCreateWorkspaceOpen,
    switchWorkspace: app.switchWorkspace,
    createWorkspace: app.createWorkspace,
    updateWorkspace: app.updateWorkspace,
    deleteWorkspace: app.deleteWorkspace,
    inviteMember: app.inviteMember,
    updateMemberRole: app.updateMemberRole,
    removeMember: app.removeMember,
    setWorkspaceSettingsOpen: app.setWorkspaceSettingsOpen,
  };
}

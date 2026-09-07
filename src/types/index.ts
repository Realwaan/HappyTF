export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  job_role?: string;
  created_at: string;
  updated_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon_emoji: string;
  brand_color: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  member_count?: number;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  profile?: UserProfile;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  invited_by: string;
  created_at: string;
  expires_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user_name?: string;
}

export interface BoardSummary {
  id: string;
  workspace_id: string;
  name: string;
  icon_emoji: string;
  description: string;
  item_count: number;
  updated_at: string;
  member_avatars: string[];
}

export interface MyWorkItem {
  id: string;
  board_id: string;
  board_name: string;
  workspace_id: string;
  title: string;
  status: 'Working on it' | 'Stuck' | 'Done' | 'Pending' | 'In Review';
  status_color: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date: string;
  assignee_id: string;
  is_overdue: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  unread: boolean;
  type: 'assignment' | 'mention' | 'invite' | 'system';
  link?: string;
}

export interface OnboardingState {
  completed: boolean;
  step: 1 | 2 | 3;
  fullName: string;
  jobRole: string;
  avatarUrl: string;
  purpose: string;
  workspaceName: string;
  iconEmoji: string;
  brandColor: string;
  invitedEmails: string[];
}

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
  folder_id?: string;
  name: string;
  icon_emoji: string;
  description: string;
  item_count: number;
  updated_at: string;
  member_avatars: string[];
  columns?: import('../lib/mondaydb/types').BoardColumn[];
}

export type {
  BoardColumn,
  ColumnOption,
  ColumnType,
  SubItem,
  Folder,
  StatusBatterySegment,
  GroupAggregation,
  BoardAggregation,
  FilterCondition,
  FilterOperator,
  SortRule
} from '../lib/mondaydb/types';

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

/* ==========================================================================
   Core Board Engine & View Models
   ========================================================================== */

export type ViewMode = 'table' | 'kanban' | 'timeline' | 'dashboard';

export interface BoardGroup {
  id: string;
  board_id: string;
  name: string;
  color: string;
  collapsed?: boolean;
}

export interface ItemActivity {
  id: string;
  author_name: string;
  action: string;
  timestamp: string;
}

export interface ItemReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ItemComment {
  id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  timestamp: string;
  reactions: ItemReaction[];
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  provider: 'slack' | 'monday' | 'custom_webhook';
  webhook_url?: string;
  bot_token?: string;
  default_channel_id?: string;
  notify_on_urgent: boolean;
  notify_on_status_change: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BoardItem {
  id: string;
  board_id: string;
  group_id: string;
  ticket_number?: string;
  title: string;
  status: 'Working on it' | 'Stuck' | 'Done' | 'Pending' | 'In Review';
  status_color: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  severity?: 'critical' | 'major' | 'minor' | 'cosmetic';
  due_date: string;
  sla_due_at?: string;
  assignee: {
    id: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  subtasks?: SubTask[];
  sub_items?: import('../lib/mondaydb/types').SubItem[];
  numbers_value?: number;
  custom_values?: Record<string, string | number | boolean>;
  description?: string;
  activities: ItemActivity[];
  comments: ItemComment[];
  external_source?: 'web' | 'slack' | 'monday' | 'email';
  slack_channel_id?: string;
  slack_thread_ts?: string;
  monday_item_id?: string;
  claimed_by?: string;
  claimed_at?: string;
  version?: number;
  updated_at?: string;
}

export interface GitHubCommit {
  id: string; // short sha e.g. 'c7a4e21'
  full_sha?: string;
  repo: string;
  branch: string;
  message: string;
  url: string;
  timestamp: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  linked_ticket_number?: string;
}

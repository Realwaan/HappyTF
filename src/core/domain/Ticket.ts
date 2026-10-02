/**
 * HappyTF Domain Model: Ticket Entity & Lifecycle States
 * Hexagonal Architecture - Domain Core
 */

import { BoardItem, ItemComment, ItemActivity, SubTask } from '@/types';

export type TicketStatus = 'Pending' | 'Working on it' | 'In Review' | 'Stuck' | 'Done';
export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TicketSeverity = 'critical' | 'major' | 'minor' | 'cosmetic';

export interface TicketId {
  value: string;
}

export interface TicketProps {
  id: string;
  board_id: string;
  group_id: string;
  ticket_number?: string;
  title: string;
  status: TicketStatus;
  status_color: string;
  priority: TicketPriority;
  severity?: TicketSeverity;
  due_date: string;
  sla_due_at?: string;
  workspace_id?: string;
  assignee?: {
    id: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  subtasks?: SubTask[];
  description?: string;
  activities: ItemActivity[];
  comments: ItemComment[];
  external_source?: 'web' | 'discord' | 'slack' | 'monday' | 'email';
  discord_channel_id?: string;
  discord_thread_id?: string;
  discord_message_id?: string;
  claimed_by?: string;
  claimed_at?: string;
  qa_reviewed_by?: string;
  qa_reviewed_at?: string;
  version: number;
  updated_at: string;
}

export class TicketEntity {
  private props: TicketProps;

  constructor(props: TicketProps) {
    this.props = {
      ...props,
      version: props.version ?? 1,
      updated_at: props.updated_at || new Date().toISOString(),
    };
  }

  get id(): string {
    return this.props.id;
  }

  get version(): number {
    return this.props.version;
  }

  get status(): TicketStatus {
    return this.props.status;
  }

  get priority(): TicketPriority {
    return this.props.priority;
  }

  get title(): string {
    return this.props.title;
  }

  get boardId(): string {
    return this.props.board_id;
  }

  get toDto(): BoardItem {
    return { ...this.props };
  }

  /**
   * Transition ticket status with optimistic version increment.
   */
  public transitionStatus(newStatus: TicketStatus, statusColor: string, actor: string): void {
    const prevStatus = this.props.status;
    this.props.status = newStatus;
    this.props.status_color = statusColor;
    this.props.version += 1;
    this.props.updated_at = new Date().toISOString();

    this.props.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author_name: actor,
      action: `Status transitioned from "${prevStatus}" to "${newStatus}"`,
      timestamp: 'just now',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Developer / Collaborator claim
   */
  public claim(user: { id: string; name: string; avatar: string }): void {
    this.props.assignee = user;
    this.props.claimed_by = user.name;
    this.props.claimed_at = new Date().toISOString();
    this.props.status = 'Working on it';
    this.props.status_color = '#0073ea';
    this.props.version += 1;
    this.props.updated_at = new Date().toISOString();

    this.props.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author_name: user.name,
      action: `Claimed ticket for development`,
      timestamp: 'just now',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Add a threaded comment
   */
  public addComment(comment: ItemComment): void {
    this.props.comments.unshift(comment);
    this.props.version += 1;
    this.props.updated_at = new Date().toISOString();
  }
}

/**
 * HappyTF Enterprise RBAC & Capability Authority
 * Evaluates fine-grained permissions across Workspace Roles and CapStoneFlow Bot Roles.
 */

import { WorkspaceRole } from '@/types';

export type CapStoneFlowRole = 'PM' | 'QA' | 'Developer';

export interface UserContext {
  userId: string;
  workspaceRole: WorkspaceRole;
  capStoneFlowRole?: CapStoneFlowRole;
}

export class RbacAuthority {
  /**
   * Only Workspace Owner, Admin, PM, or the ticket author can delete a ticket.
   * Viewers and general members cannot delete tasks created by others.
   */
  static canDeleteTicket(user: UserContext, ticketAuthorId?: string): boolean {
    if (user.workspaceRole === 'owner' || user.workspaceRole === 'admin') {
      return true;
    }
    if (user.capStoneFlowRole === 'PM') {
      return true;
    }
    if (ticketAuthorId && user.userId === ticketAuthorId) {
      return true;
    }
    return false;
  }

  /**
   * Board structure management (create/rename groups, delete board)
   */
  static canManageBoard(user: UserContext): boolean {
    return user.workspaceRole === 'owner' || user.workspaceRole === 'admin' || user.capStoneFlowRole === 'PM';
  }

  /**
   * Workspace settings & credentials modification
   */
  static canManageWorkspaceSettings(user: UserContext): boolean {
    return user.workspaceRole === 'owner' || user.workspaceRole === 'admin';
  }

  /**
   * Discord CapStoneFlow bot credential integration
   */
  static canManageDiscordIntegrations(user: UserContext): boolean {
    return user.workspaceRole === 'owner' || user.workspaceRole === 'admin' || user.capStoneFlowRole === 'PM';
  }

  /**
   * Claiming an open task
   */
  static canClaimTicket(user: UserContext): boolean {
    if (user.workspaceRole === 'viewer') return false;
    if (user.capStoneFlowRole === 'QA') return false; // QA cannot claim Dev tickets
    return true;
  }

  /**
   * QA reviewing and moving to QA Approved
   */
  static canReviewTicket(user: UserContext): boolean {
    if (user.workspaceRole === 'owner' || user.workspaceRole === 'admin') return true;
    return user.capStoneFlowRole === 'QA' || user.capStoneFlowRole === 'PM';
  }

  /**
   * Closing a ticket
   */
  static canCloseTicket(user: UserContext, isAssignee?: boolean): boolean {
    if (user.workspaceRole === 'owner' || user.workspaceRole === 'admin') return true;
    if (user.capStoneFlowRole === 'PM') return true;
    if (isAssignee) return true;
    return false;
  }
}

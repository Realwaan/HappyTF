/**
 * HappyTF Workflow Automation Engine (If-This-Then-That)
 * Handles auto-transitions, SLA adjustments, and Discord CapStoneFlow alerts.
 */

import { BoardItem, DiscordWorkspaceConfig } from '@/types';
import { sendDiscordMessage } from '@/lib/integrations/discord';

export type AutomationTriggerType =
  | 'priority_changed'
  | 'status_changed'
  | 'ticket_created'
  | 'pr_opened'
  | 'pr_merged'
  | 'sla_breach_warning';

export type AutomationActionType =
  | 'set_sla_hours'
  | 'send_discord_alert'
  | 'assign_role'
  | 'transition_status';

export interface AutomationAction {
  type: AutomationActionType;
  hours?: number;
  status?: BoardItem['status'];
  role?: 'Developer' | 'QA' | 'PM';
  messageTemplate?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerType: AutomationTriggerType;
  triggerCondition?: {
    priority?: BoardItem['priority'];
    status?: BoardItem['status'];
  };
  actions: AutomationAction[];
  enabled: boolean;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-urgent-sla-discord',
    name: 'Urgent SLA Escalation & Discord Alert',
    description: 'When priority is changed to urgent, set a 2-hour SLA and dispatch a high-priority alert to Discord.',
    triggerType: 'priority_changed',
    triggerCondition: { priority: 'urgent' },
    actions: [
      { type: 'set_sla_hours', hours: 2 },
      {
        type: 'send_discord_alert',
        messageTemplate: '🚨 **[URGENT ESCALATION]** Ticket `{{ticket_number}}` ("{{title}}") has been escalated to URGENT. SLA countdown set to 2 hours.',
      },
    ],
    enabled: true,
  },
  {
    id: 'rule-stuck-unblock-discord',
    name: 'Blocker Warning & Team Ping',
    description: 'When ticket status is changed to Stuck, alert the team in Discord for unblocking.',
    triggerType: 'status_changed',
    triggerCondition: { status: 'Stuck' },
    actions: [
      {
        type: 'send_discord_alert',
        messageTemplate: '🛑 **[BLOCKER ALERT]** Ticket `{{ticket_number}}` is STUCK. Needs PM/Tech Lead review.',
      },
    ],
    enabled: true,
  },
  {
    id: 'rule-github-pr-opened',
    name: 'GitHub PR Auto In-Review',
    description: 'When a GitHub PR referencing the ticket is opened, advance status to In Review.',
    triggerType: 'pr_opened',
    actions: [
      { type: 'transition_status', status: 'In Review' },
      {
        type: 'send_discord_alert',
        messageTemplate: '🔍 **[PR OPENED]** PR opened for `{{ticket_number}}`. Moved to **In Review** for QA verification.',
      },
    ],
    enabled: true,
  },
  {
    id: 'rule-github-pr-merged',
    name: 'GitHub PR Merge Auto-Done',
    description: 'When a GitHub PR referencing the ticket is merged, mark ticket as Done and stamp resolution.',
    triggerType: 'pr_merged',
    actions: [
      { type: 'transition_status', status: 'Done' },
      {
        type: 'send_discord_alert',
        messageTemplate: '🎉 **[PR MERGED]** Code merged to main for `{{ticket_number}}`. Marked as **Done**!',
      },
    ],
    enabled: true,
  },
];

export interface AutomationEvent {
  type: AutomationTriggerType;
  previousValue?: string;
  newValue?: string;
  actor?: string;
  metadata?: Record<string, any>;
}

export interface AutomationExecutionResult {
  updatedTicket: BoardItem;
  triggeredRules: string[];
  actionsTaken: string[];
}

/**
 * Execute automation rules against a ticket event
 */
export async function evaluateTicketAutomations(
  ticket: BoardItem,
  event: AutomationEvent,
  options?: {
    customRules?: AutomationRule[];
    discordConfig?: DiscordWorkspaceConfig | null;
  }
): Promise<AutomationExecutionResult> {
  const rules = options?.customRules || DEFAULT_AUTOMATION_RULES;
  const activeRules = rules.filter(r => r.enabled && r.triggerType === event.type);

  let currentTicket = { ...ticket };
  const triggeredRules: string[] = [];
  const actionsTaken: string[] = [];

  for (const rule of activeRules) {
    // Condition checks
    if (rule.triggerCondition?.priority && currentTicket.priority !== rule.triggerCondition.priority) {
      continue;
    }
    if (rule.triggerCondition?.status && currentTicket.status !== rule.triggerCondition.status) {
      continue;
    }

    triggeredRules.push(rule.name);

    for (const action of rule.actions) {
      switch (action.type) {
        case 'set_sla_hours': {
          const hours = action.hours || 2;
          const deadline = new Date(Date.now() + hours * 3600 * 1000).toISOString();
          currentTicket = {
            ...currentTicket,
            sla_due_at: deadline,
            version: (currentTicket.version ?? 1) + 1,
            updated_at: new Date().toISOString(),
          };
          actionsTaken.push(`Set SLA deadline to ${hours}h from now (${deadline})`);
          break;
        }

        case 'transition_status': {
          if (action.status) {
            const statusColorMap: Record<string, string> = {
              'Done': '#00c875',
              'In Review': '#a25ddc',
              'Working on it': '#0073ea',
              'Stuck': '#e2445c',
              'Pending': '#c4c4c4',
            };
            currentTicket = {
              ...currentTicket,
              status: action.status,
              status_color: statusColorMap[action.status] || '#0073ea',
              version: (currentTicket.version ?? 1) + 1,
              updated_at: new Date().toISOString(),
            };
            actionsTaken.push(`Transitioned status to "${action.status}"`);
          }
          break;
        }

        case 'send_discord_alert': {
          if (options?.discordConfig && options.discordConfig.is_active) {
            const ticketKey = currentTicket.ticket_number || `#TK-${currentTicket.id}`;
            const text = (action.messageTemplate || '')
              .replace(/{{ticket_number}}/g, ticketKey)
              .replace(/{{title}}/g, currentTicket.title);

            const targetChannel =
              options.discordConfig.reminders_channel_id ||
              options.discordConfig.tickets_channel_id;

            if (targetChannel && options.discordConfig.bot_token) {
              await sendDiscordMessage(
                options.discordConfig.bot_token,
                targetChannel,
                text
              ).catch(() => {});
              actionsTaken.push(`Dispatched Discord alert to channel ${targetChannel}`);
            }
          }
          break;
        }
      }
    }
  }

  return {
    updatedTicket: currentTicket,
    triggeredRules,
    actionsTaken,
  };
}

export interface AutomationLogEntry {
  id: string;
  timestamp: string;
  ruleName: string;
  triggerType: AutomationTriggerType;
  ticketId: string;
  ticketLabel: string;
  actionsTaken: string[];
  status: 'success' | 'failed';
}

export const INITIAL_AUTOMATION_LOGS: AutomationLogEntry[] = [
  {
    id: 'log-seed-1',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    ruleName: 'GitHub PR Auto In-Review',
    triggerType: 'pr_opened',
    ticketId: 'item-2',
    ticketLabel: '#TK-2839',
    actionsTaken: ['Transitioned status to "In Review"', 'Dispatched Discord alert to channel #tickets'],
    status: 'success',
  },
  {
    id: 'log-seed-2',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    ruleName: 'Urgent SLA Escalation & Discord Alert',
    triggerType: 'priority_changed',
    ticketId: 'item-1',
    ticketLabel: '#TK-1092',
    actionsTaken: ['Set SLA deadline to 2h from now', 'Dispatched Discord alert to channel #reminders'],
    status: 'success',
  },
];

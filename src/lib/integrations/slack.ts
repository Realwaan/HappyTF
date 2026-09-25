/**
 * Slack Integration Dispatcher & Block Kit Formatter
 * Supports Incoming Webhooks and Interactive Action Buttons.
 */

export interface SlackTicketPayload {
  workspaceId: string;
  ticketId: string;
  ticketNumber: string;
  title: string;
  priority: string;
  status: string;
  assigneeName: string;
  due_date?: string;
  sla_due_at?: string;
}

export interface SlackStatusChangePayload {
  workspaceId: string;
  ticketId: string;
  ticketNumber: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  actorName: string;
}

/**
 * Format Ticket Notification into Slack Block Kit payload
 */
export function buildSlackTicketBlocks(ticket: SlackTicketPayload, siteUrl: string) {
  const priorityEmoji =
    ticket.priority === 'urgent'
      ? '🚨'
      : ticket.priority === 'high'
      ? '🔴'
      : ticket.priority === 'medium'
      ? '🟡'
      : '🔵';

  const ticketUrl = `${siteUrl || 'https://happytf.work'}?ticket=${ticket.ticketId}`;

  return {
    text: `${priorityEmoji} [${ticket.ticketNumber}] ${ticket.title} (${ticket.priority.toUpperCase()})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} New Ticket: ${ticket.ticketNumber}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Title:*\n${ticket.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${priorityEmoji} ${ticket.priority.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n*${ticket.status}*`,
          },
          {
            type: 'mrkdwn',
            text: `*Assignee:*\n👤 ${ticket.assigneeName}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 View in HappyTF',
              emoji: true,
            },
            url: ticketUrl,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '⚡ Claim Ticket',
              emoji: true,
            },
            action_id: `claim_${ticket.ticketId}`,
            value: JSON.stringify({ action: 'claim', ticketId: ticket.ticketId }),
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Mark Done',
              emoji: true,
            },
            action_id: `done_${ticket.ticketId}`,
            value: JSON.stringify({ action: 'done', ticketId: ticket.ticketId }),
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Synced via *HappyTF Work OS* • ${new Date().toLocaleTimeString()}`,
          },
        ],
      },
    ],
  };
}

/**
 * Dispatch Slack webhook notification
 */
export async function dispatchSlackNotification(payload: SlackTicketPayload): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://happytf.work';

  if (!webhookUrl) {
    // If not configured, log for local development audit
    console.log('[Slack Dispatch - Demo Mode]', {
      ticket: payload.ticketNumber,
      title: payload.title,
      priority: payload.priority,
    });
    return { success: true };
  }

  try {
    const blocks = buildSlackTicketBlocks(payload, siteUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blocks),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Slack Webhook HTTP Error] ${response.status}: ${errText}`);
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (error) {
    console.error('[Slack Webhook Error]', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Dispatch Status Change Alert to Slack (e.g., ticket was marked stuck or resolved)
 */
export async function dispatchSlackStatusChange(payload: SlackStatusChangePayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const statusEmoji = payload.newStatus === 'Done' ? '🎉' : payload.newStatus === 'Stuck' ? '🚨' : '🔄';

  const body = {
    text: `${statusEmoji} *${payload.ticketNumber}* status changed to *${payload.newStatus}* by ${payload.actorName}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${statusEmoji} *[${payload.ticketNumber}] ${payload.title}*\nStatus updated: ~${payload.oldStatus}~ ➔ *${payload.newStatus}*\nUpdated by: *${payload.actorName}*`,
        },
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[Slack Status Webhook Error]', err);
  }
}

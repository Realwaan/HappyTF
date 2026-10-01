import crypto from 'crypto';
import { cacheGet, cacheSet } from '../redis';
import { BoardItem, DiscordWorkspaceConfig, DiscordUserRoleMapping } from '../../types';
import { CAPSTONEFLOW_COMMANDS, buildDiscordSlashCommandsPayload } from './capstoneflow';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Retrieve Discord workspace integration configuration
 */
export async function getDiscordConfig(workspaceId: string): Promise<DiscordWorkspaceConfig | null> {
  const cached = await cacheGet<DiscordWorkspaceConfig>(`happytf:discord:config:${workspaceId}`);
  if (cached) return cached;

  return {
    workspace_id: workspaceId,
    bot_token: process.env.DISCORD_BOT_TOKEN || '',
    client_id: process.env.DISCORD_CLIENT_ID || '',
    public_key: process.env.DISCORD_PUBLIC_KEY || '',
    guild_id: process.env.DISCORD_GUILD_ID || '',
    tickets_channel_id: process.env.DISCORD_TICKETS_CHANNEL_ID || '',
    reminders_channel_id: process.env.DISCORD_REMINDERS_CHANNEL_ID || '',
    webhook_url: process.env.DISCORD_WEBHOOK_URL || '',
    is_active: Boolean(process.env.DISCORD_BOT_TOKEN),
    bot_name: 'CapStoneFlow Bot',
  };
}

/**
 * Save Discord workspace integration configuration
 */
export async function setDiscordConfig(config: DiscordWorkspaceConfig): Promise<void> {
  await cacheSet(`happytf:discord:config:${config.workspace_id}`, config, 30 * 24 * 3600);
}

/**
 * Retrieve stored Discord user role mapping
 */
export async function getDiscordUserRole(discordUserId: string): Promise<'Developer' | 'QA' | 'PM' | null> {
  const mapping = await cacheGet<DiscordUserRoleMapping>(`happytf:discord:user_role:${discordUserId}`);
  return mapping ? mapping.role : null;
}

/**
 * Store Discord user role mapping
 */
export async function setDiscordUserRole(
  discordUserId: string,
  discordUsername: string,
  role: 'Developer' | 'QA' | 'PM'
): Promise<void> {
  const mapping: DiscordUserRoleMapping = {
    discord_user_id: discordUserId,
    discord_username: discordUsername,
    role,
    updated_at: new Date().toISOString(),
  };
  await cacheSet(`happytf:discord:user_role:${discordUserId}`, mapping, 365 * 24 * 3600);
}

/**
 * Verify Discord interaction webhook signature with Ed25519 public key
 */
export function verifyDiscordWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  clientPublicKey: string
): boolean {
  if (!signature || !timestamp || !clientPublicKey) {
    // If not configured, allow in development bypass
    return process.env.NODE_ENV !== 'production';
  }

  try {
    const publicKeyDer = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(clientPublicKey, 'hex'),
    ]);
    const keyObject = crypto.createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(null, Buffer.from(timestamp + rawBody), keyObject, Buffer.from(signature, 'hex'));
  } catch (err) {
    console.warn('[Discord] Signature verification error:', err);
    return false;
  }
}

/**
 * Register all CapStoneFlow slash commands to a Discord Guild or globally
 */
export async function registerDiscordSlashCommands(
  botToken: string,
  clientId: string,
  guildId?: string
): Promise<{ success: boolean; registeredCount: number; error?: string }> {
  try {
    const commandsPayload = buildDiscordSlashCommandsPayload();
    const endpoint = guildId
      ? `${DISCORD_API_BASE}/applications/${clientId}/guilds/${guildId}/commands`
      : `${DISCORD_API_BASE}/applications/${clientId}/commands`;

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandsPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, registeredCount: 0, error: `Discord API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return { success: true, registeredCount: Array.isArray(data) ? data.length : commandsPayload.length };
  } catch (err: unknown) {
    return { success: false, registeredCount: 0, error: err instanceof Error ? err.message : 'Unknown registration error' };
  }
}

/**
 * Send message with embed to a Discord channel or thread
 */
export async function sendDiscordMessage(
  botToken: string,
  channelId: string,
  content: string,
  embeds?: Record<string, unknown>[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, embeds }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: errText };
    }

    const msg = await res.json();
    return { success: true, messageId: msg.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Send message failed' };
  }
}

/**
 * Spawn a new dedicated Discord Thread for a HappyTF ticket
 */
export async function createDiscordTicketThread(
  botToken: string,
  channelId: string,
  ticket: BoardItem
): Promise<{ success: boolean; threadId?: string; error?: string }> {
  try {
    const ticketKey = ticket.ticket_number || `#TK-${ticket.id.replace('item-', '').padStart(3, '0')}`;
    const threadName = `${ticketKey}: ${ticket.title}`.slice(0, 100);

    const embed = formatTicketDiscordEmbed(ticket, 'CREATED', 'HappyTF Board');

    // Create thread in the tickets channel
    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/threads`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: threadName,
        auto_archive_duration: 1440, // 24 hours
        type: 11, // GUILD_PUBLIC_THREAD
        message: {
          content: `🎫 **New Ticket Dispatched** — CapStoneFlow lifecycle active in this thread.`,
          embeds: [embed],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }

    const data = await res.json();
    return { success: true, threadId: data.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Create thread error' };
  }
}

/**
 * Formats a ticket embed suitable for Discord
 */
export function formatTicketDiscordEmbed(
  ticket: BoardItem,
  action: 'CREATED' | 'CLAIMED' | 'RESOLVED' | 'REVIEWED' | 'CLOSED' | 'RESET',
  actorName: string,
  extraNote?: string
): Record<string, unknown> {
  const colors: Record<string, number> = {
    CREATED: 0x3ecf8e, // Emerald
    CLAIMED: 0xf59e0b, // Amber
    RESOLVED: 0x8b5cf6, // Violet / Review
    REVIEWED: 0x06b6d4, // Cyan / Verified
    CLOSED: 0x10b981, // Green / Done
    RESET: 0x64748b, // Slate / Reset
  };

  const statusIcons: Record<string, string> = {
    CREATED: '🆕 OPEN',
    CLAIMED: '⚡ CLAIMED (In Progress)',
    RESOLVED: '🔍 PENDING QA REVIEW',
    REVIEWED: '✅ REVIEWED & VERIFIED',
    CLOSED: '🏁 CLOSED & COMPLETED',
    RESET: '🔄 REOPENED',
  };

  const ticketKey = ticket.ticket_number || `#TK-${ticket.id.replace('item-', '').padStart(3, '0')}`;

  const fields = [
    { name: 'Status', value: `\`${ticket.status}\``, inline: true },
    { name: 'Priority', value: `\`${ticket.priority.toUpperCase()}\``, inline: true },
    { name: 'Assignee', value: ticket.assignee?.name || 'Unassigned', inline: true },
  ];

  if (ticket.sla_due_at) {
    fields.push({
      name: 'SLA Due',
      value: `<t:${Math.floor(new Date(ticket.sla_due_at).getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  if (extraNote) {
    fields.push({
      name: 'Notes & Context',
      value: extraNote.slice(0, 1024),
      inline: false,
    });
  }

  return {
    title: `${ticketKey}: ${ticket.title}`,
    description: ticket.description ? ticket.description.slice(0, 300) : 'No description provided.',
    color: colors[action] || 0x3ecf8e,
    fields,
    footer: {
      text: `CapStoneFlow • Action by ${actorName}`,
    },
    timestamp: new Date().toISOString(),
  };
}

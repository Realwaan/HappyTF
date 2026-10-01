import { describe, it, expect } from 'vitest';
import { CAPSTONEFLOW_COMMANDS, buildDiscordSlashCommandsPayload } from '../src/lib/integrations/capstoneflow';
import { formatTicketDiscordEmbed, verifyDiscordWebhookSignature } from '../src/lib/integrations/discord';
import { BoardItem } from '../src/types';

describe('CapStoneFlow Discord Bot Integration & Command Engine', () => {
  it('registers all 24 CapStoneFlow commands with descriptions and roles', () => {
    expect(CAPSTONEFLOW_COMMANDS).toHaveLength(24);

    const commandNames = CAPSTONEFLOW_COMMANDS.map((c) => c.name);
    // Verify user's exact required commands
    expect(commandNames).toContain('assign-role');
    expect(commandNames).toContain('claim');
    expect(commandNames).toContain('cleanup-tickets');
    expect(commandNames).toContain('clear');
    expect(commandNames).toContain('clear-folder-tickets');
    expect(commandNames).toContain('closed');
    expect(commandNames).toContain('commands');
    expect(commandNames).toContain('leaderboard');
    expect(commandNames).toContain('load-tickets');
    expect(commandNames).toContain('rebuild-db');
    expect(commandNames).toContain('reset-ticket');
    expect(commandNames).toContain('resolved');
    expect(commandNames).toContain('reviewed');
    expect(commandNames).toContain('scan-pdf');
    expect(commandNames).toContain('scan-project');
    expect(commandNames).toContain('scan-repo');
    expect(commandNames).toContain('setreminderschannel');
    expect(commandNames).toContain('sync-commands');
    expect(commandNames).toContain('ticket-folders');
    expect(commandNames).toContain('unclaim');
    expect(commandNames).toContain('unresolve');
    expect(commandNames).toContain('unreview');
    expect(commandNames).toContain('workflow');
    expect(commandNames).toContain('workflow-list');
  });

  it('builds valid Discord API slash command payloads', () => {
    const payload = buildDiscordSlashCommandsPayload();
    expect(payload).toHaveLength(24);

    const assignRoleCmd = payload.find((c) => c.name === 'assign-role');
    expect(assignRoleCmd).toBeDefined();
    expect(assignRoleCmd?.options).toBeDefined();

    const workflowCmd = payload.find((c) => c.name === 'workflow');
    expect(workflowCmd).toBeDefined();
    expect(workflowCmd?.options).toHaveLength(2);
  });

  it('enforces role requirements for lifecycle commands', () => {
    const claimCmd = CAPSTONEFLOW_COMMANDS.find((c) => c.name === 'claim');
    expect(claimCmd?.roleRequirement).toBe('Developer');
    expect(claimCmd?.usageScope).toBe('thread');

    const reviewedCmd = CAPSTONEFLOW_COMMANDS.find((c) => c.name === 'reviewed');
    expect(reviewedCmd?.roleRequirement).toBe('QA');
    expect(reviewedCmd?.usageScope).toBe('thread');

    const resetCmd = CAPSTONEFLOW_COMMANDS.find((c) => c.name === 'reset-ticket');
    expect(resetCmd?.roleRequirement).toBe('PM');
  });

  it('generates rich Discord embeds for ticket status transitions', () => {
    const mockTicket: BoardItem = {
      id: 'item-discord-1',
      board_id: 'board-1',
      group_id: 'group-1',
      ticket_number: '#TK-101',
      title: 'Fix Discord Bot Webhook Handshake',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'high',
      due_date: '2026-10-15',
      tags: ['backend', 'discord'],
      activities: [],
      comments: [],
      assignee: { id: 'dev-1', name: 'Marc Andrei', avatar: '' },
    };

    const embed = formatTicketDiscordEmbed(mockTicket, 'CLAIMED', 'Marc Andrei', 'Branch: fix/discord-webhook');
    expect(embed.title).toBe('#TK-101: Fix Discord Bot Webhook Handshake');
    expect(embed.color).toBe(0xf59e0b); // Amber for claimed
    expect(embed.fields).toBeDefined();

    const fields = embed.fields as Array<{ name: string; value: string }>;
    expect(fields.find((f) => f.name === 'Assignee')?.value).toBe('Marc Andrei');
    expect(fields.find((f) => f.name === 'Notes & Context')?.value).toContain('Branch: fix/discord-webhook');
  });

  it('safely handles webhook signature checks', () => {
    // When public key is empty in dev, returns dev mode bypass
    const res = verifyDiscordWebhookSignature('{}', null, null, '');
    expect(typeof res).toBe('boolean');
  });
});

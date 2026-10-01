import { CapStoneFlowCommand } from '../../types';

export const CAPSTONEFLOW_COMMANDS: CapStoneFlowCommand[] = [
  // 1. Role & Identity
  {
    name: 'assign-role',
    description: 'Set your active workspace role (Developer, QA, or PM)',
    roleRequirement: 'Team',
    usageScope: 'any',
    category: 'management',
    example: '/assign-role role:Developer',
  },
  // 2. Lifecycle - Developer
  {
    name: 'claim',
    description: 'Claim an OPEN ticket (use inside a ticket thread) - Developer only',
    roleRequirement: 'Developer',
    usageScope: 'thread',
    category: 'lifecycle',
    example: '/claim',
  },
  {
    name: 'unclaim',
    description: 'Release a claimed ticket back to OPEN pool (use inside thread)',
    roleRequirement: 'Developer',
    usageScope: 'thread',
    category: 'lifecycle',
    example: '/unclaim',
  },
  {
    name: 'resolved',
    description: 'Submit ticket for QA review (use inside thread) - Developer only',
    roleRequirement: 'Developer',
    usageScope: 'thread',
    category: 'lifecycle',
    example: '/resolved note:PR #24 merged to staging',
  },
  {
    name: 'unresolve',
    description: 'Revert ticket from Pending-Review back to CLAIMED (use inside thread)',
    roleRequirement: 'Developer',
    usageScope: 'thread',
    category: 'lifecycle',
    example: '/unresolve reason:Found regression during integration',
  },
  // 3. Lifecycle - QA
  {
    name: 'reviewed',
    description: 'Mark ticket as Reviewed/Verified (use inside thread) - QA only',
    roleRequirement: 'QA',
    usageScope: 'thread',
    category: 'lifecycle',
    example: '/reviewed verification:Tested cross-browser Chrome & Safari',
  },
  {
    name: 'unreview',
    description: 'Revert ticket from Reviewed back to Pending-Review (use inside thread)',
    roleRequirement: 'QA',
    usageScope: 'thread',
    category: 'lifecycle',
    example: '/unreview reason:Edge case found on mobile viewport',
  },
  // 4. Lifecycle - PM & Shared
  {
    name: 'closed',
    description: 'Mark a ticket as CLOSED (use inside thread) - PM or involved team members',
    roleRequirement: 'Team',
    usageScope: 'thread',
    category: 'lifecycle',
    example: '/closed resolution:Deployed to production and verified',
  },
  {
    name: 'reset-ticket',
    description: 'Reset current ticket thread back to OPEN state (PM only)',
    roleRequirement: 'PM',
    usageScope: 'thread',
    category: 'management',
    example: '/reset-ticket',
  },
  // 5. Channel & Thread Operations
  {
    name: 'cleanup-tickets',
    description: 'Archive and clean up completed CLOSED tickets in this channel',
    roleRequirement: 'PM',
    usageScope: 'channel',
    category: 'management',
    example: '/cleanup-tickets older_than_days:7',
  },
  {
    name: 'clear',
    description: 'Clear messages here and close the ticket thread if used inside one',
    roleRequirement: 'PM',
    usageScope: 'thread',
    category: 'utility',
    example: '/clear',
  },
  {
    name: 'clear-folder-tickets',
    description: 'Reset import cache for a folder so tickets can be reloaded',
    roleRequirement: 'PM',
    usageScope: 'channel',
    category: 'management',
    example: '/clear-folder-tickets folder:sprint-04',
  },
  {
    name: 'rebuild-db',
    description: 'Recover ticket database records from existing Discord threads',
    roleRequirement: 'PM',
    usageScope: 'channel',
    category: 'utility',
    example: '/rebuild-db confirm:true',
  },
  // 6. Discovery & Leaderboard
  {
    name: 'commands',
    description: 'Show the available CapStoneFlow bot commands',
    roleRequirement: 'Team',
    usageScope: 'any',
    category: 'utility',
    example: '/commands',
  },
  {
    name: 'leaderboard',
    description: 'View Developer and QA contribution leaderboards',
    roleRequirement: 'Team',
    usageScope: 'any',
    category: 'utility',
    example: '/leaderboard scope:this_sprint',
  },
  {
    name: 'ticket-folders',
    description: 'List all available ticket folders in the repository',
    roleRequirement: 'Team',
    usageScope: 'any',
    category: 'utility',
    example: '/ticket-folders',
  },
  // 7. Scanning & Ticket Ingestion
  {
    name: 'load-tickets',
    description: 'Import markdown tickets from a folder and create Discord threads',
    roleRequirement: 'Team',
    usageScope: 'channel',
    category: 'scanning',
    example: '/load-tickets folder:specs/auth',
  },
  {
    name: 'scan-pdf',
    description: 'Upload a PDF brief and generate an AI roadmap & ticket bundle',
    roleRequirement: 'Team',
    usageScope: 'channel',
    category: 'scanning',
    example: '/scan-pdf',
  },
  {
    name: 'scan-project',
    description: 'Scan a local folder and generate categorized ticket markdown files',
    roleRequirement: 'PM',
    usageScope: 'channel',
    category: 'scanning',
    example: '/scan-project path:./src',
  },
  {
    name: 'scan-repo',
    description: 'Clone and scan the project GitHub repository',
    roleRequirement: 'PM',
    usageScope: 'channel',
    category: 'scanning',
    example: '/scan-repo repo:Realwaan/HappyTF branch:master',
  },
  // 8. Workflows & Schedules
  {
    name: 'setreminderschannel',
    description: 'Set channel for daily 8:00 AM PHT ticket summaries',
    roleRequirement: 'PM',
    usageScope: 'channel',
    category: 'management',
    example: '/setreminderschannel channel:#daily-standup',
  },
  {
    name: 'sync-commands',
    description: 'Manually synchronize slash commands with Discord (PM only)',
    roleRequirement: 'PM',
    usageScope: 'any',
    category: 'management',
    example: '/sync-commands',
  },
  {
    name: 'workflow',
    description: 'Generate a chained multi-step workflow ticket series and create Discord threads',
    roleRequirement: 'Team',
    usageScope: 'channel',
    category: 'workflow',
    example: '/workflow type:feature-delivery name:KanbanDnD',
  },
  {
    name: 'workflow-list',
    description: 'Browse AI UX Playground multi-step design & product workflows',
    roleRequirement: 'Team',
    usageScope: 'any',
    category: 'workflow',
    example: '/workflow-list',
  },
];

/**
 * Builds the Discord API Application Command registration payload.
 */
export function buildDiscordSlashCommandsPayload() {
  return CAPSTONEFLOW_COMMANDS.map((cmd) => {
    const commandPayload: Record<string, unknown> = {
      name: cmd.name,
      description: cmd.description.slice(0, 100),
      type: 1, // CHAT_INPUT
    };

    if (cmd.name === 'assign-role') {
      commandPayload.options = [
        {
          name: 'role',
          description: 'Your workspace team role',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'Developer', value: 'Developer' },
            { name: 'QA Tester', value: 'QA' },
            { name: 'Project Manager (PM)', value: 'PM' },
          ],
        },
      ];
    } else if (cmd.name === 'resolved') {
      commandPayload.options = [
        {
          name: 'note',
          description: 'PR link, staging commit, or verification instructions for QA',
          type: 3,
          required: false,
        },
      ];
    } else if (cmd.name === 'reviewed') {
      commandPayload.options = [
        {
          name: 'verification',
          description: 'Summary of test coverage or test scenario passed',
          type: 3,
          required: false,
        },
      ];
    } else if (cmd.name === 'closed') {
      commandPayload.options = [
        {
          name: 'resolution',
          description: 'Resolution notes (deployed, verified, cancelled)',
          type: 3,
          required: false,
        },
      ];
    } else if (cmd.name === 'load-tickets') {
      commandPayload.options = [
        {
          name: 'folder',
          description: 'Folder or directory path containing ticket markdown files',
          type: 3,
          required: true,
        },
      ];
    } else if (cmd.name === 'scan-repo') {
      commandPayload.options = [
        {
          name: 'repo',
          description: 'GitHub owner/repo (e.g. Realwaan/HappyTF)',
          type: 3,
          required: true,
        },
        {
          name: 'branch',
          description: 'Branch to inspect (default: master)',
          type: 3,
          required: false,
        },
      ];
    } else if (cmd.name === 'setreminderschannel') {
      commandPayload.options = [
        {
          name: 'channel',
          description: 'Text channel to broadcast daily 8:00 AM PHT ticket summaries',
          type: 7, // CHANNEL
          required: true,
        },
      ];
    } else if (cmd.name === 'workflow') {
      commandPayload.options = [
        {
          name: 'type',
          description: 'Workflow pattern archetype',
          type: 3,
          required: true,
          choices: [
            { name: 'Feature Delivery (Research -> Spec -> Dev -> QA)', value: 'feature-delivery' },
            { name: 'Defect Remediation (TDD Red -> Fix -> Review)', value: 'defect-fix' },
            { name: 'Security Hardening & Audit', value: 'security-audit' },
            { name: 'Design Sprint (Figma -> React Prototype)', value: 'design-sprint' },
          ],
        },
        {
          name: 'name',
          description: 'Name of the epic or feature',
          type: 3,
          required: true,
        },
      ];
    }

    return commandPayload;
  });
}

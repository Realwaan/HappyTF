/**
 * Multi-Tier Workspace Memory & Context Taxonomy for HappyTF Work OS
 *
 * Implements a structured, file-based mental model for persistent domain knowledge:
 * - /profile.md: Stable identity (role, team, workspace ownership)
 * - /areas/<name>.md: Active projects, boards, milestones, and deliverable state
 * - /people/<name>.md: Teammates, roles, and assigned items
 * - /preferences.md: Behavioral, view mode, and UI density preferences
 */

import { Workspace, BoardSummary, BoardItem, WorkspaceMember, UserProfile } from '../types';

export interface MemoryDocument {
  path: string;
  name: string;
  description: string;
  sources: string[];
  aliases?: string[];
  content: string[];
}

export interface WorkspaceMemorySystem {
  profile: MemoryDocument;
  areas: MemoryDocument[];
  people: MemoryDocument[];
  preferences: MemoryDocument;
}

export function compileWorkspaceMemory(
  workspace: Workspace | null,
  user: UserProfile | null,
  boards: BoardSummary[],
  items: BoardItem[],
  members: WorkspaceMember[],
  theme: 'dark' | 'light'
): WorkspaceMemorySystem {
  const wsName = workspace?.name || 'HappyTF Workspace';
  const userName = user?.full_name || 'Alex Rivera';
  const userRole = user?.job_role || 'Lead Product Architect';

  // 1. /profile.md
  const profile: MemoryDocument = {
    path: '/profile.md',
    name: 'profile',
    description: 'Stable identity, job role, and active workspace ownership',
    sources: ['workspace_engine'],
    content: [
      `- [stated] Name: ${userName}`,
      `- [stated] Role: ${userRole}`,
      `- [stated] Email: ${user?.email || 'alex.rivera@happytf.dev'}`,
      `- [stated] Primary Workspace: ${wsName}`,
      `- [stated] Member of workspace since: ${workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : 'August 2026'}`,
      `- [stated] Active cycle: Sprint 24 (High-velocity product delivery)`,
    ],
  };

  // 2. /areas/<board>.md
  const areas: MemoryDocument[] = boards.map((board) => {
    const boardItems = items.filter((i) => i.board_id === board.id);
    const completed = boardItems.filter((i) => i.status === 'Done').length;
    const stuck = boardItems.filter((i) => i.status === 'Stuck').length;
    const inProgress = boardItems.filter((i) => i.status === 'Working on it').length;
    const slug = board.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return {
      path: `/areas/${slug}.md`,
      name: slug,
      description: `Active board track: ${board.name} (${board.description})`,
      sources: ['board_engine'],
      aliases: [board.name, `#${board.id}`],
      content: [
        `# Area: ${board.name}`,
        `- [stated] Description: ${board.description || 'Core engineering and operations board'}`,
        `- [observed] Total deliverables: ${boardItems.length} items (${completed} completed, ${inProgress} in-flight, ${stuck} blocked)`,
        ...boardItems.slice(0, 6).map(
          (i) =>
            `- [stated] [#HTF-${i.id.replace(/[^0-9]/g, '') || '01'}] ${i.title} (${i.status} · Priority: ${i.priority.toUpperCase()} · Assignee: ${i.assignee?.name || 'Unassigned'})`
        ),
      ],
    };
  });

  // 3. /people/<person>.md
  const people: MemoryDocument[] = members.map((m) => {
    const name = m.profile?.full_name || 'Team Member';
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const assignedTasks = items.filter((i) => i.assignee?.id === m.user_id || i.assignee?.name === name);

    return {
      path: `/people/${slug}.md`,
      name: slug,
      description: `Collaborator context for ${name} (${m.role} in ${wsName})`,
      sources: ['directory'],
      aliases: [name, m.profile?.email || ''],
      content: [
        `# Collaborator: ${name}`,
        `- [stated] Workspace Role: ${m.role.toUpperCase()}`,
        `- [stated] Job Title: ${m.profile?.job_role || 'Engineer'}`,
        `- [observed] Active sprint workload: ${assignedTasks.length} deliverables assigned`,
        ...assignedTasks.map((t) => `- [stated] Assigned: ${t.title} [${t.status}]`),
      ],
    };
  });

  // 4. /preferences.md
  const preferences: MemoryDocument = {
    path: '/preferences.md',
    name: 'preferences',
    description: 'User display preferences, theme state, and interaction conventions',
    sources: ['user_settings'],
    content: [
      `- [stated] Theme: ${theme === 'dark' ? 'Deep Slate Dark Mode (#090a0f canvas)' : 'Light Clean Mode'}`,
      `- [stated] Iconography: 100% vector SVG (Lucide) - zero raw emoji icon badges`,
      `- [stated] Keyboards Shortcuts: Enabled (C: quick issue, B: quick board, ⌘K: command palette)`,
      `- [stated] Concurrency Guard: Optimistic version token check enabled`,
      `- [stated] Issue key prefix: #HTF-xxx monospace badges`,
    ],
  };

  return {
    profile,
    areas,
    people,
    preferences,
  };
}

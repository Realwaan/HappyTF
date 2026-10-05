import { BoardItem, BoardGroup, WorkspaceMember } from '../../types';

export interface SprintRetroHighlights {
  whatWentWell: string[];
  blockers: string[];
  actionItems: string[];
}

export interface SprintSummaryResult {
  boardName: string;
  totalTickets: number;
  completedTickets: number;
  inProgressTickets: number;
  stuckCount: number;
  inReviewCount: number;
  totalPoints: number;
  completedPoints: number;
  completionPercentage: number;
  velocityScore: number;
  retroHighlights: SprintRetroHighlights;
  summaryMarkdown: string;
}

export interface SprintRiskAnalysis {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0 to 100
  urgentStuckTickets: BoardItem[];
  unassignedTickets: BoardItem[];
  missingEstimatesCount: number;
  overdueCount: number;
  recommendations: string[];
}

export interface SmartGeneratedTicket {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimate_points: number;
  group_id: string;
  tags: string[];
}

export interface GeneratedTicketPlan {
  prompt: string;
  tickets: SmartGeneratedTicket[];
  rationale: string;
}

export interface MemberWorkload {
  userId: string;
  name: string;
  points: number;
  ticketCount: number;
  capacityStatus: 'underloaded' | 'optimal' | 'heavy' | 'overloaded' | 'available';
}

export interface WorkloadShiftRecommendation {
  ticketId: string;
  ticketTitle: string;
  fromMemberName: string;
  toMemberName: string;
  points: number;
  reason: string;
}

export interface WorkloadRebalancePlan {
  memberLoads: MemberWorkload[];
  averagePointsPerMember: number;
  recommendedShifts: WorkloadShiftRecommendation[];
}

export interface FilterMatchResult {
  query: string;
  matchedItemIds: string[];
  filterTags: string[];
}

export function getItemPoints(item: BoardItem): number {
  const pts = item.estimate_points ?? item.numbers_value;
  return typeof pts === 'number' && !isNaN(pts) ? pts : 0;
}

export function getItemAssigneeName(item: BoardItem): string | undefined {
  if (!item.assignee) return undefined;
  return typeof item.assignee === 'object' ? item.assignee.name : String(item.assignee);
}

export function getMemberName(m: WorkspaceMember): string {
  return m.profile?.full_name || m.user?.full_name || m.profile?.email || m.user?.email || 'Unknown Member';
}

/**
 * Generates an executive sprint summary, velocity metrics, and automated retro highlights.
 */
export function generateSprintSummary(boardName: string, items: BoardItem[]): SprintSummaryResult {
  const totalTickets = items.length;
  const completedTickets = items.filter((i) => i.status === 'Done').length;
  const inProgressTickets = items.filter((i) => i.status === 'Working on it').length;
  const stuckCount = items.filter((i) => i.status === 'Stuck').length;
  const inReviewCount = items.filter((i) => i.status === 'In Review').length;

  let totalPoints = 0;
  let completedPoints = 0;

  for (const item of items) {
    const pts = getItemPoints(item);
    totalPoints += pts;
    if (item.status === 'Done') {
      completedPoints += pts;
    }
  }

  const completionPercentage = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;
  const pointsCompletionPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
  const velocityScore = Math.max(1, Math.round(completedPoints * 1.5 + completedTickets * 2));

  // Determine what went well
  const whatWentWell: string[] = [];
  if (completedTickets > 0) {
    whatWentWell.push(`Delivered ${completedTickets} tickets totaling ${completedPoints} story points.`);
  }
  const highPriorityDone = items.filter((i) => i.status === 'Done' && (i.priority === 'urgent' || i.priority === 'high'));
  if (highPriorityDone.length > 0) {
    whatWentWell.push(`Resolved ${highPriorityDone.length} high-severity milestones without regression.`);
  } else {
    whatWentWell.push('Core architecture stability maintained across active sprint lanes.');
  }

  // Determine blockers
  const blockers: string[] = [];
  const stuckItems = items.filter((i) => i.status === 'Stuck');
  if (stuckItems.length > 0) {
    blockers.push(`${stuckItems.length} items flagged as Stuck: ${stuckItems.map((i) => i.id).join(', ')}.`);
  }
  const unassignedWorking = items.filter((i) => !i.assignee && i.status === 'Working on it');
  if (unassignedWorking.length > 0) {
    blockers.push(`${unassignedWorking.length} tasks in progress lack an assigned DRI.`);
  }
  if (blockers.length === 0) {
    blockers.push('No critical roadblocks reported in the current sprint window.');
  }

  // Determine action items
  const actionItems: string[] = [];
  if (stuckItems.length > 0) {
    actionItems.push('Host urgent 15-minute unblocking standup for stuck tickets.');
  }
  if (totalPoints > 0 && pointsCompletionPct < 50) {
    actionItems.push('Rebalance remaining story points to meet target milestone delivery.');
  }
  actionItems.push('Review pull request backlog to prevent review stagnation.');

  const retroHighlights: SprintRetroHighlights = {
    whatWentWell,
    blockers,
    actionItems,
  };

  const summaryMarkdown = [
    `# 🚀 Sprint Summary: ${boardName}`,
    `**Completion:** ${completionPercentage}% (${completedTickets}/${totalTickets} tickets) | **Points:** ${completedPoints}/${totalPoints} SP (${pointsCompletionPct}%)`,
    `**Velocity Index:** ${velocityScore} pts/sprint | **Stuck:** ${stuckCount} | **In Progress:** ${inProgressTickets} | **In Review:** ${inReviewCount}`,
    '',
    '### ✨ What Went Well',
    ...whatWentWell.map((w) => `- ${w}`),
    '',
    '### 🛑 Blockers Encountered',
    ...blockers.map((b) => `- ${b}`),
    '',
    '### 🎯 Action Items for Next Sprint',
    ...actionItems.map((a) => `- [ ] ${a}`),
  ].join('\n');

  return {
    boardName,
    totalTickets,
    completedTickets,
    inProgressTickets,
    stuckCount,
    inReviewCount,
    totalPoints,
    completedPoints,
    completionPercentage,
    velocityScore,
    retroHighlights,
    summaryMarkdown,
  };
}

/**
 * Analyzes sprint health and predicts blocker risks based on SLA priorities and statuses.
 */
export function analyzeSprintRisks(items: BoardItem[]): SprintRiskAnalysis {
  const urgentStuckTickets = items.filter(
    (i) => i.status === 'Stuck' && (i.priority === 'urgent' || i.priority === 'high')
  );
  const unassignedTickets = items.filter((i) => !getItemAssigneeName(i) && i.status !== 'Done');
  const missingEstimates = items.filter((i) => {
    const p = i.estimate_points ?? i.numbers_value;
    return p === undefined || p === null || p === 0;
  });

  let riskScore = 15; // Baseline
  riskScore += urgentStuckTickets.length * 35;
  riskScore += unassignedTickets.length * 15;
  riskScore += missingEstimates.length * 10;
  riskScore = Math.min(100, Math.max(0, riskScore));

  let overallRisk: SprintRiskAnalysis['overallRisk'] = 'low';
  if (riskScore >= 75) {
    overallRisk = 'critical';
  } else if (riskScore >= 50) {
    overallRisk = 'high';
  } else if (riskScore >= 30) {
    overallRisk = 'moderate';
  }

  const recommendations: string[] = [];
  if (urgentStuckTickets.length > 0) {
    recommendations.push(
      `🚨 Priority 1: Unblock ${urgentStuckTickets.length} high/urgent tickets immediately (${urgentStuckTickets.map((t) => t.id).join(', ')}).`
    );
  }
  if (unassignedTickets.length > 0) {
    recommendations.push(
      `👤 Assign dedicated owners to ${unassignedTickets.length} floating tasks to ensure accountability.`
    );
  }
  if (missingEstimates.length > 0) {
    recommendations.push(
      `⏱️ Estimate story points on ${missingEstimates.length} unestimated items during grooming to prevent velocity distortion.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('✅ Sprint is operating within optimal health parameters. Keep momentum!');
  }

  return {
    overallRisk,
    riskScore,
    urgentStuckTickets,
    unassignedTickets,
    missingEstimatesCount: missingEstimates.length,
    overdueCount: urgentStuckTickets.length,
    recommendations,
  };
}

/**
 * Decomposes a natural language feature request or bug report into 2-4 structured tickets.
 */
export function generateSmartTicketsFromPrompt(
  prompt: string,
  existingGroups: Array<{ id: string; name?: string; title?: string }>
): GeneratedTicketPlan {
  const defaultGroupId = existingGroups[0]?.id || 'group-backlog';
  const inProgressGroupId =
    existingGroups.find((g) => (g.name || g.title || '').toLowerCase().includes('progress'))?.id ||
    defaultGroupId;

  const lower = prompt.toLowerCase();
  const tickets: SmartGeneratedTicket[] = [];

  if (lower.includes('auth') || lower.includes('oauth') || lower.includes('login') || lower.includes('google')) {
    tickets.push({
      title: 'Configure OAuth 2.0 Provider Credentials & API Routes',
      description: `### Acceptance Criteria
- Given a user initiates Google/GitHub OAuth, when credentials match, then redirect to callback with auth code.
- Given expired tokens, then rotate refresh token seamlessly without user prompt.
- Secure environment secrets with HMAC verification.`,
      priority: 'urgent',
      estimate_points: 5,
      group_id: defaultGroupId,
      tags: ['auth', 'backend', 'security'],
    });

    tickets.push({
      title: 'Build Login Modal & Social Sign-In Buttons',
      description: `### Acceptance Criteria
- Given unauthenticated visitor, when clicking Login, then present accessible OAuth modal.
- Render branded Google and GitHub SVGs with tactile hover states.
- Handle error boundaries and display friendly error toasts on failure.`,
      priority: 'high',
      estimate_points: 3,
      group_id: inProgressGroupId,
      tags: ['auth', 'frontend', 'ui'],
    });

    tickets.push({
      title: 'OAuth Error Boundary & Session Recovery Tests',
      description: `### Acceptance Criteria
- Unit tests validating state exchange and CSRF token verification.
- Vitest coverage for network dropouts during OAuth redirect handshake.`,
      priority: 'medium',
      estimate_points: 2,
      group_id: defaultGroupId,
      tags: ['testing', 'qa', 'auth'],
    });
  } else if (lower.includes('dark') || lower.includes('contrast') || lower.includes('theme') || lower.includes('a11y')) {
    tickets.push({
      title: 'Harmonize CSS Custom Properties with DESIGN.md Tokens',
      description: `### Acceptance Criteria
- Audit all modal surfaces and buttons against WCAG 2.2 AA contrast standards.
- Enforce Supabase canvas-night (--bg-canvas) and emerald (--primary) tokens.`,
      priority: 'high',
      estimate_points: 3,
      group_id: inProgressGroupId,
      tags: ['design-system', 'css', 'a11y'],
    });

    tickets.push({
      title: 'Persistent Theme Toggle & Reduced-Motion Respect',
      description: `### Acceptance Criteria
- Given user toggles theme, persist choice in localStorage.
- Respect prefers-reduced-motion media query for all transitions.`,
      priority: 'medium',
      estimate_points: 2,
      group_id: defaultGroupId,
      tags: ['frontend', 'ux'],
    });
  } else if (lower.includes('billing') || lower.includes('stripe') || lower.includes('subscription')) {
    tickets.push({
      title: 'Integrate Stripe Customer Portal & Webhook Handler',
      description: `### Acceptance Criteria
- Handle invoice.paid and customer.subscription.deleted events with signature verification.
- Update workspace tier permissions dynamically.`,
      priority: 'urgent',
      estimate_points: 8,
      group_id: defaultGroupId,
      tags: ['billing', 'stripe', 'backend'],
    });

    tickets.push({
      title: 'Pricing Tiers UI & Usage Metering Badges',
      description: `### Acceptance Criteria
- Render Free, Pro, and Enterprise subscription cards.
- Show live workspace seat utilization against tier quota.`,
      priority: 'high',
      estimate_points: 5,
      group_id: inProgressGroupId,
      tags: ['billing', 'frontend', 'ui'],
    });
  } else {
    // General feature decomposition
    const cleanedTitle = prompt.trim().slice(0, 60);
    tickets.push({
      title: `[Core] ${cleanedTitle}`,
      description: `### Feature Specification
${prompt}

### Acceptance Criteria
- Given valid user input, when the action is executed, then update state immediately.
- Preserve OCC monotonic version integrity on all mutations.
- Provide error boundary fallback on unexpected exception.`,
      priority: 'high',
      estimate_points: 5,
      group_id: inProgressGroupId,
      tags: ['feature', 'core'],
    });

    tickets.push({
      title: `[QA] Automated Vitest Unit & Integration Tests for "${cleanedTitle}"`,
      description: `### Acceptance Criteria
- Unit tests covering happy path and edge cases.
- Maintain workspace 80%+ test coverage rule.`,
      priority: 'medium',
      estimate_points: 3,
      group_id: defaultGroupId,
      tags: ['qa', 'testing'],
    });
  }

  return {
    prompt,
    tickets,
    rationale: `Decomposed request into ${tickets.length} structured tickets with clear acceptance criteria and story point estimates.`,
  };
}

/**
 * Rebalances team workload across workspace members.
 */
export function rebalanceWorkload(
  items: BoardItem[],
  members: WorkspaceMember[]
): WorkloadRebalancePlan {
  const memberLoads: MemberWorkload[] = members.map((m) => {
    const memberName = getMemberName(m);
    const memberItems = items.filter((i) => getItemAssigneeName(i) === memberName && i.status !== 'Done');
    const points = memberItems.reduce((acc, curr) => acc + getItemPoints(curr), 0);
    const ticketCount = memberItems.length;

    let capacityStatus: MemberWorkload['capacityStatus'] = 'optimal';
    if (points === 0) capacityStatus = 'available';
    else if (points <= 4) capacityStatus = 'underloaded';
    else if (points >= 12) capacityStatus = 'overloaded';
    else if (points >= 8) capacityStatus = 'heavy';

    return {
      userId: m.user_id,
      name: memberName,
      points,
      ticketCount,
      capacityStatus,
    };
  });

  const totalAssignedPoints = memberLoads.reduce((sum, m) => sum + m.points, 0);
  const averagePointsPerMember =
    members.length > 0 ? Math.round((totalAssignedPoints / members.length) * 10) / 10 : 0;

  // Determine rebalance recommendations
  const recommendedShifts: WorkloadShiftRecommendation[] = [];
  const overloaded = memberLoads.filter((m) => m.capacityStatus === 'overloaded' || m.capacityStatus === 'heavy');
  const available = memberLoads.filter((m) => m.capacityStatus === 'available' || m.capacityStatus === 'underloaded');

  if (overloaded.length > 0 && available.length > 0) {
    for (const heavy of overloaded) {
      const candidateItem = items.find(
        (i) => getItemAssigneeName(i) === heavy.name && i.status !== 'Done' && getItemPoints(i) > 0
      );
      const recipient = available[0];

      if (candidateItem && recipient) {
        recommendedShifts.push({
          ticketId: candidateItem.id,
          ticketTitle: candidateItem.title,
          fromMemberName: heavy.name,
          toMemberName: recipient.name,
          points: getItemPoints(candidateItem) || 3,
          reason: `Relieve ${heavy.name} (${heavy.points} pts) by shifting to ${recipient.name} (${recipient.points} pts).`,
        });
      }
    }
  }

  return {
    memberLoads,
    averagePointsPerMember,
    recommendedShifts,
  };
}

/**
 * Parses natural language search terms into matching ticket IDs.
 */
export function parseNaturalLanguageFilter(query: string, items: BoardItem[]): FilterMatchResult {
  const normalized = query.toLowerCase().trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);

  const matched = items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(normalized);
    const idMatch = item.id.toLowerCase().includes(normalized);
    const assigneeName = getItemAssigneeName(item);
    const assigneeMatch = assigneeName ? assigneeName.toLowerCase().includes(normalized) : false;
    const statusMatch = item.status && item.status.toLowerCase().includes(normalized);
    const priorityMatch = item.priority && item.priority.toLowerCase().includes(normalized);

    // Multi-token match
    const allTokensMatch = tokens.every((tok) => {
      return (
        item.title.toLowerCase().includes(tok) ||
        item.id.toLowerCase().includes(tok) ||
        (assigneeName ? assigneeName.toLowerCase().includes(tok) : false) ||
        (item.status && item.status.toLowerCase().includes(tok)) ||
        (item.priority && item.priority.toLowerCase().includes(tok))
      );
    });

    return titleMatch || idMatch || assigneeMatch || statusMatch || priorityMatch || allTokensMatch;
  });

  return {
    query,
    matchedItemIds: matched.map((i) => i.id),
    filterTags: tokens,
  };
}

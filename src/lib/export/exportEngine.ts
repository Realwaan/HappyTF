import { Board, BoardGroup, BoardItem } from '../../types';

function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportBoardToCsv(board: Board, items: BoardItem[]): string {
  const headers = [
    'Ticket Number',
    'Title',
    'Status',
    'Priority',
    'Assignee',
    'Start Date',
    'Due Date',
    'SLA Deadline',
    'Tags',
    'Version',
    'Description',
  ];

  const rows = items.map((item) => {
    return [
      escapeCsvField(item.ticket_number || item.id),
      escapeCsvField(item.title),
      escapeCsvField(item.status),
      escapeCsvField(item.priority),
      escapeCsvField(item.assignee?.name || 'Unassigned'),
      escapeCsvField(item.start_date || ''),
      escapeCsvField(item.due_date || ''),
      escapeCsvField(item.sla_due_at || ''),
      escapeCsvField(item.tags ? item.tags.join('; ') : ''),
      escapeCsvField(item.version || 1),
      escapeCsvField(item.description || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportBoardToJson(
  board: Board,
  groups: BoardGroup[] = [],
  items: BoardItem[]
): string {
  const payload = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    board: {
      id: board.id,
      name: board.name,
      description: board.description,
      workspace_id: board.workspace_id,
      created_at: (board as any).created_at || board.updated_at,
      updated_at: board.updated_at,
    },
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      position: g.position,
    })),
    items: items.map((item) => ({
      ...item,
      exportedAt: new Date().toISOString(),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

export function exportBoardToMarkdown(board: Board, items: BoardItem[]): string {
  const total = items.length;
  const done = items.filter((i) => i.status === 'Done').length;
  const inProgress = items.filter((i) => i.status === 'Working on it' || i.status === 'In Review').length;
  const stuck = items.filter((i) => i.status === 'Stuck').length;

  const headerSection = `# ${board.name}\n\n${board.description || 'Sprint & Task Board Export'}\n\n`;
  const summarySection = `### Board Summary\n- **Total Tickets:** ${total}\n- **Done:** ${done}\n- **In Progress:** ${inProgress}\n- **Stuck:** ${stuck}\n- **Exported On:** ${new Date().toLocaleDateString()}\n\n`;

  const tableHeader = `### Tickets\n\n| Ticket | Title | Status | Priority | Assignee | Due Date |\n|---|---|---|---|---|---|\n`;
  const tableRows = items
    .map((item) => {
      const ticketNum = item.ticket_number ? `\`${item.ticket_number}\`` : `\`${item.id}\``;
      const title = item.title.replace(/\|/g, '\\|');
      const status = item.status;
      const priority = item.priority || 'medium';
      const assignee = item.assignee?.name || 'Unassigned';
      const due = item.due_date || '-';
      return `| ${ticketNum} | ${title} | ${status} | ${priority} | ${assignee} | ${due} |`;
    })
    .join('\n');

  return headerSection + summarySection + tableHeader + tableRows + '\n';
}

function parseCsvLines(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        // Ignore carriage return
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function importTicketsFromCsv(
  csvText: string,
  targetBoardId: string,
  targetGroupId: string
): { success: boolean; items: BoardItem[]; errors: string[] } {
  const errors: string[] = [];
  const rawRows = parseCsvLines(csvText.trim());

  if (rawRows.length < 2) {
    return {
      success: false,
      items: [],
      errors: ['CSV file must contain a header row and at least one data row.'],
    };
  }

  const rawHeaders = rawRows[0].map((h) => h.trim().toLowerCase());
  const titleIdx = rawHeaders.findIndex((h) => h === 'title');

  if (titleIdx === -1) {
    return {
      success: false,
      items: [],
      errors: ['Missing required column: "Title"'],
    };
  }

  const ticketNumIdx = rawHeaders.findIndex((h) => h.includes('ticket') || h.includes('number'));
  const statusIdx = rawHeaders.findIndex((h) => h === 'status');
  const priorityIdx = rawHeaders.findIndex((h) => h === 'priority');
  const assigneeIdx = rawHeaders.findIndex((h) => h.includes('assignee'));
  const startDateIdx = rawHeaders.findIndex((h) => h.includes('start'));
  const dueDateIdx = rawHeaders.findIndex((h) => h.includes('due'));
  const tagsIdx = rawHeaders.findIndex((h) => h === 'tags');
  const descIdx = rawHeaders.findIndex((h) => h.includes('desc'));

  const parsedItems: BoardItem[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (row.length === 1 && !row[0].trim()) continue; // Skip blank lines

    const rawTitle = row[titleIdx]?.trim();
    if (!rawTitle) {
      errors.push(`Row ${r + 1}: Missing title`);
      continue;
    }

    const rawTicketNum = ticketNumIdx !== -1 ? row[ticketNumIdx]?.trim() : '';
    const ticketNumber = rawTicketNum || `TK-IMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const rawStatus = (statusIdx !== -1 ? row[statusIdx]?.trim() : 'Working on it') as BoardItem['status'];
    const validStatus: BoardItem['status'] = ['Working on it', 'In Review', 'Done', 'Stuck', 'Pending'].includes(rawStatus)
      ? rawStatus
      : 'Working on it';

    const rawPriority = (priorityIdx !== -1 ? row[priorityIdx]?.trim().toLowerCase() : 'medium') as BoardItem['priority'];
    const validPriority: BoardItem['priority'] = ['urgent', 'high', 'medium', 'low'].includes(rawPriority)
      ? rawPriority
      : 'medium';

    const rawAssignee = assigneeIdx !== -1 ? row[assigneeIdx]?.trim() : '';
    const assignee = rawAssignee && rawAssignee !== 'Unassigned'
      ? { id: `usr-csv-${Date.now()}-${r}`, name: rawAssignee, avatar: '' }
      : undefined;

    const rawTags = tagsIdx !== -1 ? row[tagsIdx]?.trim() : '';
    const tags = rawTags
      ? rawTags
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const item: BoardItem = {
      id: `item-imp-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
      ticket_number: ticketNumber,
      board_id: targetBoardId,
      group_id: targetGroupId,
      title: rawTitle,
      status: validStatus,
      status_color: validStatus === 'Done' ? '#10b981' : validStatus === 'Stuck' ? '#ef4444' : '#f59e0b',
      priority: validPriority,
      assignee,
      start_date: startDateIdx !== -1 ? row[startDateIdx]?.trim() || undefined : undefined,
      due_date: dueDateIdx !== -1 ? row[dueDateIdx]?.trim() || 'Next week' : 'Next week',
      tags,
      description: descIdx !== -1 ? row[descIdx]?.trim() : '',
      version: 1,
      activities: [],
      comments: [],
    };

    parsedItems.push(item);
  }

  return {
    success: parsedItems.length > 0,
    items: parsedItems,
    errors,
  };
}

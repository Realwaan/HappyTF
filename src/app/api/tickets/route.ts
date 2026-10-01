import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cacheGet, cacheSet, cacheDelete, checkRateLimit } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isDeployed } from '@/lib/environment';
import { addServerMessage } from '@/lib/serverChannelsStore';
import { getServerBoardItems, addServerBoardItem } from '@/lib/serverTicketsStore';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CreateTicketSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(500),
  board_id: z.string().min(1, 'board_id is required'),
  workspace_id: z.string().min(1, 'workspace_id is required'),
  group_id: z.string().optional(),
  description: z.string().max(10000).optional(),
  status: z.string().optional(),
  status_color: z.string().optional(),
  priority: z.string().optional(),
  severity: z.string().optional(),
  due_date: z.string().optional(),
  assignee: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.array(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('board_id');

  if (!boardId) {
    return NextResponse.json({ error: 'board_id query parameter is required' }, { status: 400 });
  }

  const cacheKey = `tickets:board:${boardId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached, source: 'cache' }, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  const isBoardUuid = UUID_REGEX.test(boardId);
  if (isSupabaseConfigured() && isBoardUuid) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('*, ticket_comments(*), ticket_activities(*)')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        await cacheSet(cacheKey, data, 60);
        return NextResponse.json({ data, source: 'database' });
      }
    } catch (err) {
      console.warn('[API Tickets GET Supabase fallback]', err);
    }
  }

  // Graceful persistent store for demo boards & non-UUID boards
  const serverItems = getServerBoardItems(boardId);
  return NextResponse.json({ data: serverItems, source: 'server-store' });
}

export async function POST(request: NextRequest) {
  // Rate limiting per IP / client
  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const rate = await checkRateLimit(`create-ticket:${clientIp}`, 30, 60);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before creating more tickets.' },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = CreateTicketSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid ticket payload', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      id,
      title,
      board_id,
      workspace_id,
      group_id,
      priority,
      severity,
      due_date,
      assignee,
      tags,
      description,
      status,
      status_color,
      subtasks,
    } = parseResult.data;

    const ticketNumber = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket = {
      id: id || `item-${Date.now()}`,
      ticket_number: ticketNumber,
      workspace_id,
      board_id,
      group_id: group_id || 'group-1',
      title: title.trim(),
      description: description || '',
      status: status || 'Working on it',
      status_color: status_color || '#f59e0b',
      priority: priority || 'medium',
      severity: severity || 'minor',
      due_date: due_date || 'Next week',
      assignee: assignee || (isDeployed() ? undefined : { id: 'usr-demo-001', name: 'Alex Rivera', avatar: '' }),
      tags: tags || ['Ticket'],
      subtasks: subtasks || [],
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: `act-${Date.now()}`,
          author_name: assignee?.name || (isDeployed() ? 'Team Member' : 'Alex Rivera'),
          action: `Created ticket ${ticketNumber}`,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
      comments: [],
    };

    // Save to persistent server store
    addServerBoardItem(newTicket as any);

    const isBoardUuid = UUID_REGEX.test(board_id);
    const isTicketUuid = UUID_REGEX.test(newTicket.id);

    if (isSupabaseConfigured() && isBoardUuid && isTicketUuid) {
      try {
        const supabase = createClient();
        await supabase.from('tickets').insert([newTicket]);
      } catch (e) {
        console.warn('[Supabase Insert Fallback]', e);
      }
    }

    // Invalidate cache
    await cacheDelete(`tickets:board:${board_id}`);

    // Native team channel alert for high/urgent priority tickets (internal Slack-like flow)
    if (priority === 'urgent' || priority === 'high') {
      try {
        const assignedName = newTicket.assignee?.name || 'Unassigned';
        addServerMessage({
          id: `msg-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          channel_id: 'chan-eng-alerts',
          workspace_id: workspace_id,
          user_id: 'usr-bot',
          user_name: 'HappyTF Alerts Bot',
          user_avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          content: `🚨 **[${(priority || 'HIGH').toUpperCase()} PRIORITY]** Ticket **#${ticketNumber}** created: *${newTicket.title}*\nStatus: **${newTicket.status}** • Assigned to: **${assignedName}**`,
          linked_ticket_number: ticketNumber,
          reactions: [{ emoji: '👀', count: 1, users: ['HappyTF Bot'] }],
          reply_count: 0,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[Internal Channel Alert Dispatch Failed]', e);
      }
    }

    return NextResponse.json({ data: newTicket, success: true }, { status: 201 });
  } catch (error) {
    console.error('[API Tickets POST]', error);
    return NextResponse.json({ error: 'Invalid ticket payload' }, { status: 400 });
  }
}

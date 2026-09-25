import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet, cacheDelete, checkRateLimit } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { dispatchSlackNotification } from '@/lib/integrations/slack';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('board_id');
  const workspaceId = searchParams.get('workspace_id');

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

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('*, ticket_comments(*), ticket_activities(*)')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await cacheSet(cacheKey, data, 60);
      return NextResponse.json({ data, source: 'database' });
    } catch (err) {
      console.error('[API Tickets GET]', err);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

  // Graceful fallback for local development / demo mode
  return NextResponse.json({ data: [], source: 'demo-fallback' });
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
    const body = await request.json();
    const { title, board_id, workspace_id, group_id, priority, severity, due_date, assignee, tags, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!board_id || !workspace_id) {
      return NextResponse.json({ error: 'board_id and workspace_id are required' }, { status: 400 });
    }

    const ticketNumber = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket = {
      id: `ticket-${Date.now()}`,
      ticket_number: ticketNumber,
      workspace_id,
      board_id,
      group_id: group_id || null,
      title: title.trim(),
      description: description || '',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: priority || 'medium',
      severity: severity || 'minor',
      due_date: due_date || 'Next week',
      assignee: assignee || { id: 'usr-demo-001', name: 'Alex Rivera', avatar: '' },
      tags: tags || ['Ticket'],
      subtasks: [],
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: `act-${Date.now()}`,
          author_name: assignee?.name || 'Alex Rivera',
          action: `Created ticket ${ticketNumber}`,
          timestamp: 'Just now',
        },
      ],
      comments: [],
    };

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { data, error } = await supabase.from('tickets').insert([newTicket]).select().single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      // Invalidate cache
      await cacheDelete(`tickets:board:${board_id}`);
      
      // Dispatch Slack notification if priority is urgent or high
      if (priority === 'urgent' || priority === 'high') {
        dispatchSlackNotification({
          workspaceId: workspace_id,
          ticketNumber,
          title: newTicket.title,
          priority: newTicket.priority,
          status: newTicket.status,
          assigneeName: newTicket.assignee.name,
          ticketId: newTicket.id,
        }).catch((e) => console.warn('[Slack Webhook Dispatch Failed]', e));
      }

      return NextResponse.json({ data, success: true }, { status: 201 });
    }

    // Invalidate cache
    await cacheDelete(`tickets:board:${board_id}`);

    // If Slack webhook is configured for this workspace, dispatch alert
    if (priority === 'urgent' || priority === 'high') {
      dispatchSlackNotification({
        workspaceId: workspace_id,
        ticketNumber,
        title: newTicket.title,
        priority: newTicket.priority,
        status: newTicket.status,
        assigneeName: newTicket.assignee.name,
        ticketId: newTicket.id,
      }).catch((e) => console.warn('[Slack Webhook Dispatch Failed]', e));
    }

    return NextResponse.json({ data: newTicket, success: true }, { status: 201 });
  } catch (error) {
    console.error('[API Tickets POST]', error);
    return NextResponse.json({ error: 'Invalid ticket payload' }, { status: 400 });
  }
}

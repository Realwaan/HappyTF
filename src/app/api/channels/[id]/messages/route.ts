import { NextRequest, NextResponse } from 'next/server';
import { getServerMessages, addServerMessage } from '@/lib/serverChannelsStore';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ChannelMessage } from '@/types';
import { getSafeAvatar } from '@/lib/avatarHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id'); // null or string

  try {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('channel_messages')
          .select('*')
          .eq('channel_id', channelId);

        if (parentId) {
          query = query.eq('parent_id', parentId);
        } else if (searchParams.has('root_only')) {
          query = query.is('parent_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, messages: data });
        }
      } catch (err) {
        console.warn('[Messages API] Supabase query fallback to local store', err);
      }
    }

    const messages = getServerMessages(channelId, parentId);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error('[Messages API GET]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      workspace_id,
      user_id,
      user_name,
      user_avatar,
      content,
      parent_id,
      linked_ticket_number,
      is_system,
    } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // Auto-detect ticket mention like #TK-2839 or TK-2839 in content if not explicitly provided
    let detectedTicket = linked_ticket_number;
    if (!detectedTicket) {
      const match = content.match(/#?(TK-\d{3,5})/i);
      if (match) {
        detectedTicket = match[1].toUpperCase();
      }
    }

    const safeAvatar = getSafeAvatar(user_avatar, user_name || 'Teammate');
    const wsId = workspace_id || 'ws-demo-01';

    const newMessage: ChannelMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channel_id: channelId,
      workspace_id: wsId,
      user_id: user_id || 'usr-demo-001',
      user_name: user_name || 'Alex Rivera',
      user_avatar: safeAvatar,
      content: content.trim(),
      parent_id: parent_id || null,
      linked_ticket_number: detectedTicket || null,
      reactions: [],
      reply_count: 0,
      is_system: Boolean(is_system),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('channel_messages')
          .insert({
            channel_id: channelId,
            workspace_id: wsId,
            user_id: user_id || null,
            user_name: user_name || 'Alex Rivera',
            user_avatar: safeAvatar,
            content: content.trim(),
            parent_id: parent_id || null,
            linked_ticket_number: detectedTicket || null,
            reactions: [],
            reply_count: 0,
          })
          .select()
          .single();

        if (!error && data) {
          addServerMessage(data);
          return NextResponse.json({ success: true, message: data });
        }
      } catch (err) {
        console.warn('[Messages API] Supabase insert fallback', err);
      }
    }

    const saved = addServerMessage(newMessage);
    return NextResponse.json({ success: true, message: saved });
  } catch (err: any) {
    console.error('[Messages API POST]', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}

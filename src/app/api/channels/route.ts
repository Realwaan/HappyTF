import { NextRequest, NextResponse } from 'next/server';
import { getServerChannels, addServerChannel } from '@/lib/serverChannelsStore';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { TeamChannel } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id') || 'ws-demo-01';

  try {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, channels: data });
        }
      } catch (err) {
        console.warn('[Channels API] Supabase query fallback to local store', err);
      }
    }

    const localChannels = getServerChannels(workspaceId);
    return NextResponse.json({ success: true, channels: localChannels });
  } catch (err: any) {
    console.error('[Channels API GET]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch channels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspace_id, name, topic, is_private, created_by } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const wsId = workspace_id || 'ws-demo-01';

    const newChannel: TeamChannel = {
      id: `chan-${Date.now()}`,
      workspace_id: wsId,
      name: cleanName,
      topic: topic || '',
      is_private: Boolean(is_private),
      member_count: 1,
      created_by: created_by || 'usr-demo-001',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('channels')
          .insert({
            workspace_id: wsId,
            name: cleanName,
            topic: topic || '',
            is_private: Boolean(is_private),
          })
          .select()
          .single();

        if (!error && data) {
          addServerChannel(data);
          return NextResponse.json({ success: true, channel: data });
        }
      } catch (err) {
        console.warn('[Channels API] Supabase insert fallback', err);
      }
    }

    const created = addServerChannel(newChannel);
    return NextResponse.json({ success: true, channel: created });
  } catch (err: any) {
    console.error('[Channels API POST]', err);
    return NextResponse.json({ error: err.message || 'Failed to create channel' }, { status: 500 });
  }
}

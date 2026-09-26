import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/redis';

export interface SlackWorkspaceConfig {
  webhookUrl: string;
  channelName: string;
  notifyUrgentOnly: boolean;
  notifyStatusChange: boolean;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId') || 'ws-acme-core';

  try {
    const config = await cacheGet<SlackWorkspaceConfig>(`happytf:slack:config:${workspaceId}`);
    return NextResponse.json({
      success: true,
      config: config || {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channelName: '#engineering-triage',
        notifyUrgentOnly: true,
        notifyStatusChange: true,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Slack Config GET Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve Slack configuration' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, webhookUrl, channelName, notifyUrgentOnly, notifyStatusChange } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Missing workspaceId' },
        { status: 400 }
      );
    }

    const config: SlackWorkspaceConfig = {
      webhookUrl: webhookUrl || '',
      channelName: channelName || '#engineering-triage',
      notifyUrgentOnly: Boolean(notifyUrgentOnly),
      notifyStatusChange: Boolean(notifyStatusChange),
      updatedAt: new Date().toISOString(),
    };

    // Persist in Redis with 30-day TTL (or persistent in-memory fallback)
    await cacheSet(`happytf:slack:config:${workspaceId}`, config, 30 * 24 * 3600);

    return NextResponse.json({
      success: true,
      message: 'Slack configuration saved successfully',
      config,
    });
  } catch (err) {
    console.error('[Slack Config POST Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save Slack configuration' },
      { status: 500 }
    );
  }
}

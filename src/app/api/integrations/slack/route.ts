import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cacheGet, cacheSet, checkRateLimit } from '@/lib/redis';

export interface SlackWorkspaceConfig {
  webhookUrl: string;
  channelName: string;
  notifyUrgentOnly: boolean;
  notifyStatusChange: boolean;
  updatedAt: string;
}

// Strict SSRF guard: only official Slack webhooks are permitted
const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_\-\/]+$/;

const SlackConfigSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  webhookUrl: z
    .string()
    .refine((url) => !url || SLACK_WEBHOOK_PATTERN.test(url), {
      message: 'Invalid Slack webhook URL. Must match https://hooks.slack.com/services/... and avoid internal networks.',
    })
    .optional()
    .or(z.literal('')),
  channelName: z.string().max(100).optional(),
  notifyUrgentOnly: z.boolean().optional(),
  notifyStatusChange: z.boolean().optional(),
});

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
  // 1. IP-based rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
  const rateLimit = await checkRateLimit(`ratelimit:slack_config:${ip}`, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
    );
  }

  try {
    const rawBody = await req.json();

    // 2. Server-side Zod validation & SSRF guards
    const parseResult = SlackConfigSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: parseResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { workspaceId, webhookUrl, channelName, notifyUrgentOnly, notifyStatusChange } = parseResult.data;

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

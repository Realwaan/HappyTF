import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { isValidSlackWebhookUrl } from '@/lib/integrations/slack';

const CreateTicketSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
  workspaceId: z.string().min(1),
  boardId: z.string().min(1),
  channelId: z.string().optional(),
});

const SlackConfigSchema = z.object({
  webhookUrl: z
    .string()
    .url()
    .regex(
      /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_\-\/]+$/,
      'Webhook URL must be a legitimate https://hooks.slack.com/services/... endpoint'
    ),
  channelName: z.string().trim().min(1).max(80).regex(/^[a-z0-9_\-]+$/),
  notifyOnTicketCreated: z.boolean().default(true),
  notifyOnStatusChange: z.boolean().default(true),
  notifyOnClaim: z.boolean().default(true),
});

describe('Security Validation & SSRF Defense Suite', () => {
  describe('Slack Webhook SSRF Shielding', () => {
    it('accepts legitimate Slack webhook URLs', () => {
      const validUrl = 'https://hooks.slack.com/services/T12345/B67890/abcdef1234567890';
      expect(isValidSlackWebhookUrl(validUrl)).toBe(true);

      const parsed = SlackConfigSchema.safeParse({
        webhookUrl: validUrl,
        channelName: 'support-ops',
      });
      expect(parsed.success).toBe(true);
    });

    it('blocks AWS/GCP cloud metadata SSRF vectors', () => {
      const awsMetadata = 'http://169.254.169.254/latest/meta-data/';
      expect(isValidSlackWebhookUrl(awsMetadata)).toBe(false);

      const parsed = SlackConfigSchema.safeParse({
        webhookUrl: awsMetadata,
        channelName: 'ops',
      });
      expect(parsed.success).toBe(false);
    });

    it('blocks localhost / loopback internal reconnaissance vectors', () => {
      expect(isValidSlackWebhookUrl('http://127.0.0.1:8080/admin')).toBe(false);
      expect(isValidSlackWebhookUrl('http://localhost:3000/internal')).toBe(false);
      expect(isValidSlackWebhookUrl('http://[::1]:9000/keys')).toBe(false);
    });

    it('blocks arbitrary third-party phishing or spoofing domains', () => {
      expect(isValidSlackWebhookUrl('https://evil-attacker.com/services/T123')).toBe(false);
      expect(isValidSlackWebhookUrl('https://hooks.slack.com.attacker.com/services/T123')).toBe(false);
      expect(isValidSlackWebhookUrl('ftp://hooks.slack.com/services/T123')).toBe(false);
    });
  });

  describe('Zod Schema Boundary Defense', () => {
    it('validates legitimate ticket creation payloads', () => {
      const validPayload = {
        title: 'Fix edge certificate expiration',
        priority: 'High',
        status: 'Open',
        workspaceId: 'ws-demo-001',
        boardId: 'b-ops-101',
      };
      const result = CreateTicketSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects empty or whitespace-only ticket titles', () => {
      const payload = {
        title: '   ',
        workspaceId: 'ws-demo-001',
        boardId: 'b-ops-101',
      };
      const result = CreateTicketSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects ticket titles exceeding maximum length limit', () => {
      const payload = {
        title: 'A'.repeat(201),
        workspaceId: 'ws-demo-001',
        boardId: 'b-ops-101',
      };
      const result = CreateTicketSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects invalid priority enumeration injection', () => {
      const payload = {
        title: 'Malformed Ticket',
        priority: 'SuperCriticalUltraDanger',
        workspaceId: 'ws-demo-001',
        boardId: 'b-ops-101',
      };
      const result = CreateTicketSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});

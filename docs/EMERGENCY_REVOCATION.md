# Emergency Credential Revocation & Secret Rotation Protocol

> **Purpose**: Rapid invalidation of leaked tokens, database credentials, API keys, and session cookies during an active compromise.

---

## 1. Key Invalidation Priority Sequence

If a credential leak is detected (e.g. GitHub Secret Scanning alert or unauthorized access anomaly):

### 1. Supabase Service Role Key & JWT Secret
1. Navigate to **Supabase Dashboard** > **Project Settings** > **API**.
2. Click **Generate New API Secret Key** (`service_role` and `anon`).
3. Click **Roll JWT Secret Key** (this terminates ALL active client sessions immediately).
4. Update `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in production environment variables (e.g., Vercel Secrets).
5. Trigger an instant zero-downtime redeployment.

### 2. Redis Connection String & Auth Token
1. Access the Upstash / Redis management console.
2. Invalidate the primary `REDIS_PASSWORD` / `UPSTASH_REDIS_REST_TOKEN`.
3. Set secondary password as active, update `REDIS_URL` in environment secrets.

### 3. Slack Webhooks & GitHub Secrets
1. In Slack App Management: delete any compromised Incoming Webhook URLs immediately.
2. In GitHub Repository Settings: regenerate `GITHUB_WEBHOOK_SECRET` and update both GitHub and HappyTF environment variables.

---

## 2. Global Session Revocation

To terminate all active user sessions globally in an emergency:
```sql
-- Revoke all active refresh tokens in Supabase Auth
UPDATE auth.refresh_tokens SET revoked = true WHERE revoked = false;

-- Terminate active user sessions
DELETE FROM auth.sessions;
```

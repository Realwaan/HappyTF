# Staging Environment & Smoke Test Verification

> **Purpose**: Verify release builds against production-like configuration, database schemas, and external integrations prior to public rollout.

---

## 1. Staging Target Architecture

- **URL**: `https://staging.happytf.dev`
- **Environment**: Vercel Preview Deployment / Staging Cluster
- **Database**: Isolated Supabase Staging Project with sanitized test fixtures.
- **Redis**: Staging cluster namespace (`happytf:staging:*`).

---

## 2. Automated Smoke Test Checklist

Execute these 5 critical path checks prior to promoting a build from staging to production:

```bash
# 1. Health & Dependency Readiness
curl -f -s https://staging.happytf.dev/api/health | grep '"status":"ok"'

# 2. Authentication Flow
# Test OAuth callback and magic link redirects
curl -I https://staging.happytf.dev/auth/callback

# 3. Optimistic Concurrency Control (OCC)
# Submit concurrent board updates to verify HTTP 409 conflict detection
npm run test:e2e:occ

# 4. Realtime CDC Handlers
# Verify Supabase postgres_changes channel handshake
npm run test:realtime

# 5. Security Header Validation
curl -s -I https://staging.happytf.dev/ | grep -i "content-security-policy"
curl -s -I https://staging.happytf.dev/ | grep -i "strict-transport-security"
```

---

## 3. Promotion Gate Criteria
A release is **approved for production** only when:
- 100% of smoke test endpoints return HTTP 200/expected responses.
- Browser console error logs are completely clean (no React hydration or script errors).
- Zero `[BLOCKER]` items are open in the pre-deployment checklist.

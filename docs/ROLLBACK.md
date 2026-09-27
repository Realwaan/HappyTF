# Deployment Rollback Plan & Recovery Procedure

> **Objective**: Restore the last known stable production release in under 5 minutes with zero data loss.

---

## 1. Quick Revert Protocol (< 5 Minutes)

### Step 1: Trigger Immediate Traffic Reroute / Vercel Rollback
If deployed on Vercel or cloud edge:
1. Navigate to the **Vercel Dashboard** > **Deployments**.
2. Locate the previous successful production deployment (tagged `v0.1.0` or previous commit).
3. Click the **...** menu on that deployment and select **Instant Rollback**.
4. Traffic is immediately redirected to the previous immutable serverless build within ~10 seconds.

Alternatively via CLI:
```bash
npx vercel rollback [DEPLOYMENT_URL_OR_ID]
```

### Step 2: Version Control Revert
In your local release or CI branch:
```bash
# 1. Fetch all latest tags
git fetch --all --tags

# 2. Revert the problematic release commit cleanly
git revert -m 1 HEAD --no-edit

# 3. Tag the hotfix release
git tag -a v0.1.1-rollback -m "Emergency Rollback of v0.1.1"

# 4. Push to origin main to trigger automated CI/CD pipeline
git push origin main --tags
```

---

## 2. Database & State Backward Compatibility Rule

All database schema migrations in HappyTF follow the **Expand and Contract (Blue-Green)** pattern:
- **No breaking column renames**: Columns are deprecated, never deleted or renamed in a single step.
- **Additive migrations first**: New columns are nullable or have sensible defaults.
- If a rollback occurs, the previous code version continues to execute queries safely against the expanded database schema without SQL errors.

---

## 3. Communication & Incident Logging
- Notify `#engineering-triage` and `#general` in Slack / Discord.
- Post status update: `[SEV-1] Production rolled back to previous stable build. Root cause investigation active.`
- Open a post-mortem tracking ticket within 24 hours.

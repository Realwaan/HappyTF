# Data Breach Notification & Response Plan

> **Compliance**: GDPR Article 33 & 34, CCPA/CPRA, and SOC 2 Trust Services Criteria.

---

## 1. 72-Hour Regulatory Notification Protocol

Under GDPR Article 33, any personal data breach must be reported to the lead supervisory authority within **72 hours** of becoming aware of the breach.

### Phase 1: Detection & Triage (Hours 0 – 12)
1. **Immediate Escalation**: Contact Security Incident Response Team (SIRT) via `security@happytf.dev`.
2. **Containment**: Revoke compromised credentials, rotate database and Redis access keys, and isolate affected serverless instances or VPC subnets.
3. **Forensic Logging**: Snapshot server logs, API gateway request records, and Supabase audit logs. Do NOT tamper with compromised servers before imaging.

### Phase 2: Assessment & Impact Analysis (Hours 12 – 36)
1. Categorize impacted data subjects:
   - Credentials (hashed passwords, auth tokens, session cookies)
   - Profile data (emails, display names, avatars)
   - Workspace data (board items, comments, attachments)
2. Determine risk to rights and freedoms of individuals (High / Medium / Low).

### Phase 3: Supervisory Authority Notification (Hours 36 – 72)
Submit initial notification to the competent Data Protection Authority (DPA) containing:
- Nature of the personal data breach including categories and approximate number of data subjects.
- Name and contact details of Data Protection Officer (DPO) / Security Contact.
- Likely consequences and potential risks.
- Measures taken or proposed to remediate the breach.

### Phase 4: Affected User Notification (Without Undue Delay)
If the breach is likely to result in high risk to data subjects:
- Direct email communication with transparent timeline.
- Force session invalidation across all active devices (`supabase.auth.admin.signOut()`).
- Recommend password reset and credential hygiene.

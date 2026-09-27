# Transport Layer Security (TLS) & Infrastructure Guide

> **Scope**: SSL/TLS certificate management, automatic renewal, cipher suite enforcement, and edge proxy configuration.

---

## 1. TLS Certificate Specifications

- **Protocol Versions**: TLS 1.3 preferred; TLS 1.2 minimum. TLS 1.0 and 1.1 are strictly disabled.
- **Key Exchange / Ciphers**: ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-RSA-AES128-GCM-SHA256, ECDHE-ECDSA-AES256-GCM-SHA384.
- **Strict Transport Security (HSTS)**:
  - Header: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - Preloaded onto the official Chrome/Firefox HSTS preload list.

---

## 2. Automated Certificate Provisioning & Renewal

Production certificates are automated via ACME (Let's Encrypt / Google Trust Services / Cloudflare):
- **Vercel / Cloud Edge**: Zero-touch automated certificate issuance and renewal via Let's Encrypt and Cloudflare Universal SSL. Renewals occur automatically 30 days before expiration.
- **Monitoring & Expiration Alerts**:
  - Prometheus / Datadog SSL monitor triggers alert 14 days before certificate expiration.
  - Periodic cert check command:
    ```bash
    openssl s_client -servername happytf.dev -connect happytf.dev:443 2>/dev/null | openssl x509 -noout -dates
    ```

---

## 3. Reverse Proxy & HTTPS Redirection

All HTTP port 80 traffic is redirected to HTTPS port 443 with HTTP 301 Permanent Redirect enforced at:
1. Cloud edge CDN (Cloudflare / Vercel Edge).
2. Application Edge Middleware (`src/middleware.ts` inspecting `x-forwarded-proto === 'http'`).

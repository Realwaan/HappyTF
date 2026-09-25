import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, FileText, Eye, Database, Globe, CheckCircle2 } from 'lucide-react';
import '../../styles/legal.css';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'HappyTF Work OS Privacy Policy. Understand how we protect your workspace data, respect cookie preferences, and guarantee GDPR and CCPA compliance.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page-root">
      {/* Navigation Header */}
      <header className="legal-header glass-panel">
        <div className="legal-header-inner">
          <Link href="/" className="back-link">
            <ArrowLeft size={16} />
            <span>Return to Workspace</span>
          </Link>
          <div className="brand-badge">
            <span className="brand-emoji">⚡</span>
            <span className="brand-name font-bold">HappyTF Work OS</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="legal-container">
        <div className="legal-hero">
          <div className="hero-pill">
            <Shield size={14} className="text-primary" />
            <span>Privacy & Data Protection</span>
          </div>
          <h1>Privacy Policy</h1>
          <p className="effective-date text-muted">
            Last Updated & Effective: <strong>September 8, 2026</strong>
          </p>
        </div>

        <div className="legal-content-card glass-panel">
          <section className="legal-section">
            <h2>1. Introduction & Overview</h2>
            <p>
              At <strong>HappyTF Work OS</strong> (&quot;HappyTF&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we believe that productivity software should never compromise your privacy. This Privacy Policy details our practices concerning the collection, usage, processing, and disclosure of information when you access or use our collaborative work management platform, boards, sprint tracking tools, and related services.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>
            <p>We collect information in the following categories:</p>
            <ul className="legal-list">
              <li>
                <strong>Account Credentials:</strong> Full name, professional email address, avatar preferences, and authentication tokens when you register or sign in.
              </li>
              <li>
                <strong>Workspace &amp; Board Data:</strong> Board titles, sprint statuses, task descriptions, custom tags, assignees, deadlines, and activity histories that you and your team create.
              </li>
              <li>
                <strong>System &amp; Device Information:</strong> Anonymized browser type, operating system version, and general timezone data required to synchronize real-time updates and prevent unauthorized account access.
              </li>
              <li>
                <strong>Strictly Necessary Session Data:</strong> Ephemeral session cookies required to preserve your logged-in state across browser refreshes.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>Your data is processed strictly for the following operational purposes:</p>
            <div className="features-grid">
              <div className="feature-box">
                <Database size={18} className="text-primary mb-2" />
                <h3>Platform Execution</h3>
                <p>To provide, power, and synchronize real-time multi-user Kanban boards and sprint metrics across your workspaces.</p>
              </div>
              <div className="feature-box">
                <Lock size={18} className="text-primary mb-2" />
                <h3>Account Security</h3>
                <p>To detect malicious traffic, prevent spam submissions via bot detection, and enforce session integrity.</p>
              </div>
              <div className="feature-box">
                <Eye size={18} className="text-primary mb-2" />
                <h3>Zero Ad Tracking</h3>
                <p>We do not sell, rent, or trade your personal or workspace information to third-party ad brokers.</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>4. Cookie Governance &amp; Telemetry</h2>
            <p>
              HappyTF provides a granular cookie consent mechanism. We distinguish between:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Essential Cookies:</strong> Essential tokens for authentication, session verification, and CSRF protection. These cannot be disabled as the platform cannot function without them.
              </li>
              <li>
                <strong>Privacy-First Analytics:</strong> Aggregated, anonymized performance metrics designed to detect platform latencies and optimize sprint board loading times. These are only enabled if you provide explicit opt-in consent.
              </li>
            </ul>
            <p className="mt-2">
              You can adjust or revoke your cookie choices at any time via the platform settings or consent banner.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. GDPR &amp; CCPA Rights</h2>
            <p>Regardless of your geographic location, we provide all users with fundamental privacy rights:</p>
            <ul className="legal-list">
              <li><strong>Right to Access:</strong> You may request a complete export of your personal and workspace data.</li>
              <li><strong>Right to Rectification:</strong> You can update and amend your profile, email, or credentials directly in Settings.</li>
              <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> You may delete your account and associated workspaces permanently at any time.</li>
              <li><strong>Right to Restrict Processing:</strong> You can opt out of non-essential analytics tracking with a single click.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Data Security &amp; Encryption</h2>
            <p>
              All traffic between your browser and our servers is forced through modern HTTPS with 256-bit TLS encryption. At rest, data is safeguarded using industry-standard AES-256 encryption. We enforce row-level security (RLS) on all database queries so workspace members can only access authorized board assets.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Contact Information</h2>
            <p>
              If you have any questions, compliance requests, or data privacy inquiries, please contact our Data Protection Officer:
            </p>
            <div className="contact-card">
              <p><strong>HappyTF Privacy Operations</strong></p>
              <p className="text-muted">Email: <a href="mailto:privacy@happytf.work" className="text-primary-link">privacy@happytf.work</a></p>
              <p className="text-muted">Security Inquiries: <a href="mailto:security@happytf.work" className="text-primary-link">security@happytf.work</a></p>
            </div>
          </section>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="footer-inner text-muted">
          <span>&copy; {new Date().getFullYear()} HappyTF Work OS. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="footer-link">Terms of Service</Link>
            <Link href="/" className="footer-link">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

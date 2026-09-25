import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileCheck, ArrowLeft, ShieldAlert, Cpu, Award, HelpCircle } from 'lucide-react';
import '../../styles/legal.css';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'HappyTF Work OS Terms of Service. Understand terms of use, workspace ownership, subscription agreements, and user responsibilities.',
};

export default function TermsOfServicePage() {
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
            <FileCheck size={14} className="text-primary" />
            <span>Platform Agreement</span>
          </div>
          <h1>Terms of Service</h1>
          <p className="effective-date text-muted">
            Last Updated &amp; Effective: <strong>September 8, 2026</strong>
          </p>
        </div>

        <div className="legal-content-card glass-panel">
          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or utilizing the <strong>HappyTF Work OS</strong> application (&quot;Service&quot;, &quot;Platform&quot;), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Service. If you are entering into this agreement on behalf of a company, organization, or enterprise entity, you warrant that you possess the authority to bind such entity.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. User Accounts &amp; Authentication</h2>
            <p>
              To access collaborative workspaces, you must register an account using authentic and verifiable credentials. You are solely responsible for:
            </p>
            <ul className="legal-list">
              <li>Safeguarding your authentication tokens, passwords, and magic link access.</li>
              <li>Maintaining confidentiality of credentials and preventing unauthorized entry into your workspaces.</li>
              <li>Promptly notifying our security team at <a href="mailto:security@happytf.work" className="text-primary-link">security@happytf.work</a> if you suspect account compromise.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Acceptable Use Policy</h2>
            <p>You agree not to misuse the Platform. Specifically, you agree that you will not:</p>
            <div className="features-grid">
              <div className="feature-box">
                <ShieldAlert size={18} className="text-danger mb-2" />
                <h3>No Malicious Activity</h3>
                <p>Do not upload malware, exploit automated bots, or execute denial of service attacks against HappyTF infrastructure.</p>
              </div>
              <div className="feature-box">
                <Cpu size={18} className="text-warning mb-2" />
                <h3>No Rate Abuse</h3>
                <p>Do not abuse automated APIs, scrapers, or excessive synchronization loops beyond normal workspace usage.</p>
              </div>
              <div className="feature-box">
                <Award size={18} className="text-primary mb-2" />
                <h3>Respect Rights</h3>
                <p>Do not host, share, or transmit intellectual property or proprietary content that infringes upon third-party rights.</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>4. Workspace Ownership &amp; Intellectual Property</h2>
            <p>
              <strong>Your Content Belongs to You:</strong> You retain complete ownership, copyright, and intellectual property rights over all board cards, sprint items, attachments, workflows, and task descriptions created in your workspaces. HappyTF claims no proprietary interest in your content.
            </p>
            <p className="mt-2">
              <strong>HappyTF Platform IP:</strong> The design, software architecture, UI components, logos, and trademarks of HappyTF Work OS remain the sole property of HappyTF and our licensors.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Service Availability &amp; Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express, statutory, or implied. While we strive for 99.9% uptime and implement continuous backups, we do not warrant that the Platform will be completely uninterrupted or error-free.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall HappyTF, its founders, directors, or partners be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data loss, or business interruption arising out of or in connection with the use of the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Contact Us</h2>
            <p>For questions or formal legal notices regarding these Terms, reach out to:</p>
            <div className="contact-card">
              <p><strong>HappyTF Legal Counsel &amp; Operations</strong></p>
              <p className="text-muted">Legal: <a href="mailto:legal@happytf.work" className="text-primary-link">legal@happytf.work</a></p>
              <p className="text-muted">Support: <a href="mailto:support@happytf.work" className="text-primary-link">support@happytf.work</a></p>
            </div>
          </section>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="footer-inner text-muted">
          <span>&copy; {new Date().getFullYear()} HappyTF Work OS. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/" className="footer-link">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

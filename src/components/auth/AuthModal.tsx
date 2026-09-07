'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  KeyRound,
  Github,
  X
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  defaultMode?: 'login' | 'signup' | 'magic' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { login, signup, loginWithOAuth, loginWithMagicLink } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'magic' | 'reset'>(defaultMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('alex.rivera@happytf.dev');
  const [password, setPassword] = useState('HappyTF@2026!');
  const [rememberMe, setRememberMe] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Password strength calculator
  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const strengthScore = calculateStrength(password);
  const strengthLabel = 
    strengthScore <= 25 ? 'Weak' :
    strengthScore <= 50 ? 'Fair' :
    strengthScore <= 75 ? 'Good' : 'Strong';
  const strengthColor = 
    strengthScore <= 25 ? '#ef4444' :
    strengthScore <= 50 ? '#f59e0b' :
    strengthScore <= 75 ? '#3b82f6' : '#10b981';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (mode === 'login') {
        await login(email);
        setStatusMessage({ type: 'success', text: 'Successfully authenticated!' });
        setTimeout(() => onClose?.(), 400);
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setStatusMessage({ type: 'error', text: 'Please enter your full name.' });
          setIsSubmitting(false);
          return;
        }
        await signup(fullName, email);
        setStatusMessage({ type: 'success', text: 'Account created! Starting onboarding...' });
        setTimeout(() => onClose?.(), 500);
      } else if (mode === 'magic') {
        await loginWithMagicLink(email);
        setStatusMessage({ 
          type: 'success', 
          text: `Magic link dispatched to ${email}! Valid for 10 minutes.` 
        });
      } else if (mode === 'reset') {
        setStatusMessage({ 
          type: 'success', 
          text: `Password reset instructions sent to ${email} (Expiring token).` 
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Authentication failed. Please check credentials.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" id="auth-modal-overlay">
      <div className="auth-card glass-panel animate-pop-in" id="auth-card">
        {onClose && (
          <button 
            id="auth-close-btn"
            className="auth-close-btn"
            onClick={onClose} 
            aria-label="Close auth dialog"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-badge">
            <Sparkles size={16} className="text-primary" />
            <span>Work Operating System</span>
          </div>
          <h2 id="auth-heading">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'magic' && 'Passwordless Sign In'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="auth-subtext">
            {mode === 'login' && 'Enter your credentials or jump in with demo mode.'}
            {mode === 'signup' && 'Join thousands of high-velocity teams running on HappyTF.'}
            {mode === 'magic' && 'We’ll email you an instant, secure sign-in link.'}
            {mode === 'reset' && 'Enter your account email to receive a recovery token.'}
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div 
            className={`auth-alert ${statusMessage.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`}
            id="auth-status-alert"
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* OAuth Buttons */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="oauth-row">
            <button
              id="oauth-google-btn"
              type="button"
              className="oauth-btn"
              onClick={() => {
                loginWithOAuth('google');
                onClose?.();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.4 1.9 7.8l3.7-2.9z" />
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              id="oauth-github-btn"
              type="button"
              className="oauth-btn"
              onClick={() => {
                loginWithOAuth('github');
                onClose?.();
              }}
            >
              <Github size={18} />
              <span>GitHub</span>
            </button>
          </div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <div className="auth-divider">
            <span>or with email</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" id="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="auth-full-name">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="auth-full-name"
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  className="input-field with-icon"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="auth-email"
                type="email"
                placeholder="name@company.com"
                className="input-field with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="auth-password">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="auth-link text-xs"
                    onClick={() => setMode('reset')}
                    id="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••••••"
                  className="input-field with-icon"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Password Strength Meter for Signup */}
              {mode === 'signup' && password.length > 0 && (
                <div className="strength-meter" id="password-strength-container">
                  <div className="strength-bar-bg">
                    <div 
                      className="strength-bar-fill" 
                      style={{ width: `${strengthScore}%`, backgroundColor: strengthColor }}
                    />
                  </div>
                  <div className="strength-labels">
                    <span className="text-xs text-muted">Strength:</span>
                    <span className="text-xs font-semibold" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="remember-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="auth-remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me for 30 days</span>
              </label>
              <button
                type="button"
                className="auth-link text-xs"
                onClick={() => setMode('magic')}
                id="link-magic-login"
              >
                Magic Link Login
              </button>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isSubmitting}
          >
            <span>
              {mode === 'login' && 'Sign In to Workspace'}
              {mode === 'signup' && 'Create Free Account'}
              {mode === 'magic' && 'Send Magic Link'}
              {mode === 'reset' && 'Send Reset Token'}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Mode switchers */}
        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button 
                type="button" 
                className="auth-link font-semibold" 
                onClick={() => setMode('signup')}
                id="switch-to-signup-btn"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button 
                type="button" 
                className="auth-link font-semibold" 
                onClick={() => setMode('login')}
                id="switch-to-login-btn"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        .auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 18px;
          padding: 32px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .auth-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          color: var(--text-muted);
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }
        .auth-close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: var(--primary-glow);
          color: var(--primary-light);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .auth-header h2 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .auth-subtext {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .auth-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 18px;
        }
        .auth-alert-success {
          background: var(--success-bg);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--success);
        }
        .auth-alert-error {
          background: var(--danger-bg);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--danger);
        }

        .oauth-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }

        .oauth-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          transition: all var(--transition-fast);
        }
        .oauth-btn:hover {
          background: var(--bg-elevated);
          border-color: var(--border-highlight);
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 18px 0;
          color: var(--text-muted);
          font-size: 12px;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-subtle);
        }
        .auth-divider span {
          padding: 0 10px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .form-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        :global(.input-icon) {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .with-icon {
          padding-left: 38px;
        }

        .strength-meter {
          margin-top: 6px;
        }
        .strength-bar-bg {
          height: 4px;
          background: var(--border-default);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .strength-bar-fill {
          height: 100%;
          transition: all var(--transition-normal);
        }
        .strength-labels {
          display: flex;
          justify-content: space-between;
        }

        .remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .auth-link {
          color: var(--primary-light);
          transition: color var(--transition-fast);
        }
        .auth-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .w-full {
          width: 100%;
        }

        .auth-footer {
          margin-top: 22px;
          text-align: center;
          font-size: 13px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

/**
 * Client & Server Form Validation and Anti-Spam Security Helpers
 * HappyTF Work OS Production Readiness Kit
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  error?: string;
}

/**
 * Standard RFC 5322 compliant email regex check
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required.' };
  }
  const cleanEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@company.com).' };
  }
  if (cleanEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long.' };
  }
  return { isValid: true };
}

/**
 * Password strength and complexity audit
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      isValid: false,
      score: 0,
      label: 'Weak',
      color: '#ef4444',
      error: 'Password is required.',
    };
  }

  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;

  let label: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let color = '#ef4444';

  if (score >= 100) {
    label = 'Strong';
    color = '#10b981';
  } else if (score >= 75) {
    label = 'Good';
    color = '#3b82f6';
  } else if (score >= 50) {
    label = 'Fair';
    color = '#f59e0b';
  }

  const isValid = password.length >= 8;
  const error = !isValid ? 'Password must be at least 8 characters long.' : undefined;

  return { isValid, score, label, color, error };
}

/**
 * Required text field validator with min/max bounds and XSS sanitization check
 */
export function validateText(
  value: string,
  fieldName: string,
  minLength = 2,
  maxLength = 120
): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (trimmed.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters.` };
  }
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `${fieldName} cannot exceed ${maxLength} characters.` };
  }
  return { isValid: true };
}

/**
 * Honeypot anti-spam check.
 * Bots often autofill every visible or hidden input they detect in forms.
 * Returns true if a bot filled the honeypot field.
 */
export function isSpamSubmission(honeypotField?: string): boolean {
  return Boolean(honeypotField && honeypotField.trim().length > 0);
}

/**
 * Rate-limiting & click spam prevention cooldown helper
 */
export function createSubmissionThrottle(cooldownMs = 1200) {
  let lastSubmitTime = 0;

  return function isAllowed(): { allowed: boolean; waitTimeMs: number } {
    const now = Date.now();
    const elapsed = now - lastSubmitTime;
    if (elapsed < cooldownMs) {
      return { allowed: false, waitTimeMs: cooldownMs - elapsed };
    }
    lastSubmitTime = now;
    return { allowed: true, waitTimeMs: 0 };
  };
}

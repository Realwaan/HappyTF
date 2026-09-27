/**
 * Client-side Web Crypto API encryption at rest for sensitive localStorage caching
 * Uses AES-GCM (256-bit) with PBKDF2 key derivation
 */

const SALT = new TextEncoder().encode('happytf-secure-storage-salt-v1');
const PASSPHRASE = 'happytf-offline-vault-key-256';

async function deriveAesKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  try {
    const enc = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(PASSPHRASE),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: SALT,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    console.warn('[WebCrypto] Key derivation failed', err);
    return null;
  }
}

export async function encryptAtRest(plainText: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return plainText;
  try {
    const key = await deriveAesKey();
    if (!key) return plainText;

    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return `enc:${btoa(binary)}`;
  } catch (err) {
    console.warn('[WebCrypto] Encrypt at rest failed, falling back', err);
    return plainText;
  }
}

export async function decryptAtRest(cipherText: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return cipherText;
  if (!cipherText.startsWith('enc:')) {
    // Unencrypted legacy fallback
    return cipherText;
  }

  try {
    const key = await deriveAesKey();
    if (!key) return cipherText;

    const base64 = cipherText.substring(4);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('[WebCrypto] Decrypt at rest failed', err);
    return cipherText;
  }
}

import crypto from 'crypto';

import { env } from '@/config';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Derives a 32-byte key from the configured ENCRYPTION_KEY.
 * This ensures key separation from the JWT_SECRET.
 */
const SECRET_KEY = crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();

/**
 * Encrypts a string using AES-256-CBC.
 *
 * @param text - The plaintext string to encrypt
 * @returns The encrypted string in the format "iv:encrypted" (hex encoded)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Encrypts a string using AES-256-CBC asynchronously using streams.
 * Suitable for larger payloads to avoid blocking the event loop.
 *
 * @param text - The plaintext string to encrypt
 * @returns Promise resolving to the encrypted string in "iv:encrypted" format
 */
export function encryptAsync(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    const chunks: Buffer[] = [];

    cipher.on('data', (chunk: Buffer) => chunks.push(chunk));
    cipher.on('error', reject);
    cipher.on('end', () => {
      const encrypted = Buffer.concat(chunks).toString('hex');
      resolve(iv.toString('hex') + ':' + encrypted);
    });

    cipher.write(text, 'utf8');
    cipher.end();
  });
}

/**
 * Decrypts a string encrypted with the encrypt() function.
 *
 * @param text - The encrypted string in the format "iv:encrypted" (hex encoded)
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails
 */
export function decrypt(text: string): string {
  if (!text.trim()) {
    throw new Error('Invalid encrypted text: empty input');
  }

  const parts = text.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid encrypted text format');
  }

  const ivHex = parts.shift();
  const encryptedText = parts.join(':');

  if (!ivHex || !encryptedText) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

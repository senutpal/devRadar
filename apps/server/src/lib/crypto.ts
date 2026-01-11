import crypto from 'crypto';

import { env } from '@/config';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Derives a 32-byte key from the configured JWT_SECRET.
 * In production, a dedicated ENCRYPTION_KEY environment variable should be used.
 */
const SECRET_KEY = crypto.createHash('sha256').update(env.JWT_SECRET).digest();

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
 * Decrypts a string encrypted with the encrypt() function.
 *
 * @param text - The encrypted string in the format "iv:encrypted" (hex encoded)
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails
 */
export function decrypt(text: string): string {
  const parts = text.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid encrypted text format');
  }

  const ivHex = parts.shift();
  if (!ivHex) {
    throw new Error('Invalid encrypted text format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = parts.join(':');

  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

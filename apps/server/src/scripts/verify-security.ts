/* eslint-disable no-console, no-process-exit, @typescript-eslint/no-floating-promises */
import crypto from 'crypto';

import { encrypt, encryptAsync, decrypt } from '../lib/crypto';

async function verifyCrypto() {
  console.log('Verifying Crypto...');
  const text = 'test-secret-message';

  console.log('1. Testing sync encrypt/decrypt...');
  const encrypted = encrypt(text);
  const decrypted = decrypt(encrypted);
  if (decrypted !== text) throw new Error('Sync encryption failed');
  console.log('✅ Sync encryption passed');

  console.log('2. Testing async encrypt...');
  const encryptedAsync = await encryptAsync(text);
  const decryptedAsync = decrypt(encryptedAsync);
  if (decryptedAsync !== text) throw new Error('Async encryption failed');
  console.log('✅ Async encryption passed');
}

function verifyHashing() {
  console.log('Verifying Hashing...');
  const token = crypto.randomBytes(32).toString('hex');
  const hash1 = crypto.createHash('sha256').update(token).digest('hex');
  const hash2 = crypto.createHash('sha256').update(token).digest('hex');

  if (hash1 !== hash2) throw new Error('Hashing inconsistency');
  console.log(`✅ Hashing passed: ${hash1}`);
}

async function main() {
  try {
    await verifyCrypto();
    verifyHashing();
    console.log('🎉 All security verifications passed!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

main();

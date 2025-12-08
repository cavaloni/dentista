/**
 * Field-Level Encryption for Sensitive Patient Data
 * 
 * Uses AES-256-GCM for encrypting sensitive fields like patient names,
 * notes, and contact information. Each company gets its own encryption
 * key derived from the master key + company ID.
 * 
 * This provides defense-in-depth: even if the database is compromised,
 * sensitive data remains encrypted and unreadable without the keys.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Prefix to identify encrypted values
const ENCRYPTED_PREFIX = 'enc:v1:';

/**
 * Get the master encryption key from environment.
 * This should be a 32+ character random string stored securely.
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY must be set and at least 32 characters. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  return key;
}

/**
 * Derive a company-specific key from the master key.
 * This ensures each company's data is encrypted with a unique key.
 */
function deriveCompanyKey(companyId: string): Buffer {
  const masterKey = getMasterKey();
  // Use a hash of company ID as salt for deterministic key derivation
  const salt = createHash('sha256').update(`whatscal:${companyId}`).digest();
  return scryptSync(masterKey, salt, 32);
}

/**
 * Encrypt a string value using AES-256-GCM
 */
export function encrypt(plaintext: string, companyId: string): string {
  if (!plaintext) return plaintext;
  
  // Don't double-encrypt
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) {
    return plaintext;
  }

  const key = deriveCompanyKey(companyId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: prefix + iv (hex) + : + authTag (hex) + : + ciphertext (base64)
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string value encrypted with encrypt()
 */
export function decrypt(ciphertext: string, companyId: string): string {
  if (!ciphertext) return ciphertext;
  
  // Return as-is if not encrypted
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext;
  }

  try {
    const key = deriveCompanyKey(companyId);
    const withoutPrefix = ciphertext.slice(ENCRYPTED_PREFIX.length);
    const [ivHex, authTagHex, encrypted] = withoutPrefix.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      console.warn('[decrypt] Malformed encrypted value, returning as-is');
      return ciphertext;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[decrypt] Decryption failed:', error);
    // Return original value if decryption fails (e.g., wrong key)
    return ciphertext;
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTED_PREFIX) ?? false;
}

/**
 * Encrypt sensitive fields in a patient record
 */
export function encryptPatientData<T extends Record<string, unknown>>(
  data: T,
  companyId: string,
  fieldsToEncrypt: (keyof T)[] = ['full_name', 'notes', 'address'] as (keyof T)[]
): T {
  const encrypted = { ...data };
  
  for (const field of fieldsToEncrypt) {
    const value = data[field];
    if (typeof value === 'string' && value) {
      (encrypted as Record<string, unknown>)[field as string] = encrypt(value, companyId);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt sensitive fields in a patient record
 */
export function decryptPatientData<T extends Record<string, unknown>>(
  data: T,
  companyId: string,
  fieldsToDecrypt: (keyof T)[] = ['full_name', 'notes', 'address'] as (keyof T)[]
): T {
  const decrypted = { ...data };
  
  for (const field of fieldsToDecrypt) {
    const value = data[field];
    if (typeof value === 'string' && value) {
      (decrypted as Record<string, unknown>)[field as string] = decrypt(value, companyId);
    }
  }
  
  return decrypted;
}

/**
 * Batch decrypt multiple records
 */
export function decryptPatientList<T extends Record<string, unknown>>(
  records: T[],
  companyId: string,
  fieldsToDecrypt?: (keyof T)[]
): T[] {
  return records.map(record => decryptPatientData(record, companyId, fieldsToDecrypt));
}

/**
 * Generate a new master encryption key (for initial setup)
 */
export function generateMasterKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Mask sensitive data for display (e.g., in logs)
 */
export function maskSensitiveData(value: string, visibleChars: number = 3): string {
  if (!value || value.length <= visibleChars) {
    return '*'.repeat(value?.length || 0);
  }
  return value.slice(0, visibleChars) + '*'.repeat(value.length - visibleChars);
}

/**
 * Hash a value for searching (allows searching on encrypted fields)
 * Note: This is a one-way operation for exact match searches only
 */
export function hashForSearch(value: string, companyId: string): string {
  const normalizedValue = value.toLowerCase().trim();
  const salt = createHash('sha256').update(`search:${companyId}`).digest();
  return createHash('sha256')
    .update(salt)
    .update(normalizedValue)
    .digest('hex');
}

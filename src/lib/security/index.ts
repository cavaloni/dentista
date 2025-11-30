/**
 * Security Module
 * 
 * Provides field-level encryption and audit logging for HIPAA/GDPR compliance.
 * 
 * Usage:
 * 1. Run the migration: supabase/migrations/202511300001_add_security_features.sql
 * 2. Set ENCRYPTION_MASTER_KEY in your environment (generate with: openssl rand -base64 32)
 * 3. Regenerate Supabase types to remove @ts-expect-error comments
 */

export {
  encrypt,
  decrypt,
  isEncrypted,
  encryptPatientData,
  decryptPatientData,
  decryptPatientList,
  generateMasterKey,
  maskSensitiveData,
  hashForSearch,
} from './encryption';

export {
  logAuditEvent,
  logPatientAccess,
  logBroadcastEvent,
  logAuthEvent,
  getAuditLogs,
  getAuditStats,
  checkSuspiciousActivity,
  type AuditAction,
  type AuditLogEntry,
} from './audit';

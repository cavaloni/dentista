/**
 * Audit Logging Service
 * 
 * Tracks all access to sensitive patient data for compliance purposes.
 * Logs are immutable and include: who, what, when, and from where.
 * 
 * NOTE: After running the migration and regenerating Supabase types,
 * you can remove the @ts-expect-error comments below.
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service';

// Type for the audit_logs table (until types are regenerated)
interface AuditLogRow {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type AuditAction =
  | 'patient.view'
  | 'patient.create'
  | 'patient.update'
  | 'patient.delete'
  | 'patient.export'
  | 'patient.import'
  | 'broadcast.create'
  | 'broadcast.start'
  | 'broadcast.cancel'
  | 'slot.claim'
  | 'slot.confirm'
  | 'message.send'
  | 'message.receive'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed'
  | 'settings.update'
  | 'data.export'
  | 'data.backup';

export interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  companyId: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Helper to get untyped client for audit_logs table (until types are regenerated)
function getAuditTable() {
  const service = createSupabaseServiceClient();
  // Use 'as any' to bypass type checking until types are regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (service as any).from('audit_logs');
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await getAuditTable().insert({
      action: entry.action,
      user_id: entry.userId,
      company_id: entry.companyId,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      details: entry.details ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch (error) {
    // Never throw on audit failures - log to console for monitoring
    console.error('[Audit] Failed to log event:', error, entry);
  }
}

/**
 * Log a patient data access event
 */
export async function logPatientAccess(
  action: 'view' | 'create' | 'update' | 'delete' | 'export' | 'import',
  userId: string,
  companyId: string,
  patientId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    action: `patient.${action}` as AuditAction,
    userId,
    companyId,
    resourceType: 'patient',
    resourceId: patientId,
    details,
  });
}

/**
 * Log a broadcast event
 */
export async function logBroadcastEvent(
  action: 'create' | 'start' | 'cancel',
  userId: string,
  companyId: string,
  broadcastId: string,
  details?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    action: `broadcast.${action}` as AuditAction,
    userId,
    companyId,
    resourceType: 'broadcast',
    resourceId: broadcastId,
    details,
  });
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(
  action: 'login' | 'logout' | 'failed',
  userId: string,
  companyId: string,
  details?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    action: `auth.${action}` as AuditAction,
    userId,
    companyId,
    resourceType: 'auth',
    details,
  });
}

/**
 * Get audit logs for a company with pagination
 */
export async function getAuditLogs(
  companyId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  logs: AuditLogRow[];
  total: number;
}> {
  const { limit = 50, offset = 0, action, userId, startDate, endDate } = options;

  let query = getAuditTable()
    .select('id, action, user_id, resource_type, resource_id, details, created_at', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) {
    query = query.eq('action', action);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[Audit] Failed to fetch logs:', error);
    return { logs: [], total: 0 };
  }

  return {
    logs: (data ?? []) as AuditLogRow[],
    total: count ?? 0,
  };
}

/**
 * Get audit statistics for the security dashboard
 */
export async function getAuditStats(
  companyId: string,
  days: number = 30
): Promise<{
  totalEvents: number;
  patientAccesses: number;
  logins: number;
  dataExports: number;
  lastLogin: string | null;
  lastPatientAccess: string | null;
  failedLogins: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get counts for different action types
  const [
    totalResult,
    patientResult,
    loginResult,
    exportResult,
    failedResult,
    lastLoginResult,
    lastAccessResult,
  ] = await Promise.all([
    getAuditTable()
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString()),
    
    getAuditTable()
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('action', 'patient.%')
      .gte('created_at', startDate.toISOString()),
    
    getAuditTable()
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('action', 'auth.login')
      .gte('created_at', startDate.toISOString()),
    
    getAuditTable()
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('action', ['data.export', 'patient.export'])
      .gte('created_at', startDate.toISOString()),
    
    getAuditTable()
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('action', 'auth.failed')
      .gte('created_at', startDate.toISOString()),
    
    getAuditTable()
      .select('created_at')
      .eq('company_id', companyId)
      .eq('action', 'auth.login')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    
    getAuditTable()
      .select('created_at')
      .eq('company_id', companyId)
      .like('action', 'patient.%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    totalEvents: totalResult.count ?? 0,
    patientAccesses: patientResult.count ?? 0,
    logins: loginResult.count ?? 0,
    dataExports: exportResult.count ?? 0,
    failedLogins: failedResult.count ?? 0,
    lastLogin: (lastLoginResult.data as { created_at: string } | null)?.created_at ?? null,
    lastPatientAccess: (lastAccessResult.data as { created_at: string } | null)?.created_at ?? null,
  };
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  companyId: string
): Promise<{
  hasWarnings: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  // Check for high volume of failed logins
  const { count: failedLogins } = await getAuditTable()
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('action', 'auth.failed')
    .gte('created_at', oneHourAgo.toISOString());
  
  if ((failedLogins ?? 0) > 5) {
    warnings.push(`${failedLogins} failed login attempts in the last hour`);
  }
  
  // Check for unusual export activity
  const { count: exports } = await getAuditTable()
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('action', ['data.export', 'patient.export'])
    .gte('created_at', oneHourAgo.toISOString());
  
  if ((exports ?? 0) > 10) {
    warnings.push(`${exports} data exports in the last hour (unusually high)`);
  }
  
  return {
    hasWarnings: warnings.length > 0,
    warnings,
  };
}

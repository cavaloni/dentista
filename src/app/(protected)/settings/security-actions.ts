'use server';

import { redirect } from "next/navigation";

import { ensureCompanyForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getAuditStats, checkSuspiciousActivity, getAuditLogs, type AuditAction } from "@/lib/security";

async function getContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyId = await ensureCompanyForUser(user.id);
  const service = createSupabaseServiceClient();

  return { supabase, service, companyId, userId: user.id } as const;
}

export interface SecurityStats {
  totalEvents: number;
  patientAccesses: number;
  logins: number;
  dataExports: number;
  lastLogin: string | null;
  lastPatientAccess: string | null;
  failedLogins: number;
  hasWarnings: boolean;
  warnings: string[];
  encryptionEnabled: boolean;
  sessionTimeout: number;
}

export async function getSecurityStatsAction(): Promise<SecurityStats> {
  const { companyId } = await getContext();
  
  const [auditStats, suspiciousActivity] = await Promise.all([
    getAuditStats(companyId, 30),
    checkSuspiciousActivity(companyId),
  ]);

  // Check if encryption is configured
  const encryptionEnabled = !!process.env.ENCRYPTION_MASTER_KEY && 
    process.env.ENCRYPTION_MASTER_KEY.length >= 32;

  return {
    ...auditStats,
    ...suspiciousActivity,
    encryptionEnabled,
    sessionTimeout: 30, // Default session timeout in minutes
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  user_id: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function getRecentAuditLogsAction(
  options: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
  } = {}
): Promise<{ logs: AuditLogItem[]; total: number }> {
  const { companyId } = await getContext();
  
  const result = await getAuditLogs(companyId, {
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    action: options.action,
  });

  return {
    logs: result.logs as AuditLogItem[],
    total: result.total,
  };
}

export async function exportSecurityReportAction(): Promise<{
  success: boolean;
  data?: {
    generatedAt: string;
    companyId: string;
    stats: SecurityStats;
    recentLogs: AuditLogItem[];
  };
  error?: string;
}> {
  try {
    const { companyId } = await getContext();
    
    const [stats, logsResult] = await Promise.all([
      getSecurityStatsAction(),
      getRecentAuditLogsAction({ limit: 100 }),
    ]);

    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        companyId,
        stats,
        recentLogs: logsResult.logs,
      },
    };
  } catch (error) {
    console.error('[exportSecurityReportAction] Error:', error);
    return {
      success: false,
      error: 'Failed to generate security report',
    };
  }
}

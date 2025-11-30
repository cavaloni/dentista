'use client';

import { useState, useEffect } from 'react';
import { Shield, Eye, LogIn, Download, AlertTriangle, CheckCircle, Lock, Clock } from 'lucide-react';

import type { SecurityStats, AuditLogItem } from '@/app/(protected)/settings/security-actions';
import { getSecurityStatsAction, getRecentAuditLogsAction, exportSecurityReportAction } from '@/app/(protected)/settings/security-actions';

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'patient.view': 'Viewed patient',
    'patient.create': 'Created patient',
    'patient.update': 'Updated patient',
    'patient.delete': 'Deleted patient',
    'patient.export': 'Exported patients',
    'patient.import': 'Imported patients',
    'broadcast.create': 'Created broadcast',
    'broadcast.start': 'Started broadcast',
    'broadcast.cancel': 'Cancelled broadcast',
    'auth.login': 'Logged in',
    'auth.logout': 'Logged out',
    'auth.failed': 'Failed login',
    'data.export': 'Exported data',
  };
  return labels[action] ?? action;
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string | number; 
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          {subtext && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtext}</p>
          )}
        </div>
        <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900/30">
          <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
        </div>
      </div>
    </div>
  );
}

function SecurityStatusBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
      enabled 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }`}>
      {enabled ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function SecurityDashboard() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, logsData] = await Promise.all([
          getSecurityStatsAction(),
          getRecentAuditLogsAction({ limit: 10 }),
        ]);
        setStats(statsData);
        setLogs(logsData.logs);
      } catch (error) {
        console.error('Failed to load security data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const result = await exportSecurityReportAction();
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-500">
        Failed to load security data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status */}
      <div className="flex flex-wrap gap-3">
        <SecurityStatusBadge 
          enabled={stats.encryptionEnabled} 
          label={stats.encryptionEnabled ? 'Encryption Enabled' : 'Encryption Not Configured'} 
        />
        <SecurityStatusBadge 
          enabled={true} 
          label="Audit Logging Active" 
        />
        <SecurityStatusBadge 
          enabled={stats.failedLogins === 0} 
          label={stats.failedLogins === 0 ? 'No Failed Logins' : `${stats.failedLogins} Failed Logins`} 
        />
      </div>

      {/* Warnings */}
      {stats.hasWarnings && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Security Alerts</h4>
              <ul className="mt-1 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {stats.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={Shield} 
          label="Total Events" 
          value={stats.totalEvents} 
          subtext="Last 30 days" 
        />
        <StatCard 
          icon={Eye} 
          label="Patient Accesses" 
          value={stats.patientAccesses} 
          subtext={stats.lastPatientAccess ? `Last: ${formatRelativeTime(stats.lastPatientAccess)}` : undefined}
        />
        <StatCard 
          icon={LogIn} 
          label="Logins" 
          value={stats.logins} 
          subtext={stats.lastLogin ? `Last: ${formatRelativeTime(stats.lastLogin)}` : undefined}
        />
        <StatCard 
          icon={Download} 
          label="Data Exports" 
          value={stats.dataExports} 
          subtext="Last 30 days" 
        />
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recent Activity
          </h3>
          <button
            onClick={handleExportReport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <Shield className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              No activity recorded yet
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Audit events will appear here as you use the app
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${
                        log.action.startsWith('auth.failed') 
                          ? 'text-red-600 dark:text-red-400'
                          : log.action.includes('delete')
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {log.action.includes('delete') && <AlertTriangle className="h-3.5 w-3.5" />}
                        {log.action.startsWith('auth.') && <Lock className="h-3.5 w-3.5" />}
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {log.resource_type ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compliance Info */}
      <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Shield className="h-5 w-5 text-cyan-600" />
          Security & Compliance
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Data Protection</h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <li>• All data encrypted in transit (TLS 1.3)</li>
              <li>• Database encryption at rest</li>
              <li>• Row-level security policies</li>
              {stats.encryptionEnabled && <li>• Field-level encryption for sensitive data</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Audit & Monitoring</h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <li>• Complete audit trail of all actions</li>
              <li>• Login attempt monitoring</li>
              <li>• Suspicious activity detection</li>
              <li>• Exportable compliance reports</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          This system is designed to support HIPAA, GDPR, and Dutch NEN 7510/7513 alignment compliance requirements. 
          Your patient data never leaves your control and remains under your direct supervision at all times.
        </p>
      </div>
    </div>
  );
}

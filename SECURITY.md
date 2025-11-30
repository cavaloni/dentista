# Security & Compliance Guide

This document describes the security features implemented in WhatsCal to protect patient data and support HIPAA/GDPR compliance.

## Overview

WhatsCal implements a **defense-in-depth** security strategy with multiple layers of protection:

1. **Encryption** - Data encrypted in transit and at rest
2. **Audit Logging** - Complete trail of all data access
3. **Session Management** - Automatic timeout and activity tracking
4. **Access Control** - Row-level security and role-based permissions
5. **Secure Authentication** - Magic link login with Supabase Auth

## Setup

### 1. Database Migration

Run the security migration to create audit tables:

```bash
# Using Supabase CLI
supabase db push --file supabase/migrations/202511300001_add_security_features.sql

# Or apply directly in Supabase SQL Editor
```

This creates:
- `audit_logs` table - Immutable audit trail
- `security_settings` table - Per-practice security config
- `login_attempts` table - Brute-force protection
- RLS policies for all new tables

### 2. Field-Level Encryption (Optional)

Generate an encryption key:

```bash
openssl rand -base64 32
```

Add to your `.env.local`:

```env
ENCRYPTION_MASTER_KEY=your-32+-character-key-here
```

When enabled, sensitive fields (`full_name`, `notes`, `address`) are encrypted before storage using AES-256-GCM.

### 3. Regenerate Supabase Types

After running the migration, regenerate types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
```

## Security Features

### Encryption

**Transit Encryption:**
- All connections use TLS 1.3
- Supabase enforces HTTPS

**At-Rest Encryption:**
- Supabase provides database encryption by default
- Optional field-level encryption for sensitive patient data

**Field-Level Encryption (when enabled):**
```typescript
import { encrypt, decrypt } from '@/lib/security';

// Encrypt before storing
const encrypted = encrypt(patientName, companyId);

// Decrypt when reading
const decrypted = decrypt(encrypted, companyId);
```

Each company gets a unique derived key, so even database administrators cannot read data without the master key.

### Audit Logging

All sensitive operations are logged automatically:

| Action | Logged Data |
|--------|-------------|
| `patient.create` | New patient created |
| `patient.update` | Patient record modified |
| `patient.delete` | Patient removed |
| `patient.import` | Bulk import count |
| `patient.export` | Data export requested |
| `broadcast.create` | New broadcast created |
| `broadcast.start` | Broadcast initiated |
| `auth.login` | User signed in |
| `auth.logout` | User signed out |
| `auth.failed` | Failed login attempt |

**Viewing Audit Logs:**
Navigate to **Settings > Security & Compliance** to view:
- Recent activity
- Security statistics
- Exportable compliance reports

### Session Management

**Automatic Timeout:**
- Sessions expire after 30 minutes of inactivity
- 5-minute warning before logout
- Activity resets the timer

**Configuration:**
```env
SESSION_TIMEOUT_MINUTES=30  # Optional, default is 30
```

### Access Control

**Row-Level Security (RLS):**
- All tables have RLS policies
- Users can only access their own company's data
- Service role bypasses RLS for internal operations

**Audit Log Protection:**
- Users can view their company's logs
- Only service role can insert logs
- No user can modify or delete logs

## Compliance Checklist

### HIPAA Requirements (US)
| Requirement | Implementation |
|-------------|----------------|
| Access Controls | RLS + Authentication |
| Audit Controls | Complete audit logging |
| Integrity Controls | Immutable audit logs |
| Transmission Security | TLS 1.3 encryption |
| Encryption | At-rest + optional field-level |

### GDPR Requirements (EU)
| Requirement | Implementation |
|-------------|----------------|
| Right to Access | Data export feature |
| Right to Erasure | Delete practice data |
| Data Minimization | Only essential data stored |
| Purpose Limitation | Clear data usage |
| Security | Encryption + access controls |

### Dutch Healthcare Guidelines (NEN 7510 / 7512 / 7513)
| Requirement | Implementation |
|-------------|----------------|
| Information Security Management (7510) | Encryption, RLS, session controls |
| Secure Data Exchange (7512) | TLS 1.3 + provider authentication |
| Logging & Transparency (7513) | Audit trail with action, actor, timestamp |
| Patient Visibility | Provide exports/audit summaries on request |
| Local Applicability | For practices handling medical records, extend controls (e.g., BSN validation, consent tracking) as needed |

## Security Best Practices

### For Deployment

1. **Use Strong Secrets**
   ```bash
   # Generate secure keys
   openssl rand -base64 32  # For ENCRYPTION_MASTER_KEY
   openssl rand -hex 32     # For other secrets
   ```

2. **Enable Encryption**
   - Always set `ENCRYPTION_MASTER_KEY` in production
   - Store the key securely (e.g., Vercel encrypted env vars)

3. **Configure Backups**
   - Supabase provides automatic daily backups
   - Consider additional backup strategy for compliance

4. **Monitor Security Events**
   - Review audit logs regularly
   - Set up alerts for failed login attempts

### For Users

1. **Strong Passwords**
   - Use unique email for login
   - Keep magic link emails private

2. **Session Security**
   - Log out when done
   - Don't share login links

3. **Data Handling**
   - Export data only when needed
   - Delete patients properly (don't just deactivate)

## Troubleshooting

### "Encryption key not configured"

Add `ENCRYPTION_MASTER_KEY` to your environment:
```env
ENCRYPTION_MASTER_KEY=your-32-character-minimum-key
```

### Audit logs not appearing

1. Ensure migration has been run
2. Check that actions are being logged (see console for errors)
3. Verify RLS policies are correct

### Session timeout too aggressive

Adjust in the protected layout:
```tsx
<SessionTimeout timeoutMinutes={60} warningMinutes={10} />
```

## Support

For security concerns or vulnerability reports, contact the development team directly. Do not open public issues for security vulnerabilities.

---

*Last updated: November 2025*

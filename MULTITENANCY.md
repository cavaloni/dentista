# Multitenancy Migration Guide

This document outlines the multitenancy migration that transforms the application from single-tenant to multi-tenant architecture.

## Overview

The application now supports multiple companies (dental practices) within a single Supabase project, with proper data isolation and security.

## Architecture Changes

### Database Schema

1. **New `companies` table**: Replaces the `practices` concept
   - `id` (uuid, primary key)
   - `name` (text)
   - `slug` (text, unique) - used for company identification
   - All other practice-specific fields (timezone, templates, etc.)

2. **Updated all tenant-owned tables** with `company_id` columns:
   - `profiles.company_id`
   - `waitlist_members.company_id`
   - `slots.company_id`
   - `claims.company_id`
   - `messages.company_id`
   - `webhook_events.company_id` (nullable)

3. **Backward compatibility**: `practice_id` columns are kept as nullable for legacy support

### Security Model

**Row Level Security (RLS)** is enforced on all tables:
- Users can only access data from their own company
- `current_company_id()` function provides tenant context
- Service role operations can target specific companies via `COMPANY_SLUG` env var

### Application Changes

1. **TypeScript Types**: Updated to include `companies` table and `company_id` fields
2. **Database Functions**:
   - `current_company_id()` - Get company from authenticated user
   - `get_company_by_slug(_slug)` - Get company by slug for service operations
   - Updated `attempt_claim()` and `release_slot()` to use company_id
3. **API Layer**: All operations now pass company context
4. **Environment Variable**: `COMPANY_SLUG` for service-role operations

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
# Required for service role operations (webhooks, jobs, etc.)
COMPANY_SLUG=your-company-slug

# Existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Company Slug

The company slug is automatically generated during migration:
- Format: `{company-name}-{practice-id-prefix}`
- Example: `dental-practice-ff1da296`

Find your company slug:
```sql
SELECT slug FROM companies;
```

## Usage

### For User-Facing Operations

The application automatically handles company context based on the authenticated user. No changes needed.

### For Service Operations

Use the new company context utilities:

```typescript
import { getCompanyId, hasCompanyContext } from '@/lib/company';

// Check if company context is available
if (hasCompanyContext()) {
  const companyId = await getCompanyId();
  // Use companyId for database operations
}
```

## Migration Commands

### Database Migrations Applied

1. `202501160_add_multitenancy_fixed.sql` - Core schema changes
2. `202501160_update_rls_policies.sql` - Security policies
3. `202501160_update_functions_fixed.sql` - Database functions

### Testing

Run the multitenancy test:
```bash
npx tsx scripts/test-multitenancy-simple.ts
```

## Deployment Considerations

1. **Environment Setup**: Set `COMPANY_SLUG` for each deployment environment
2. **Database**: All migrations are backwards compatible
3. **Monitoring**: Monitor for any cross-tenant data access issues
4. **Backups**: Ensure backups are created before deployment

## Security Notes

- RLS policies enforce strict tenant isolation
- Service role operations require explicit company context
- No client can spoof company_id due to RLS
- All foreign key constraints maintain data integrity

## Backward Compatibility

- Legacy `practice_id` columns are preserved as nullable
- `ensurePracticeForUser()` function still works (redirects to new logic)
- Existing API endpoints continue to function
- No breaking changes to external interfaces

## Troubleshooting

### Common Issues

1. **"Company not found" errors**
   - Check `COMPANY_SLUG` environment variable
   - Verify company exists in database

2. **RLS policy violations**
   - Ensure user has valid company association
   - Check `current_company_id()` function

3. **Migration failures**
   - Run database migrations in order
   - Check for existing data conflicts

### Debug Commands

```sql
-- Check companies
SELECT * FROM companies;

-- Verify user-company association
SELECT u.email, p.company_id, c.name
FROM auth.users u
JOIN profiles p ON u.id = p.user_id
JOIN companies c ON p.company_id = c.id;

-- Test RLS policies
SELECT * FROM profiles; -- Should return only user's company data
```

## Future Enhancements

1. **Company Management UI**: Admin interface for managing multiple companies
2. **Company Switching**: Allow users to access multiple companies
3. **Per-Company Analytics**: Isolated reporting and metrics
4. **Company Themes**: Customizable branding per company
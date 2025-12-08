#!/usr/bin/env tsx

/**
 * Script to onboard a new dental practice with branding
 * Usage: npx tsx scripts/onboard-practice.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import 'node-fetch';

// Load environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.substring(0, eqIndex);
    const value = trimmed.substring(eqIndex + 1);
    envVars[key] = value;
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase credentials in .env.local');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'MISSING');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? 'Found' : 'MISSING');
    process.exit(1);
}

console.log('Supabase URL:', supabaseUrl.substring(0, 30) + '...');

const supabase = createClient(supabaseUrl, serviceKey);

async function onboardPractice() {
    const rl = readline.createInterface({ input, output });

    try {
        console.log('🦷 Dental Practice Onboarding 🦷\n');

        const name = await rl.question('Practice Name: ');
        if (!name) throw new Error('Name is required');

        // Generate default slug
        const defaultSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slugInput = await rl.question(`Slug [${defaultSlug}]: `);
        const slug = slugInput || defaultSlug;

        console.log('\n🎨 Branding Configuration');
        const primaryColor = await rl.question('Primary Color (Hex) [#2563eb]: ') || '#2563eb';
        const secondaryColor = await rl.question('Secondary Color (Hex) [#475569]: ') || '#475569';
        const logoUrl = await rl.question('Logo URL (optional): ');
        const websiteUrl = await rl.question('Website URL (optional): ');

        console.log('\n🌍 Country Configuration');
        console.log('Select country (for phone number formatting):');
        console.log('1. Netherlands (+31)');
        console.log('2. Belgium (+32)');
        console.log('3. Germany (+49)');
        console.log('4. United States (+1)');
        console.log('5. United Kingdom (+44)');
        console.log('6. Other (enter country code manually)');
        const countryChoice = await rl.question('Choice [1]: ') || '1';

        let countryCode: string;
        switch (countryChoice) {
            case '1':
                countryCode = '+31';
                break;
            case '2':
                countryCode = '+32';
                break;
            case '3':
                countryCode = '+49';
                break;
            case '4':
                countryCode = '+1';
                break;
            case '5':
                countryCode = '+44';
                break;
            case '6':
                const customCode = await rl.question('Enter country code (e.g., +33 for France): ');
                countryCode = customCode.startsWith('+') ? customCode : `+${customCode}`;
                break;
            default:
                countryCode = '+31'; // Default to Netherlands
        }


        console.log('\n🔒 Access Control');
        const allowedEmailsInput = await rl.question('Allowed Emails (comma separated): ');
        const allowedEmails = allowedEmailsInput
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0);

        const branding = {
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            logo_url: logoUrl || undefined,
            website_url: websiteUrl || undefined,
            company_name: name,
        };

        console.log('\nCreating company...');

        const { data, error } = await supabase
            .from('companies')
            .insert({
                name,
                slug,
                branding,
                allowed_emails: allowedEmails,
                country_code: countryCode,
                // Default values
                timezone: 'Europe/Amsterdam',
                claim_window_minutes: 10,
                recipients_per_wave: 5,
                default_duration_minutes: 30,
                resend_cooldown_minutes: 3,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create company: ${error.message}`);
        }

        console.log('\n✅ Practice successfully onboarded!');
        console.log('-----------------------------------');
        console.log(`Name: ${data.name}`);
        console.log(`Slug: ${data.slug}`);
        console.log(`ID:   ${data.id}`);
        console.log('-----------------------------------');
        console.log('\nTo use this practice locally, update your .env.local:');
        console.log(`COMPANY_SLUG=${data.slug}`);

    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    } finally {
        rl.close();
    }
}

onboardPractice();

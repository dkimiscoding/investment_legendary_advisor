#!/usr/bin/env node

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  console.error('Set the env vars and rerun this script to verify Supabase snapshot connectivity.');
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = `${baseUrl}/rest/v1/screening_snapshots?select=snapshot_key&limit=1`;

try {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  const bodyText = await response.text();

  if (!response.ok) {
    console.error(`Supabase verification failed (${response.status})`);
    console.error(bodyText);
    process.exit(2);
  }

  console.log('Supabase snapshot connectivity verified.');
  console.log(bodyText || '[]');
} catch (error) {
  console.error('Supabase verification request failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(3);
}

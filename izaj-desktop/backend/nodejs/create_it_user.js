import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env from multiple potential locations
const paths = [
  join(__dirname, '..', '.env'),       // izaj-desktop/backend/.env
  join(__dirname, '..', '..', '.env'), // izaj-desktop/.env
  join(__dirname, '.env')              // izaj-desktop/backend/nodejs/.env
];

let loaded = false;
for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log(`📄 Loading .env from: ${p}`);
    dotenv.config({ path: p });
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn('⚠️ Could not find a .env file in common locations. Relying on system environment variables.');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Please check your .env file.');
  process.exit(1);
}

// Use Service Key to bypass RLS and manage users
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const IT_EMAIL = process.env.IT_MAINTENANCE_EMAIL;
const IT_PASSWORD = process.env.IT_MAINTENANCE_PASSWORD || 'izaj-maintenance';
const IT_NAME = 'IT Maintenance System';

if (!IT_EMAIL) {
  console.error('❌ IT_MAINTENANCE_EMAIL is not set in environment variables.');
  console.error('   Please add IT_MAINTENANCE_EMAIL to your .env file.');
  process.exit(1);
}

async function createITUser() {
  console.log(`🛠️ Creating IT Maintenance User (Auth Only): ${IT_EMAIL}`);

  try {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: IT_EMAIL,
      password: IT_PASSWORD,
      email_confirm: true,
      user_metadata: { name: IT_NAME }
    });

    let userId;

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️ User already exists in Auth. (This is good)');
      } else {
        console.error('❌ Error creating auth user:', authError.message);
        return;
      }
    } else {
        userId = authData.user.id;
        console.log(`✅ Auth user created with ID: ${userId}`);
    }

    console.log('-------------------------------------------------------');
    console.log(`✅ SUCCESS! User exists in Authentication.`);
    console.log(`ℹ️  NOTE: This user is purposefully NOT added to the 'adminUser' table.`);
    console.log(`    This ensures they remain hidden from normal admin lists.`);
    console.log('-------------------------------------------------------');
    console.log(`📧 Email:    ${IT_EMAIL}`);
    console.log(`🔑 Password: ${IT_PASSWORD}`);
    console.log('-------------------------------------------------------');
    console.log('🚀 You can now log in with these credentials.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createITUser();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file (two levels up from backend/nodejs)
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_PRODUCT_URL;
const supabaseKey = process.env.SUPABASE_PRODUCT_KEY;

// Validate that environment variables are loaded
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase Product environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
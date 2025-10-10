import { createClient } from '@supabase/supabase-js';

// Client-side Supabase configuration for main database
// Use ANON key for auth and realtime (frontend only)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rhckwqhpnzjqfsjohvzk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY2t3cWhwbnpqcWZzam9odnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzU2OTMsImV4cCI6MjA2Mzc1MTY5M30.vGfYfv3x_KUk5qKRfSlxczjvxK9g_GJgHVwdjNcCfS8';

// Client for auth and realtime only (DO NOT use for database queries)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Product database for realtime notifications
const supabaseProductUrl = import.meta.env.VITE_SUPABASE_PRODUCT_URL || 'https://phhbjvlrwrtiokfbjorb.supabase.co';
const supabaseProductKey = import.meta.env.VITE_SUPABASE_PRODUCT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaGJqdmxyd3J0aW9rZmJqb3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MTg4MjIsImV4cCI6MjA1ODQ5NDgyMn0.6xja3RGLYxT5ZjepH-wnucvA3GBHNolD_jtFXiWzf4Y';

export const supabaseProduct = createClient(supabaseProductUrl, supabaseProductKey);


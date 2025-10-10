import { createClient } from '@supabase/supabase-js';

// Client-side Supabase configuration for main database
// Use ANON key (not service role key) for client-side
const supabaseUrl = 'https://rhckwqhpnzjqfsjohvzk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY2t3cWhwbnpqcWZzam9odnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzU2OTMsImV4cCI6MjA2Mzc1MTY5M30.vGfYfv3x_KUk5qKRfSlxczjvxK9g_GJgHVwdjNcCfS8';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY2t3cWhwbnpqcWZzam9odnprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE3NTY5MywiZXhwIjoyMDYzNzUxNjkzfQ.G5z39k1UXNrmCNh1hxHLCC4YJuDfpVMyE__9lShW0e4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role for desktop app (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client-side Supabase configuration for products database
const supabaseProductUrl = 'https://phhbjvlrwrtiokfbjorb.supabase.co';
const supabaseProductKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaGJqdmxyd3J0aW9rZmJqb3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MTg4MjIsImV4cCI6MjA1ODQ5NDgyMn0.6xja3RGLYxT5ZjepH-wnucvA3GBHNolD_jtFXiWzf4Y';

export const supabaseProduct = createClient(supabaseProductUrl, supabaseProductKey);

